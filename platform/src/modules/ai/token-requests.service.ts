import "server-only";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";
import { tokenRequestSchema } from "./token-requests";
import * as repo from "./token-requests.repo";

// Owner only (checked here, on the server). One open request at a time, so the platform owner
// never gets the same ask twice.

export async function requestTokens(
  member: CurrentMember,
  raw: unknown,
): Promise<{ ok: true } | { ok: false; fieldErrors: Record<string, string> }> {
  assertCan(member, "requestTokens");
  const parsed = tokenRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])),
    };
  }
  const tenantId = member.tenant.id;
  if (await repo.findOpenRequest(tenantId)) {
    return { ok: false, fieldErrors: { form: "You already have a request waiting. Cancel it first to change it." } };
  }
  await repo.createRequest(tenantId, { ...parsed.data, requestedById: member.id });
  return { ok: true };
}

export async function cancelTokenRequest(
  member: CurrentMember,
  requestId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  assertCan(member, "requestTokens");
  const closed = await repo.closeRequest(member.tenant.id, requestId, "CANCELLED", new Date());
  return closed ? { ok: true } : { ok: false, error: "This request was already dealt with." };
}
