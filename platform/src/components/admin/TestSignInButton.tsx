"use client";

import { useFormStatus } from "react-dom";
import { proceedForTesting } from "@/app/(admin)/admin/login/actions";
import type { TestPerson } from "@/modules/team/test-sign-in.service";

type Props = { person: TestPerson; label: string; name: string; role: string; initials: string };

// One test person as a row: who they are and what they see, then straight in
export function TestSignInButton({ person, label, name, role, initials }: Props) {
  return (
    <form action={proceedForTesting.bind(null, person)}>
      <Row label={label} name={name} role={role} initials={initials} owner={person === "owner"} />
    </form>
  );
}

function Row({ label, name, role, initials, owner }: Omit<Props, "person"> & { owner: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="signin-person" type="submit" disabled={pending} aria-label={label}>
      <span className={owner ? "avatar dark" : "avatar"} aria-hidden="true">
        {initials}
      </span>
      <span className="signin-person-text">
        <b>{name}</b>
        <small>{pending ? "Signing you in" : role}</small>
      </span>
      <span className="signin-go" aria-hidden="true">
        →
      </span>
    </button>
  );
}
