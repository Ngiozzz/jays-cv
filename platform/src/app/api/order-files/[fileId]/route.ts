import { readOrderFile } from "@/modules/orders/order-files.service";
import { currentMemberOrNull } from "@/modules/team/current-member";
import { getRequestTenant } from "@/modules/tenants/tenants.service";

// Opens a private order file for someone allowed to see it; everyone else gets "not found"
export async function GET(request: Request, { params }: RouteContext<"/api/order-files/[fileId]">) {
  const { fileId } = await params;
  const file = await readOrderFile(await getRequestTenant(), fileId, await currentMemberOrNull()).catch(() => null);
  if (!file) return new Response("Not found", { status: 404 });
  const download = new URL(request.url).searchParams.has("download");
  const name = encodeURIComponent(file.name);
  return new Response(Buffer.from(file.bytes), {
    headers: {
      "content-type": file.mimeType,
      "content-disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${name}`,
      // Personal data: never kept by browsers or shared caches
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
