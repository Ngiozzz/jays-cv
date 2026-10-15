import { env } from "@/lib/env";
import { nightlyOrderUpkeep } from "@/modules/orders/order-upkeep.service";

// Called once a night by Vercel Cron (schedule in vercel.json): moves orders on by the clock
// (abandon, remind, auto-complete) and deletes abandoned unpaid orders past each business's limit.
export async function GET(request: Request) {
  if (!env.CRON_SECRET) return new Response("CRON_SECRET is not set", { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json({ deleted: await nightlyOrderUpkeep() });
}
