import { env } from "@/lib/env";
import { morningRun } from "@/modules/job-sources/morning.service";

// Vercel stops a function after this many seconds
export const maxDuration = 300;
// New work stops being started this long into the run, leaving time for the last check or read to finish
const WORK_FOR_MS = 230_000;

// Called by Vercel Cron at 05:00, 06:00 and 07:00 Nairobi time (schedules in vercel.json, in UTC).
// The first run checks the job sources and reads the new jobs; the later ones finish what's left.
export async function GET(request: Request) {
  if (!env.CRON_SECRET) return new Response("CRON_SECRET is not set", { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json({ runs: await morningRun(Date.now() + WORK_FOR_MS) });
}
