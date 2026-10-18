import { getUsage, receive } from "@/modules/command-center/command-center.service";
import { usageQuery } from "@/modules/command-center/messages";

const NO_STORE = { "cache-control": "no-store" };

// The Command Center pulls token entries after the last running number it has: GET ?after=N&limit=500
export async function GET(request: Request) {
  const business = await receive(request, "");
  if (!business) return Response.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const query = usageQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return Response.json({ error: "bad_query" }, { status: 400, headers: NO_STORE });
  return Response.json(await getUsage(business, query.data.after, query.data.limit), { headers: NO_STORE });
}
