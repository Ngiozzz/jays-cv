"use client";

import { useState, type FormEvent } from "react";
import { updateProfileAction } from "@/app/(admin)/admin/(signed-in)/profile/actions";

type Props = { name: string; phone: string };

export function ProfileForm({ name, phone }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    const result = await updateProfileAction(new FormData(event.currentTarget));
    setBusy(false);
    if (result.ok) {
      setErrors({});
      setSaved(true);
    } else setErrors(result.fieldErrors);
  };

  return (
    <form className="fgrid" noValidate onSubmit={submit}>
      <div className={errors.displayName ? "f invalid" : "f"}>
        <label htmlFor="pf-name">Your name</label>
        <input id="pf-name" type="text" name="displayName" defaultValue={name} autoComplete="name" />
        <small>Shown to the team, and in each order&apos;s history.</small>
        {errors.displayName && (
          <small className="field-error" role="alert">
            {errors.displayName}
          </small>
        )}
      </div>
      <div className={errors.phone ? "f invalid" : "f"}>
        <label htmlFor="pf-phone">WhatsApp number</label>
        <input id="pf-phone" name="phone" type="tel" defaultValue={phone} placeholder="07XX XXX XXX" />
        <small>So the team can reach you.</small>
        {errors.phone && (
          <small className="field-error" role="alert">
            {errors.phone}
          </small>
        )}
      </div>
      <div className="f full profile-save">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
        {saved && (
          <span className="saved-note" role="status">
            Saved.
          </span>
        )}
      </div>
    </form>
  );
}
