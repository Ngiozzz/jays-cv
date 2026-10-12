"use client";

import { useState, useTransition } from "react";
import { cancelInviteAction, removeMemberAction, setPausedAction } from "@/app/(admin)/admin/(signed-in)/team/actions";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/icons/Icon";
import { initialsOf, whatsappTo } from "@/modules/team/team.rules";
import type { TeamData, TeamInviteRow, TeamMemberRow } from "@/modules/team/team.service";
import { MemberDialog } from "./MemberDialog";

type Dialog = { mode: "invite" } | { mode: "edit"; member: TeamMemberRow } | null;

const sinceLabel = (iso: string | null) => {
  if (!iso) return "never";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};
const monthYear = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

export function TeamBoard({ data }: { data: TeamData }) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const writers = data.members.filter((m) => m.role === "WRITER");

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await action();
      setError(result.ok ? null : (result.error ?? "That didn't work. Please try again."));
    });

  return (
    <>
      <div className="stat-grid">
        <Stat icon="users" value={writers.filter((m) => m.status === "ACTIVE").length} label="Active writers" />
        <Stat icon="clock" value={writers.filter((m) => m.status === "PAUSED").length} label="Paused" muted />
        <Stat icon="send" value={data.invites.length} label="Invited, not joined yet" muted />
      </div>

      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Your team</h2>
            <p className="panel-sub">
              Who can sign in, what they can do and what they&apos;re paid. Only you see this page.
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setDialog({ mode: "invite" })}>
            Invite a writer
          </button>
        </div>
        <div className="table-wrap-admin">
          <table className="admin-table team-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Can</th>
                <th>Status</th>
                <th>Pay per CV</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  busy={pending}
                  onEdit={() => setDialog({ mode: "edit", member })}
                  onPause={(paused) => run(() => setPausedAction(member.id, paused))}
                  onRemove={() => {
                    if (
                      window.confirm(`Remove ${member.name} from the team? They won't be able to sign in any more.`)
                    ) {
                      run(() => removeMemberAction(member.id));
                    }
                  }}
                />
              ))}
              {data.invites.map((invite) => (
                <InviteRow
                  key={invite.id}
                  invite={invite}
                  busy={pending}
                  onCancel={() => {
                    if (window.confirm(`Cancel the invite for ${invite.name}?`))
                      run(() => cancelInviteAction(invite.id));
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="team-grid">
        <section className="panel panel-body">
          <p className="preview-label">How inviting works</p>
          <ol className="how-list">
            <li>You add their name, their Google email, WhatsApp number and what they can do.</li>
            <li>They get a message on WhatsApp and sign in with that Google account (the invite lasts 14 days).</li>
            <li>
              They can start straight away. You can pause or remove them at any time, and it takes effect at once.
            </li>
          </ol>
        </section>
        <section className="panel panel-body">
          <p className="preview-label">Only you can</p>
          <ul className="owner-list">
            <li>See money: prices, takings, M-Pesa payments, writer pay</li>
            <li>See the AI token balance</li>
            <li>Invite, pause and remove team members, and set their pay</li>
            <li>Change prices and everything on the website</li>
            <li>Reassign orders, extend deadlines and refund clients</li>
          </ul>
        </section>
      </div>

      {dialog && <MemberDialog {...dialog} onClose={() => setDialog(null)} />}
    </>
  );
}

function Stat({
  icon,
  value,
  label,
  muted,
}: {
  icon: "users" | "clock" | "send";
  value: number;
  label: string;
  muted?: boolean;
}) {
  return (
    <div className={muted ? "stat-card muted" : "stat-card"}>
      <span className="icon-box">
        <Icon name={icon} />
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function Abilities({ canWrite, canPostJobs, owner }: { canWrite: boolean; canPostJobs: boolean; owner?: boolean }) {
  if (owner) return <span className="can all">Everything</span>;
  if (!canWrite && !canPostJobs) return <span className="can none">Nothing yet</span>;
  return (
    <>
      {canWrite && <span className="can">Writes CVs</span>}
      {canPostJobs && <span className="can">Posts jobs</span>}
    </>
  );
}

function MemberRow(props: {
  member: TeamMemberRow;
  busy: boolean;
  onEdit: () => void;
  onPause: (paused: boolean) => void;
  onRemove: () => void;
}) {
  const { member } = props;
  const owner = member.role === "OWNER";
  const paused = member.status === "PAUSED";
  return (
    <tr className={owner ? "row-owner" : paused ? "row-paused" : undefined}>
      <td>
        <div className="member">
          <span className={owner ? "avatar owner" : "avatar"}>{initialsOf(member.name)}</span>
          <div>
            <strong>{member.name}</strong>
            <small>{[member.phone, member.email].filter(Boolean).join(" · ")}</small>
            <small>
              {owner ? "Owner" : `Joined ${monthYear(member.joinedAt)}`} · last seen {sinceLabel(member.lastSeenAt)}
            </small>
          </div>
        </div>
      </td>
      <td>
        <Abilities canWrite={member.canWrite} canPostJobs={member.canPostJobs} owner={owner} />
      </td>
      <td>
        <span className={owner ? "mstatus owner" : paused ? "mstatus paused" : "mstatus ok"}>
          {owner ? "Owner" : paused ? "Paused" : "Active"}
        </span>
      </td>
      <td>{owner || !member.canWrite ? "—" : `${member.payPercent}%`}</td>
      <td className="team-acts">
        {member.changeable ? (
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={props.onEdit} disabled={props.busy}>
              <Icon name="edit" />
              Edit
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => props.onPause(!paused)}
              disabled={props.busy}
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={props.onRemove} disabled={props.busy}>
              <Icon name="trash" />
              Remove
            </button>
          </>
        ) : (
          <small className="hint-sm">{owner ? "Can't be changed" : "That's you"}</small>
        )}
      </td>
    </tr>
  );
}

function InviteRow({ invite, busy, onCancel }: { invite: TeamInviteRow; busy: boolean; onCancel: () => void }) {
  return (
    <tr>
      <td>
        <div className="member">
          <span className="avatar">{initialsOf(invite.name)}</span>
          <div>
            <strong>{invite.name}</strong>
            <small>{[invite.phone, invite.email].filter(Boolean).join(" · ")}</small>
            <small>Invited {sinceLabel(invite.invitedAt)}</small>
          </div>
        </div>
      </td>
      <td>
        <Abilities canWrite={invite.canWrite} canPostJobs={invite.canPostJobs} owner={invite.owner} />
      </td>
      <td>
        <span className="mstatus invited">
          {invite.expired ? "Invite expired" : invite.owner ? "Owner, invited" : "Invited"}
        </span>
      </td>
      <td>{invite.canWrite && !invite.owner ? `${invite.payPercent}%` : "—"}</td>
      <td className="team-acts">
        {invite.phone && (
          <a
            className="btn btn-ghost btn-sm"
            href={whatsappTo(invite.phone, invite.message)}
            target="_blank"
            rel="noopener"
          >
            <Icon name="whatsapp" />
            Resend
          </a>
        )}
        <CopyButton text={invite.message} label="Copy message" className="btn btn-ghost btn-sm" />
        {!invite.owner && (
          <button type="button" className="btn btn-danger btn-sm" onClick={onCancel} disabled={busy}>
            <Icon name="x" />
            Cancel invite
          </button>
        )}
      </td>
    </tr>
  );
}
