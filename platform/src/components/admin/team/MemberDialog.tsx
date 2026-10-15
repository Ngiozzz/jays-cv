"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { inviteMemberAction, updateMemberAction } from "@/app/(admin)/admin/(signed-in)/team/actions";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/icons/Icon";
import { whatsappTo } from "@/modules/team/team.rules";
import type { TeamInviteRow, TeamMemberRow } from "@/modules/team/team.service";

type Props =
  | { mode: "invite"; member?: undefined; onClose: () => void }
  | { mode: "edit"; member: TeamMemberRow; onClose: () => void };

// One dialog for both "Invite a writer" and "Edit": what they can do and what they're paid
export function MemberDialog({ mode, member, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<TeamInviteRow | null>(null);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    if (mode === "invite") {
      const result = await inviteMemberAction(data);
      setBusy(false);
      if (result.ok) setSent(result.invite);
      else setErrors(result.fieldErrors);
      return;
    }
    const result = await updateMemberAction(member.id, data);
    setBusy(false);
    if (result.ok) dialog.current?.close();
    else setErrors(result.fieldErrors);
  };

  const error = (name: string) =>
    errors[name] && (
      <small className="field-error" role="alert">
        {errors[name]}
      </small>
    );

  return (
    <dialog ref={dialog} className="admin-dialog" onClose={onClose} aria-labelledby="member-dialog-title">
      {sent ? (
        <InviteReady invite={sent} onDone={() => dialog.current?.close()} />
      ) : (
        <form className="dialog-body member-form" noValidate onSubmit={submit}>
          <h2 id="member-dialog-title">{mode === "invite" ? "Invite a writer" : `Edit ${member.name}`}</h2>
          <p>
            {mode === "invite"
              ? "They join by signing in with Google, using the email you enter here."
              : "Change what they can do and what they're paid. It applies from now on."}
          </p>
          {mode === "invite" && (
            <div className="fgrid">
              <div className={errors.name ? "f invalid" : "f"}>
                <label htmlFor="mi-name">
                  Name <em>*</em>
                </label>
                <input id="mi-name" name="name" autoComplete="off" placeholder="e.g. Wanjiku Kamau" />
                {error("name")}
              </div>
              <div className={errors.phone ? "f invalid" : "f"}>
                <label htmlFor="mi-phone">WhatsApp number</label>
                <input id="mi-phone" name="phone" type="tel" placeholder="07XX XXX XXX" />
                {error("phone")}
              </div>
              <div className={errors.email ? "f full invalid" : "f full"}>
                <label htmlFor="mi-email">
                  Google email <em>*</em>
                </label>
                <input id="mi-email" name="email" type="email" placeholder="name@gmail.com" />
                <small>The invite only works for this Google account.</small>
                {error("email")}
              </div>
            </div>
          )}
          <fieldset className="perm">
            <legend>What can they do?</legend>
            <label>
              <input type="checkbox" name="canWrite" defaultChecked={mode === "invite" || member.canWrite} />
              <span>
                <b>Write CVs</b>
                <small>Accept paid orders and work on the ones they accept</small>
              </span>
            </label>
            <label>
              <input type="checkbox" name="canPostJobs" defaultChecked={mode === "edit" && member.canPostJobs} />
              <span>
                <b>Post jobs</b>
                <small>Post and edit job adverts, Bulk post jobs, company logos</small>
              </span>
            </label>
            <p className="perm-note">
              <Icon name="lock" />
              Money, the team, prices and website settings stay with you.
            </p>
          </fieldset>
          <div className={errors.payPercent ? "f invalid" : "f"}>
            <label htmlFor="mi-rate">Pay per CV (% of the order price)</label>
            <input
              id="mi-rate"
              name="payPercent"
              type="number"
              min={0}
              max={100}
              step={5}
              defaultValue={mode === "edit" ? member.payPercent : 40}
            />
            <small>Only you see this. E.g. 40% of a KES 3,000 order = KES 1,200.</small>
            {error("payPercent")}
          </div>
          {errors.form && (
            <p className="field-error" role="alert">
              {errors.form}
            </p>
          )}
          <div className="dialog-actions">
            <button type="button" className="btn btn-ghost" onClick={() => dialog.current?.close()}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : mode === "invite" ? "Create invite" : "Save"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}

function InviteReady({ invite, onDone }: { invite: TeamInviteRow; onDone: () => void }) {
  return (
    <div className="dialog-body">
      <div className="dialog-icon">
        <Icon name="check" />
      </div>
      <h2>Invite ready for {invite.name}</h2>
      <p>
        Send it on WhatsApp. Until they sign in with <b>{invite.email}</b>, they show as &ldquo;Invited&rdquo; on your
        team list.
      </p>
      <pre className="wa-text">{invite.message}</pre>
      <div className="dialog-actions">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Done
        </button>
        <CopyButton text={invite.message} label="Copy message" className="btn btn-ghost" />
        {invite.phone && (
          <a className="btn btn-wa" href={whatsappTo(invite.phone, invite.message)} target="_blank" rel="noopener">
            <Icon name="whatsapp" />
            Send on WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
