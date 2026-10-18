// Gives a business its secret key for signing Command Center messages, and writes it to
// command-center-keys.local.json (gitignored) for the Command Center to read. The key is never printed.
// Safe to run again: a business that already has a key keeps it (use --new to replace it).
//
//   npx tsx scripts/command-center-key.ts jaycvs
//   npx tsx scripts/command-center-key.ts jaycvs --new
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local", quiet: true });
const KEYS_FILE = "command-center-keys.local.json";
const slug = process.argv[2];
const replace = process.argv.includes("--new");
if (!slug || slug.startsWith("--"))
  throw new Error("Say which business, e.g. npx tsx scripts/command-center-key.ts jaycvs");

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! }),
});

async function main() {
  const tenant = await db.tenant.findUnique({ where: { slug }, select: { id: true, commandCenterKey: true } });
  if (!tenant) throw new Error(`No business called "${slug}"`);

  let key = tenant.commandCenterKey;
  if (!key || replace) {
    key = randomBytes(32).toString("base64url");
    await db.tenant.update({ where: { id: tenant.id }, data: { commandCenterKey: key } });
  }

  const keys: Record<string, string> = existsSync(KEYS_FILE) ? JSON.parse(readFileSync(KEYS_FILE, "utf8")) : {};
  keys[slug] = key;
  writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2) + "\n");
  console.log(
    `${slug}: key ${replace || !tenant.commandCenterKey ? "made" : "kept"} (${key.length} characters), saved in ${KEYS_FILE}`,
  );
}

main().finally(() => db.$disconnect());
