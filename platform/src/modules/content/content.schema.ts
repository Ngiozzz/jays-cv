import { z } from "zod";

// Homepage stats are stored as JSON; this is their shape
export const homepageStatsSchema = z.array(z.object({ value: z.string(), label: z.string() })).max(6);

export type HomepageStat = z.infer<typeof homepageStatsSchema>[number];
