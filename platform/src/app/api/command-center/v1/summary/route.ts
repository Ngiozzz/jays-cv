import { getSummary, receive } from "@/modules/command-center/command-center.service";

const NO_STORE = { "cache-control": "no-store" };

// The business's official token balance and AI switch, as the Command Center shows them
export async function GET(request: Request) {
  const business = await receive(request, "");
  if (!business) return Response.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  return Response.json(await getSummary(business), { headers: NO_STORE });
}
