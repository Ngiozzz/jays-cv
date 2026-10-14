import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import type { BrowserContext } from "@playwright/test";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Role } from "../src/generated/prisma/enums";
import { SESSION_COOKIE, signedSessionValue } from "../src/lib/session-cookie";

config({ path: ".env.local", quiet: true });

// Creates a signed-in team member directly in the database, standing in for a Google sign-in
// (which can't be automated). The cookie is signed exactly as Better Auth signs it.
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });
const secret = process.env.BETTER_AUTH_SECRET ?? "";
const TEST_DOMAIN = "e2e.jaycvs.test";
const createdUserIds: string[] = [];
// Anything created after this moment by the app during the test run is test data
const startedAt = new Date();

export async function signInAs(context: BrowserContext, role: Role, name: string) {
  const tenant = await db.tenant.findUniqueOrThrow({ where: { slug: process.env.DEFAULT_TENANT_SLUG ?? "jaycvs" } });
  const id = randomBytes(12).toString("hex");
  const user = await db.user.create({ data: { id, name, email: `${id}@${TEST_DOMAIN}`, emailVerified: true } });
  createdUserIds.push(user.id);
  await db.membership.create({ data: { tenantId: tenant.id, userId: user.id, role, displayName: name } });
  const token = randomBytes(24).toString("hex");
  await db.session.create({
    data: { id: `s${id}`, token, userId: user.id, expiresAt: new Date(Date.now() + 3_600_000) },
  });
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: encodeURIComponent(signedSessionValue(token, secret)),
      url: "http://localhost:3000",
    },
  ]);
  return { userId: user.id, tenantId: tenant.id };
}

export function setMemberStatus(userId: string, status: "ACTIVE" | "PAUSED") {
  return db.membership.updateMany({ where: { userId }, data: { status } });
}

// Only the people this test file created: other files run at the same time with their own test staff
export async function removeTestStaff() {
  await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await db.$disconnect();
}

// Deletes jobs a test created (by title prefix), even when the test failed before its own clean-up
export async function removeTestJobs(titlePrefix: string) {
  await db.job.deleteMany({ where: { title: { startsWith: titlePrefix } } });
}

export async function removeTestCompanies(namePrefix: string) {
  await db.company.deleteMany({ where: { name: { startsWith: namePrefix } } });
}

// Jobs and inbox posters created by this file's test staff, plus companies left with no jobs and no logo
export async function removeWorkOfTestStaff() {
  const memberships = await db.membership.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } });
  const ids = memberships.map((m) => m.id);
  await db.inboxItem.deleteMany({ where: { OR: [{ addedById: { in: ids } }, { createdAt: { gte: startedAt } }] } });
  await db.job.deleteMany({ where: { createdById: { in: ids } } });
  await db.company.deleteMany({ where: { jobs: { none: {} }, logoPath: null } });
}

export async function removeTestInvites() {
  await db.invite.deleteMany({ where: { email: { endsWith: `@${TEST_DOMAIN}` } } });
}

export const testEmail = (name: string) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@${TEST_DOMAIN}`;

// A writer who never signs in, with delivered orders already paid for: enough for the Finance screen
export async function addTestWriterWithOrders(
  name: string,
  payPercent: number,
  orders: { itemName: string; amount: number; clientName: string; receipt: string }[],
) {
  const tenant = await db.tenant.findUniqueOrThrow({ where: { slug: process.env.DEFAULT_TENANT_SLUG ?? "jaycvs" } });
  const id = randomBytes(12).toString("hex");
  const user = await db.user.create({ data: { id, name, email: `${id}@${TEST_DOMAIN}`, emailVerified: true } });
  createdUserIds.push(user.id);
  const writer = await db.membership.create({
    data: { tenantId: tenant.id, userId: user.id, role: "WRITER", displayName: name, payPercent },
  });
  const now = new Date();
  for (const order of orders) {
    const created = await db.order.create({
      data: {
        tenantId: tenant.id,
        // Far above real order numbers, so tests never take one
        number: 900_000 + randomBytes(3).readUIntBE(0, 3),
        status: "DELIVERED",
        itemName: order.itemName,
        amount: order.amount,
        firstDraftHours: 48,
        clientName: order.clientName,
        clientPhone: "0712345678",
        trackingTokenHash: randomBytes(16).toString("hex"),
        source: "e2e",
        writerId: writer.id,
        paidAt: now,
        deliveredAt: now,
      },
    });
    await db.payment.create({
      data: {
        tenantId: tenant.id,
        orderId: created.id,
        channel: "MPESA_STK",
        status: "CONFIRMED",
        match: "ORDER_NUMBER",
        amount: order.amount,
        receipt: order.receipt,
        confirmedAt: now,
      },
    });
  }
}

export async function removeTestOrders() {
  await db.payment.deleteMany({ where: { order: { source: "e2e" } } });
  await db.order.deleteMany({ where: { source: "e2e" } });
}

// Content tests edit the real price list; this puts it back exactly as it was, and drops their history
export async function snapshotPrices() {
  const [packages, services] = await Promise.all([db.package.findMany(), db.service.findMany()]);
  return async () => {
    for (const row of packages)
      await db.package.update({ where: { id: row.id }, data: { ...row, tenantId: undefined, updatedAt: undefined } });
    for (const row of services)
      await db.service.update({ where: { id: row.id }, data: { ...row, tenantId: undefined, updatedAt: undefined } });
    const memberships = await db.membership.findMany({
      where: { userId: { in: createdUserIds } },
      select: { id: true },
    });
    await db.contentChange.deleteMany({ where: { changedById: { in: memberships.map((m) => m.id) } } });
  };
}

// Puts the reviews back as they were (and removes reviews added during the test)
export async function snapshotReviews() {
  const reviews = await db.review.findMany();
  return async () => {
    await db.review.deleteMany({ where: { id: { notIn: reviews.map((row) => row.id) } } });
    for (const row of reviews)
      await db.review.update({ where: { id: row.id }, data: { ...row, tenantId: undefined, orderId: undefined } });
    const memberships = await db.membership.findMany({
      where: { userId: { in: createdUserIds } },
      select: { id: true },
    });
    await db.contentChange.deleteMany({ where: { changedById: { in: memberships.map((m) => m.id) } } });
  };
}

// Puts the samples back as they were (and removes samples added during the test, with their images)
export async function snapshotSamples() {
  const samples = await db.sample.findMany();
  return async () => {
    const added = await db.sample.findMany({ where: { id: { notIn: samples.map((row) => row.id) } } });
    // Their images, when files are kept locally (development without storage keys)
    for (const path of added.flatMap((row) => [row.beforeImage, row.afterImage]))
      if (path) await rm(join(".uploads", "sample-cvs", path), { force: true });
    await db.sample.deleteMany({ where: { id: { in: added.map((row) => row.id) } } });
    for (const row of samples) await db.sample.update({ where: { id: row.id }, data: { ...row, tenantId: undefined } });
    const memberships = await db.membership.findMany({
      where: { userId: { in: createdUserIds } },
      select: { id: true },
    });
    await db.contentChange.deleteMany({ where: { changedById: { in: memberships.map((m) => m.id) } } });
  };
}

// Puts the articles back as they were (and removes articles written during the test)
export async function snapshotPosts() {
  const posts = await db.post.findMany();
  return async () => {
    await db.post.deleteMany({ where: { id: { notIn: posts.map((row) => row.id) } } });
    for (const row of posts)
      await db.post.upsert({
        where: { id: row.id },
        update: { ...row, tenantId: undefined, updatedAt: undefined },
        create: row,
      });
    const memberships = await db.membership.findMany({
      where: { userId: { in: createdUserIds } },
      select: { id: true },
    });
    await db.contentChange.deleteMany({ where: { changedById: { in: memberships.map((m) => m.id) } } });
  };
}

// Puts the FAQs back as they were (including any deleted during the test)
export async function snapshotFaqs() {
  const faqs = await db.faq.findMany();
  return async () => {
    await db.faq.deleteMany({ where: { id: { notIn: faqs.map((row) => row.id) } } });
    for (const row of faqs)
      await db.faq.upsert({ where: { id: row.id }, update: { ...row, tenantId: undefined }, create: row });
    const memberships = await db.membership.findMany({
      where: { userId: { in: createdUserIds } },
      select: { id: true },
    });
    await db.contentChange.deleteMany({ where: { changedById: { in: memberships.map((m) => m.id) } } });
  };
}

export async function snapshotHomepage() {
  const homepage = await db.homepage.findMany();
  return async () => {
    for (const { id, ...row } of homepage)
      await db.homepage.update({ where: { id }, data: { ...row, stats: row.stats ?? [] } });
    const memberships = await db.membership.findMany({
      where: { userId: { in: createdUserIds } },
      select: { id: true },
    });
    await db.contentChange.deleteMany({ where: { changedById: { in: memberships.map((m) => m.id) } } });
  };
}

export async function snapshotSettings() {
  const settings = await db.businessSettings.findMany();
  return async () => {
    for (const { id, ...row } of settings) await db.businessSettings.update({ where: { id }, data: row });
    const memberships = await db.membership.findMany({
      where: { userId: { in: createdUserIds } },
      select: { id: true },
    });
    await db.contentChange.deleteMany({ where: { changedById: { in: memberships.map((m) => m.id) } } });
  };
}

// An order straight in the database (the website's order card comes later), with its private link
export async function createTrackedOrder(status: "NEW" | "PAID" | "WRITING" | "DRAFT_SENT") {
  const tenant = await db.tenant.findUniqueOrThrow({ where: { slug: process.env.DEFAULT_TENANT_SLUG ?? "jaycvs" } });
  const { hashTrackingToken, newTrackingToken, sealTrackingToken } =
    await import("../src/modules/orders/tracking-token");
  const token = newTrackingToken();
  const phone = `07${String(10_000_000 + Math.floor(Math.random() * 89_999_999))}`;
  const { nextOrderNumber } = await db.tenant.update({
    where: { id: tenant.id },
    data: { nextOrderNumber: { increment: 1 } },
    select: { nextOrderNumber: true },
  });
  const order = await db.order.create({
    data: {
      tenantId: tenant.id,
      number: nextOrderNumber - 1,
      status,
      itemName: "Professional CV",
      amount: 3500,
      firstDraftHours: 24,
      revisionRounds: 2,
      clientName: "Wanjiku E2E-Test",
      clientPhone: phone,
      trackingTokenHash: hashTrackingToken(token),
      trackingTokenSealed: sealTrackingToken(token, process.env.BETTER_AUTH_SECRET ?? ""),
      paidAt: status === "NEW" ? null : new Date(Date.now() - 3_600_000),
      draftSentAt: status === "DRAFT_SENT" ? new Date() : null,
      events: {
        create: [
          { tenantId: tenant.id, kind: "placed", actorType: "CLIENT", visibleToClient: true },
          ...(status === "NEW"
            ? []
            : [
                {
                  tenantId: tenant.id,
                  kind: "paid",
                  actorType: "MPESA" as const,
                  data: { receipt: "E2E4H7XQ2P" },
                  visibleToClient: true,
                },
              ]),
          { tenantId: tenant.id, kind: "note", actorType: "STAFF", data: { text: "E2E staff-only note" } },
        ],
      },
    },
  });
  // The client's own CV, as if sent with the order (the local file store stands in for Supabase)
  const cvPath = `${tenant.id}/${order.id}/client-cv.pdf`;
  await mkdir(join(process.cwd(), ".uploads", "order-files", tenant.id, order.id), { recursive: true });
  await writeFile(join(process.cwd(), ".uploads", "order-files", cvPath), "%PDF-1.4\n% E2E client CV\n");
  await db.storedFile.create({
    data: {
      tenantId: tenant.id,
      orderId: order.id,
      kind: "CURRENT_CV",
      name: "Wanjiku_old_CV.pdf",
      mimeType: "application/pdf",
      sizeBytes: 24,
      storagePath: cvPath,
      note: "My CV from 2022",
      uploadedBy: "client",
    },
  });
  return {
    ref: `${tenant.orderPrefix}-${order.number}`,
    phone,
    token,
    remove: async () => {
      // Payments outlive their order on purpose (money records), so test ones are removed by hand
      await db.payment.deleteMany({ where: { orderId: order.id } });
      await db.order.delete({ where: { id: order.id } });
      await rm(join(process.cwd(), ".uploads", "order-files", tenant.id, order.id), { recursive: true, force: true });
      await db.trackingAttempt.deleteMany({ where: { tenantId: tenant.id, at: { gte: startedAt } } });
    },
  };
}

// Removes an order the browser placed through the website, with its payments and stored files
export async function removeOrderByRef(ref: string) {
  const tenant = await db.tenant.findUniqueOrThrow({ where: { slug: process.env.DEFAULT_TENANT_SLUG ?? "jaycvs" } });
  const number = Number(ref.split("-").pop());
  const order = await db.order.findFirst({ where: { tenantId: tenant.id, number }, select: { id: true } });
  if (!order) return;
  await db.payment.deleteMany({ where: { orderId: order.id } });
  await db.order.delete({ where: { id: order.id } });
  await rm(join(process.cwd(), ".uploads", "order-files", tenant.id, order.id), { recursive: true, force: true });
  await db.trackingAttempt.deleteMany({ where: { tenantId: tenant.id, at: { gte: startedAt } } });
}
