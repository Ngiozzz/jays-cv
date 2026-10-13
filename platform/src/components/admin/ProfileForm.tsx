"use client";

import { useState, type FormEvent } from "react";
import { updateProfileAction } from "@/app/(admin)/admin/(signed-in)/profile/actions";

type Props = { firstName: string; lastName: string; nickname: string; email: string; phone: string };

type FieldProps = {
  id: string;
  name: string;
  label: string;
  hint: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

function Field({ id, name, label, hint, error, ...input }: FieldProps) {
  return (
    <div className={error ? "f invalid" : "f"}>
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} {...input} />
      <small>{hint}</small>
      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

export function ProfileForm({ firstName, lastName, nickname, email, phone }: Props) {
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
      <Field
        id="pf-first"
        name="firstName"
        label="First name"
        hint="As on your ID."
        error={errors.firstName}
        type="text"
        defaultValue={firstName}
        autoComplete="given-name"
      />
      <Field
        id="pf-last"
        name="lastName"
        label="Last name"
        hint="As on your ID."
        error={errors.lastName}
        type="text"
        defaultValue={lastName}
        autoComplete="family-name"
      />
      <Field
        id="pf-nick"
        name="nickname"
        label="Nickname (optional)"
        hint="Shown to the team instead of your full name."
        error={errors.nickname}
        type="text"
        defaultValue={nickname}
        autoComplete="nickname"
      />
      <Field
        id="pf-email"
        name="email"
        label="Email"
        hint="Your Google sign-in. Ask the owner to invite a different email to change it."
        type="email"
        defaultValue={email}
        readOnly
      />
      <Field
        id="pf-phone"
        name="phone"
        label="Phone number"
        hint="Your WhatsApp number, so the team can reach you."
        error={errors.phone}
        type="tel"
        defaultValue={phone}
        placeholder="07XX XXX XXX"
        autoComplete="tel"
      />
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
