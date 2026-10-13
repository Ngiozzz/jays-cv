import { randomBytes } from "node:crypto";
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
