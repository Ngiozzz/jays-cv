import "server-only";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// "Proceed for testing" on the sign-in screen: signs in as a test owner or a test writer without Google.
// Development only: refused on the server in any other mode, whatever the page shows.
export const testSignInEnabled = env.NODE_ENV === "development";

export type TestPerson = "owner" | "writer";

const PEOPLE = {
  owner: {
    user: { id: "test-owner", email: "test-owner@dev.jaycvs.local", name: "Jay (test)" },
    member: { role: "OWNER", canWrite: true, canPostJobs: true, payPercent: 0 },
  },
  // A writer who also posts jobs, so every writer screen can be seen. Their permissions and pay can
  // then be changed in Team like anyone else's, and a new sign-in keeps those changes.
  writer: {
    user: { id: "test-writer", email: "test-writer@dev.jaycvs.local", name: "Mary (test writer)" },
    member: { role: "WRITER", canWrite: true, canPostJobs: true, payPercent: 40 },
  },
} as const;

export async function startTestSession(
  tenantId: string,
  person: TestPerson,
): Promise<{ token: string; expiresAt: Date }> {
  if (!testSignInEnabled) throw new Error("Test sign-in only works in development");
  const { user, member } = PEOPLE[person];

  // Created directly, skipping the invite check that guards real Google sign-ups
  await db.user.upsert({ where: { id: user.id }, update: {}, create: { ...user, emailVerified: true } });
  await db.membership.upsert({
    where: { tenantId_userId: { tenantId, userId: user.id } },
    update: { status: "ACTIVE", role: member.role },
    create: { tenantId, userId: user.id, displayName: user.name, ...member },
  });

  const ctx = await auth.$context;
  const session = await ctx.internalAdapter.createSession(user.id);
  return { token: session.token, expiresAt: session.expiresAt };
}
