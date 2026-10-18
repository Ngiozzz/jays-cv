// One-off: sorts jobs saved before counties existed (location was free text) into counties, town
// and country. Simple ones are done by rule ("Kericho and Bomet counties", "Nairobi (Mombasa Road)");
// only the rest ("Tala", "Nyeri Branch") are sent to the AI, in one request. Waiting and discarded
// posters in Bulk post are sorted the same way. Safe to run again: it skips jobs that have counties.
//
//   npx tsx scripts/fill-counties.ts --dry      (shows what it would do)
//   npx tsx scripts/fill-counties.ts
import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import {
  ALL_COUNTIES,
  NO_LOCATION,
  OUTSIDE_KENYA,
  PLACE_CHOICES,
  cleanCounties,
  locationText,
  matchPlace,
  type JobPlace,
} from "../src/modules/jobs/counties";

config({ path: ".env.local", quiet: true });
const dryRun = process.argv.includes("--dry");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! }),
});

const standAlone = (place: string) => place === NO_LOCATION || place === ALL_COUNTIES;

// "Kericho and Bomet counties" → Kericho, Bomet; "Nairobi (Mombasa Road)" → Nairobi + Mombasa Road.
// null when a part isn't a county, for the AI to place.
function byRule(text: string): JobPlace | null {
  const town = /\(([^)]*)\)/.exec(text)?.[1]?.trim() ?? "";
  const parts = text
    .replace(/\([^)]*\)/g, " ")
    .split(/,|&|\band\b/i)
    .map((part) => part.replace(/\bcount(y|ies)\b/gi, "").trim())
    .filter(Boolean);
  if (!parts.length) return { counties: [NO_LOCATION], town: "", country: "" };
  if (!parts.every((part) => matchPlace(part))) return null;
  const counties = cleanCounties(parts);
  return { counties, town: standAlone(counties[0]) ? "" : town, country: "" };
}

async function byAi(texts: string[]): Promise<Map<string, JobPlace>> {
  const places = new Map<string, JobPlace>();
  if (!texts.length) return places;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error(`No ANTHROPIC_API_KEY to sort: ${texts.join(" | ")}`);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_POSTER_MODEL || "claude-haiku-5-5",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          "Each line below is the location of a job advert on a Kenyan jobs board.",
          `For each, give the counties (only from: ${PLACE_CHOICES.join(", ")}), the town or area as written (empty if none), and the country (only for "${OUTSIDE_KENYA}").`,
          `A town goes with the county it is in (Tala → Machakos). Use "${NO_LOCATION}" when no place is given; never guess.`,
          'Reply with JSON only: [{"text": "...", "counties": ["..."], "town": "...", "country": ""}]',
          "",
          ...texts,
        ].join("\n"),
      },
    ],
  });
  const reply = response.content.map((block) => (block.type === "text" ? block.text : "")).join("");
  const answers = JSON.parse(reply.slice(reply.indexOf("["), reply.lastIndexOf("]") + 1)) as {
    text: string;
    counties: string[];
    town: string;
    country: string;
  }[];
  for (const answer of answers) {
    const counties = cleanCounties(answer.counties ?? []);
    const first = counties[0] ?? NO_LOCATION;
    places.set(answer.text, {
      counties: counties.length ? counties : [NO_LOCATION],
      town: standAlone(first) ? "" : (answer.town ?? "").trim(),
      country: first === OUTSIDE_KENYA ? (answer.country ?? "").trim() : "",
    });
  }
  console.log(`AI: ${response.usage.input_tokens} in + ${response.usage.output_tokens} out tokens`);
  return places;
}

async function main() {
  const jobs = await db.job.findMany({ where: { counties: { isEmpty: true } }, select: { id: true, location: true } });
  const items = (await db.inboxItem.findMany({ select: { id: true, reading: true } })).filter(
    (item) => item.reading && !("counties" in (item.reading as object)),
  );
  const oldText = (item: (typeof items)[number]) => String((item.reading as { location?: unknown }).location ?? "");

  const texts = [...new Set([...jobs.map((job) => job.location), ...items.map(oldText)])];
  const sorted = new Map<string, JobPlace>();
  const unsorted: string[] = [];
  for (const text of texts) {
    const place = byRule(text);
    if (place) sorted.set(text, place);
    else unsorted.push(text);
  }
  for (const [text, place] of await byAi(unsorted)) sorted.set(text, place);

  for (const text of texts) {
    const place = sorted.get(text);
    console.log(
      `${JSON.stringify(text)} → ${place ? `${locationText(place)}  ${JSON.stringify(place)}` : "NOT SORTED"}`,
    );
  }
  if (dryRun) return console.log(`Dry run: ${jobs.length} jobs and ${items.length} posters not changed.`);

  let done = 0;
  for (const job of jobs) {
    const place = sorted.get(job.location);
    if (!place) continue;
    await db.job.update({ where: { id: job.id }, data: { ...place, location: locationText(place) } });
    done++;
  }
  for (const item of items) {
    const place = sorted.get(oldText(item));
    if (!place) continue;
    const reading = { ...(item.reading as Prisma.JsonObject), ...place, location: locationText(place) };
    await db.inboxItem.update({ where: { id: item.id }, data: { reading } });
  }
  console.log(`Sorted ${done} of ${jobs.length} jobs and ${items.length} posters.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
