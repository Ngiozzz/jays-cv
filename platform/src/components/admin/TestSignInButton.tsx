"use client";

import { useFormStatus } from "react-dom";
import { proceedForTesting } from "@/app/(admin)/admin/login/actions";

export function TestSignInButton() {
  return (
    <form action={proceedForTesting}>
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-ghost btn-lg btn-block" type="submit" disabled={pending}>
      {pending ? "Signing you in…" : "Proceed for testing"}
    </button>
  );
}
