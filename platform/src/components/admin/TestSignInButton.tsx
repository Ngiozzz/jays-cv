"use client";

import { useFormStatus } from "react-dom";
import { proceedForTesting } from "@/app/(admin)/admin/login/actions";
import type { TestPerson } from "@/modules/team/test-sign-in.service";

export function TestSignInButton({ person, label }: { person: TestPerson; label: string }) {
  return (
    <form action={proceedForTesting.bind(null, person)}>
      <SubmitButton label={label} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-ghost btn-lg btn-block" type="submit" disabled={pending}>
      {pending ? "Signing you in…" : label}
    </button>
  );
}
