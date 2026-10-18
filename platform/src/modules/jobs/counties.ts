// Where a job is: one or more of Kenya's 47 counties, plus an optional town or area ("Tala" in
// Machakos). Fixed names, so the board's county filter never shows "Nairobi" and "Nairobi CBD" as
// two places. Pure, so it runs in the browser too and is unit-tested.

export const KENYA_COUNTIES = [
  "Baringo",
  "Bomet",
  "Bungoma",
  "Busia",
  "Elgeyo-Marakwet",
  "Embu",
  "Garissa",
  "Homa Bay",
  "Isiolo",
  "Kajiado",
  "Kakamega",
  "Kericho",
  "Kiambu",
  "Kilifi",
  "Kirinyaga",
  "Kisii",
  "Kisumu",
  "Kitui",
  "Kwale",
  "Laikipia",
  "Lamu",
  "Machakos",
  "Makueni",
  "Mandera",
  "Marsabit",
  "Meru",
  "Migori",
  "Mombasa",
  "Murang'a",
  "Nairobi",
  "Nakuru",
  "Nandi",
  "Narok",
  "Nyamira",
  "Nyandarua",
  "Nyeri",
  "Samburu",
  "Siaya",
  "Taita-Taveta",
  "Tana River",
  "Tharaka-Nithi",
  "Trans Nzoia",
  "Turkana",
  "Uasin Gishu",
  "Vihiga",
  "Wajir",
  "West Pokot",
] as const;

// Choices that stand alone instead of counties
export const ALL_COUNTIES = "All counties";
export const OUTSIDE_KENYA = "Outside Kenya";
// When the advert doesn't say where the job is (never a guessed town)
export const NO_LOCATION = "Not specified";

export const PLACE_CHOICES = [...KENYA_COUNTIES, ALL_COUNTIES, OUTSIDE_KENYA, NO_LOCATION] as const;
export type PlaceChoice = (typeof PLACE_CHOICES)[number];

export type JobPlace = { counties: string[]; town: string; country: string };

// "Taita Taveta County", "MURANGA", "Homabay" → the same key as the official name
const key = (text: string) =>
  text
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/\b(county|city)\b/g, " ")
    .replace(/[^a-z]/g, "");

const SPECIAL_WORDS: Record<string, PlaceChoice> = {
  allcounties: ALL_COUNTIES,
  nationwide: ALL_COUNTIES,
  countrywide: ALL_COUNTIES,
  variouscounties: ALL_COUNTIES,
  variouslocations: ALL_COUNTIES,
  allregions: ALL_COUNTIES,
  outsidekenya: OUTSIDE_KENYA,
  abroad: OUTSIDE_KENYA,
  overseas: OUTSIDE_KENYA,
  notspecified: NO_LOCATION,
  notstated: NO_LOCATION,
  notgiven: NO_LOCATION,
  unknown: NO_LOCATION,
  na: NO_LOCATION,
  none: NO_LOCATION,
  kenya: NO_LOCATION,
};

const BY_KEY = new Map<string, PlaceChoice>([
  ...PLACE_CHOICES.map((choice) => [key(choice), choice] as const),
  ...Object.entries(SPECIAL_WORDS),
]);

// A typed or AI-written county → its official name, or null if it isn't one
export function matchPlace(text: string): PlaceChoice | null {
  return BY_KEY.get(key(text)) ?? null;
}

export const isCounty = (place: string) => (KENYA_COUNTIES as readonly string[]).includes(place);

// Official names only, no repeats. Real counties win over the stand-alone choices, and a stand-alone
// choice is never mixed with anything else.
export function cleanCounties(list: readonly string[]): PlaceChoice[] {
  const found = [...new Set(list.map(matchPlace).filter((place): place is PlaceChoice => place !== null))];
  const counties = found.filter(isCounty);
  return counties.length ? counties : found.slice(0, 1);
}

export const isNoLocation = (place: Pick<JobPlace, "counties">) =>
  !place.counties.length || place.counties[0] === NO_LOCATION;

const same = (a: string, b: string) => key(a) === key(b);

// How the place reads on the site: "Tala, Machakos County", "Nairobi & Kisumu Counties",
// "Dubai, United Arab Emirates"
export function locationText({ counties, town, country }: JobPlace): string {
  const first = counties[0];
  if (!first) return "";
  if (first === NO_LOCATION || first === ALL_COUNTIES) return first;
  if (first === OUTSIDE_KENYA) return [town, country].filter(Boolean).join(", ") || OUTSIDE_KENYA;
  if (counties.length === 1) return town && !same(town, first) ? `${town}, ${first} County` : `${first} County`;
  const names =
    counties.length > 4
      ? `${counties.slice(0, 3).join(", ")} + ${counties.length - 3} more`
      : `${counties.slice(0, -1).join(", ")} & ${counties.at(-1)}`;
  return `${names} Counties${town ? ` (${town})` : ""}`;
}

// Whether a job shows under a county on the board: a nationwide job shows under every county
export function inCounty(counties: readonly string[], county: string): boolean {
  return counties.includes(county) || (counties[0] === ALL_COUNTIES && isCounty(county));
}
