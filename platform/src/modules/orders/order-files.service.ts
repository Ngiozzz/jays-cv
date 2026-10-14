import "server-only";
import { fileStore } from "@/lib/storage";
import { tenantDb } from "@/lib/tenant-db";
import type { CurrentMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";
import type { CurrentTenant } from "@/modules/tenants/tenants.service";
import { hasTrackingPass } from "./tracking-pass";

// Private order files (client CVs, drafts, finals) are only ever read here, after checking who asks:
// - the owner, or the writer on the order: any of its files
// - any other team member: only our drafts and finals (the client's own files hold their details)
// - the client, with a pass for that order: all of its files (their own uploads and ours)

export async function readOrderFile(tenant: CurrentTenant, fileId: string, member: CurrentMember | null) {
  const file = await tenantDb(tenant.id).storedFile.findFirst({
    where: { id: fileId, deletedAt: null, orderId: { not: null } },
    select: {
      name: true,
      kind: true,
      mimeType: true,
      storagePath: true,
      orderId: true,
      order: { select: { writerId: true } },
    },
  });
  if (!file?.orderId || !file.order) return null;
  const ours = file.kind === "DRAFT" || file.kind === "FINAL";
  const allowed = member
    ? can(member, "workOnAnyOrder") || file.order.writerId === member.id || (ours && can(member, "acceptOrders"))
    : await hasTrackingPass(tenant.id, file.orderId);
  if (!allowed) return null;
  return { name: file.name, mimeType: file.mimeType, bytes: await fileStore.get("order-files", file.storagePath) };
}
