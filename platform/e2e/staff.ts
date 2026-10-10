import { createHmac, randomBytes } from "node:crypto";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import type { BrowserContext } from "@playwright/test";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Role } from "../src/generated/prisma/enums";

config({ path: ".env.local", quiet: true });

// Creates a signed-in team member directly in the database, standing in for a Google sign-in
// (which can't be automated). The cookie is signed exactly as Better Auth signs it.
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });
const secret = process.env.BETTER_AUTH_SECRET ?? "";
const TEST_DOMAIN = "e2e.jaycvs.test";

export async function signInAs(context: BrowserContext, role: Role, name: string) {
  const tenant = await db.tenant.findUniqueOrThrow({ where: { slug: process.env.DEFAULT_TENANT_SLUG ?? "jaycvs" } });
  const id = randomBytes(12).toString("hex");
  const user = await db.user.create({ data: { id, name, email: `${id}@${TEST_DOMAIN}`, emailVerified: true } });
  await db.membership.create({ data: { tenantId: tenant.id, userId: user.id, role, displayName: name } });
  const token = randomBytes(24).toString("hex");
  await db.session.create({
    data: { id: `s${id}`, token, userId: user.id, expiresAt: new Date(Date.now() + 3_600_000) },
  });
  const signature = createHmac("sha256", secret).update(token).digest("base64");
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: encodeURIComponent(`${token}.${signature}`),
      url: "http://localhost:3000",
    },
  ]);
  return { userId: user.id, tenantId: tenant.id };
}

export function setMemberStatus(userId: string, status: "ACTIVE" | "PAUSED") {
  return db.membership.updateMany({ where: { userId }, data: { status } });
}

export async function removeTestStaff() {
  await db.user.deleteMany({ where: { email: { endsWith: `@${TEST_DOMAIN}` } } });
  await db.$disconnect();
}
