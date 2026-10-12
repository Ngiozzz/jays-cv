import type { Metadata } from "next";
import { NotAllowed } from "@/components/admin/NotAllowed";
import { TeamBoard } from "@/components/admin/team/TeamBoard";
import { requireMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";
import { loadTeam } from "@/modules/team/team.service";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const member = await requireMember();
  if (!can(member, "manageTeam")) return <NotAllowed what="the team" />;
  return <TeamBoard data={await loadTeam(member)} />;
}
