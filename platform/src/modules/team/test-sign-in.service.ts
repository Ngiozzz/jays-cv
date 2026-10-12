import "server-only";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// "Proceed for testing" on the sign-in screen: signs in as a test owner without Google.
// Development only: refused on the server in any other mode, whatever the page shows.
export const testSignInEnabled = env.NODE_ENV === "development";

const TEST_OWNER = { id: "test-owner", email: "test-owner@dev.jaycvs.local", name: "Jay (test)" };

export async function startTestOwnerSession(tenantId: string): Promise<{ token: string; expiresAt: Date }> {
  if (!testSignInEnabled) throw new Error("Test sign-in only works in development");

  // Created directly, skipping the invite check that guards real Google sign-ups
  await db.user.upsert({
    where: { id: TEST_OWNER.id },
    update: {},
    create: { ...TEST_OWNER, emailVerified: true },
  });
  await db.membership.upsert({
    where: { tenantId_userId: { tenantId, userId: TEST_OWNER.id } },
    update: { status: "ACTIVE", role: "OWNER" },
    create: { tenantId, userId: TEST_OWNER.id, role: "OWNER", displayName: TEST_OWNER.name, canPostJobs: true },
  });

  const ctx = await auth.$context;
  const session = await ctx.internalAdapter.createSession(TEST_OWNER.id);
  return { token: session.token, expiresAt: session.expiresAt };
}
