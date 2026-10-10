// Pure invite rules, shared by the sign-in hooks and (later) the Team screen.

export const INVITE_VALID_DAYS = 14;

// Google may return mixed-case addresses; invites are stored lower-case
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function inviteExpiry(from: Date): Date {
  return new Date(from.getTime() + INVITE_VALID_DAYS * 24 * 60 * 60 * 1000);
}

type InviteLike = { status: "PENDING" | "ACCEPTED" | "REVOKED"; expiresAt: Date };

export function isUsableInvite(invite: InviteLike, now: Date): boolean {
  return invite.status === "PENDING" && invite.expiresAt > now;
}
