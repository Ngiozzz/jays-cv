// Creates Jay CVS and its starting content. Safe to run again: it never overwrites
// anything the owner has already edited, it only fills in what is missing.
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { inviteExpiry, normalizeEmail } from "../src/modules/team/invites";
import * as data from "./seed-data";

config({ path: ".env.local" });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DIRECT_URL in .env.local before seeding");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function seedContent(tenantId: string) {
  const withOrder = <T>(rows: readonly T[]) => rows.map((row, sortOrder) => ({ ...row, sortOrder, tenantId }));

  await db.businessSettings.upsert({ where: { tenantId }, update: {}, create: { tenantId, ...data.SETTINGS } });
  await db.homepage.upsert({ where: { tenantId }, update: {}, create: { tenantId, ...data.HOMEPAGE } });

  // Each list is only filled when it's empty, so re-running never duplicates or undoes edits
  if (!(await db.package.count({ where: { tenantId } })))
    await db.package.createMany({ data: withOrder(data.PACKAGES) });
  if (!(await db.service.count({ where: { tenantId } })))
    await db.service.createMany({ data: withOrder(data.SERVICES) });
  if (!(await db.review.count({ where: { tenantId } }))) await db.review.createMany({ data: withOrder(data.REVIEWS) });
  if (!(await db.sample.count({ where: { tenantId } }))) await db.sample.createMany({ data: withOrder(data.SAMPLES) });
  if (!(await db.faq.count({ where: { tenantId } }))) await db.faq.createMany({ data: withOrder(data.FAQS) });
  if (!(await db.post.count({ where: { tenantId } }))) {
    await db.post.createMany({ data: data.POSTS.map((post) => ({ ...post, tenantId, status: "PUBLISHED" as const })) });
  }
}

async function seedStarterTokens(tenantId: string) {
  const granted = await db.tokenLedgerEntry.count({ where: { tenantId, kind: "GRANT" } });
  if (granted) return;
  await db.tokenLedgerEntry.create({
    data: { tenantId, kind: "GRANT", delta: data.STARTER_TOKENS, note: "Starter tokens" },
  });
}

// The owner can't be invited by anyone else, so the seed invites them; they then sign in with Google
async function seedOwnerInvite(tenantId: string) {
  const raw = process.env.OWNER_EMAIL?.trim();
  if (!raw) {
    console.warn("OWNER_EMAIL is not set: no owner invite created, so nobody can sign in yet.");
    return;
  }
  const email = normalizeEmail(raw);
  const hasOwner = await db.membership.count({ where: { tenantId, role: "OWNER", status: "ACTIVE" } });
  const pending = await db.invite.count({ where: { tenantId, email, status: "PENDING" } });
  if (hasOwner || pending) return;
  await db.invite.create({
    data: {
      tenantId,
      email,
      name: "Jay",
      role: "OWNER",
      canWrite: true,
      canPostJobs: true,
      expiresAt: inviteExpiry(new Date()),
    },
  });
  console.log(`Owner invite created for ${email}`);
}

async function main() {
  const { slug, ...tenantFields } = data.TENANT;
  const tenant = await db.tenant.upsert({ where: { slug }, update: {}, create: { slug, ...tenantFields } });
  await seedContent(tenant.id);
  await seedStarterTokens(tenant.id);
  await seedOwnerInvite(tenant.id);
  console.log(`Seeded ${tenant.name} (${tenant.slug})`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
