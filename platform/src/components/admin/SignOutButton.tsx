"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    await authClient.signOut();
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <button type="button" onClick={signOut} disabled={busy}>
      <Icon name="logout" />
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
