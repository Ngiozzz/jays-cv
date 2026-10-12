import type { Metadata } from "next";
import { ProfileForm } from "@/components/admin/ProfileForm";
import { Icon } from "@/components/icons/Icon";
import { requireMember } from "@/modules/team/current-member";
import { can, type Permission } from "@/modules/team/permissions";
import { loadProfile } from "@/modules/team/profile.service";
import { initialsOf } from "@/modules/team/team.rules";

export const metadata: Metadata = { title: "Your profile" };

const ABILITIES: { permission: Permission; label: string }[] = [
  { permission: "acceptOrders", label: "Accept and write CV orders" },
  { permission: "postJobs", label: "Post jobs, use the Jobs inbox and company logos" },
  { permission: "draftCareerTips", label: "Draft career tips" },
  { permission: "seeMoney", label: "See prices, takings and payouts" },
  { permission: "manageTeam", label: "Invite, pause and remove team members" },
  { permission: "editWebsiteContent", label: "Edit website content and settings" },
];

export default async function ProfilePage() {
  const member = await requireMember();
  const profile = await loadProfile(member);
  const owner = profile.role === "OWNER";

  return (
    <div className="profile-grid">
      <section className="panel">
        <div className="profile-head">
          <span className={owner ? "avatar owner profile-avatar" : "avatar profile-avatar"}>
            {initialsOf(profile.name)}
          </span>
          <div>
            <h2>{profile.name}</h2>
            <p>
              <span className={owner ? "mstatus owner" : "mstatus ok"}>{owner ? "Owner" : "Writer"}</span> ·{" "}
              {profile.business}
              {profile.joinedAt &&
                ` · joined ${new Date(profile.joinedAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`}
            </p>
          </div>
        </div>
        <div className="panel-body">
          <ProfileForm name={profile.name} phone={profile.phone} />
        </div>
      </section>

      <div className="profile-side">
        <section className="panel panel-body">
          <p className="preview-label">How you sign in</p>
          <p className="profile-email">
            <Icon name="lock" />
            Google account: <strong>{profile.email}</strong>
          </p>
          <p className="hint-sm">
            Your password is managed by Google. To use a different Google account, ask the owner to invite that email.
          </p>
        </section>
        <section className="panel panel-body">
          <p className="preview-label">What you can do</p>
          <ul className="ticks">
            {ABILITIES.filter((item) => can(member, item.permission)).map((item) => (
              <li key={item.permission}>{item.label}</li>
            ))}
          </ul>
          {!owner && <p className="hint-sm">Only the owner can change what you can do.</p>}
        </section>
      </div>
    </div>
  );
}
