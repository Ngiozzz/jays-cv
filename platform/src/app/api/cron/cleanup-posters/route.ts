import { env } from "@/lib/env";
import { cleanUpOldPosters } from "@/modules/jobs/poster-cleanup.service";

// Called once a night by Vercel Cron (schedule in vercel.json). Only callers with the secret may run it.
export async function GET(request: Request) {
  if (!env.CRON_SECRET) return new Response("CRON_SECRET is not set", { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json({ cleanedUp: await cleanUpOldPosters() });
}
