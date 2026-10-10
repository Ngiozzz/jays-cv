import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { inviteExpiry } from "./invites";

// Exercises the real sign-in hooks against the database: the same path a Google sign-in takes
const run = Date.now();
const invitedEmail = `writer-${run}@test.jaycvs`;
const strangerEmail = `stranger-${run}@test.jaycvs`;
let tenantId = "";

beforeAll(async () => {
  const tenant = await db.tenant.create({ data: { slug: `test-${run}`, name: "Test business" } });
  tenantId = tenant.id;
  await db.invite.create({
    data: { tenantId, email: invitedEmail, name: "Grace", role: "WRITER", expiresAt: inviteExpiry(new Date()) },
  });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: [invitedEmail, strangerEmail] } } });
  await db.tenant.delete({ where: { id: tenantId } });
  await db.$disconnect();
});

async function createUser(email: string) {
  const ctx = await auth.$context;
  return ctx.internalAdapter.createUser(
    { email, name: "Test", emailVerified: true },
    { method: "oauth", oauth: { providerId: "google", profile: { email } } },
  );
}

async function createSession(userId: string) {
  const ctx = await auth.$context;
  return ctx.internalAdapter.createSession(userId);
}

describe("invite-only sign-in", () => {
  it("refuses an account for an email nobody invited", async () => {
    await expect(createUser(strangerEmail)).rejects.toThrow();
    expect(await db.user.count({ where: { email: strangerEmail } })).toBe(0);
  });

  it("turns the invite into an active membership", async () => {
    const user = await createUser(invitedEmail);
    const membership = await db.membership.findFirst({ where: { userId: user.id, tenantId } });
    expect(membership).toMatchObject({ role: "WRITER", status: "ACTIVE", displayName: "Grace" });
    const invite = await db.invite.findFirst({ where: { email: invitedEmail } });
    expect(invite?.status).toBe("ACCEPTED");
    await expect(createSession(user.id)).resolves.toBeTruthy();
  });

  it("refuses new sessions once the member is paused", async () => {
    const user = await db.user.findUniqueOrThrow({ where: { email: invitedEmail } });
    await db.membership.updateMany({ where: { userId: user.id }, data: { status: "PAUSED" } });
    await expect(createSession(user.id)).rejects.toThrow();
  });
});
