import type { Metadata } from "next";
import { NotAllowed } from "@/components/admin/NotAllowed";
import { InboxBoard } from "@/components/admin/inbox/InboxBoard";
import { env } from "@/lib/env";
import { aiPretendMode } from "@/modules/ai/claude";
import { SAMPLE_POSTER_FILES } from "@/modules/ai/pretend-readings";
import { loadInbox } from "@/modules/inbox/inbox.view";
import { requireMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";

export const metadata: Metadata = { title: "Jobs inbox" };

export default async function JobsInboxPage() {
  const member = await requireMember();
  if (!can(member, "postJobs")) return <NotAllowed what="the jobs inbox" />;
  const data = await loadInbox(member);
  return <InboxBoard data={data} siteUrl={env.APP_URL} aiPretend={aiPretendMode} sampleFiles={SAMPLE_POSTER_FILES} />;
}
