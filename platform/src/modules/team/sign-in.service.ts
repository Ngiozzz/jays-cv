import "server-only";
import { normalizeEmail } from "./invites";
import { acceptInvites, countActiveMemberships, findPendingInvitesByEmail, findUserEmail } from "./team.repo";

// Called by the auth hooks (src/lib/auth.ts). Staff accounts are invite-only:
// nobody gets an account, or a session, without an invite or an active membership.

export async function isInvited(email: string): Promise<boolean> {
  const invites = await findPendingInvitesByEmail(normalizeEmail(email), new Date());
  return invites.length > 0;
}

export async function acceptPendingInvites(user: { id: string; email: string }): Promise<void> {
  const now = new Date();
  const invites = await findPendingInvitesByEmail(normalizeEmail(user.email), now);
  if (invites.length) await acceptInvites(user.id, invites, now);
}

// Runs on every new session: picks up invites sent after the account was created,
// then refuses the session if the person isn't active in any business
export async function mayStartSession(userId: string): Promise<boolean> {
  const email = await findUserEmail(userId);
  if (!email) return false;
  await acceptPendingInvites({ id: userId, email });
  return (await countActiveMemberships(userId)) > 0;
}
