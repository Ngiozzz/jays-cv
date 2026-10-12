import Link from "next/link";
import { Icon } from "@/components/icons/Icon";

// Shown when someone opens a screen their role doesn't include (the server refuses the actions too)
export function NotAllowed({ what }: { what: string }) {
  return (
    <section className="panel lock-page">
      <Icon name="lock" />
      <h2>You don&apos;t have access to {what}</h2>
      <p>Ask the owner if you need it.</p>
      <Link className="btn btn-ghost" href="/admin">
        Back to the dashboard
      </Link>
    </section>
  );
}
