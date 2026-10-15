import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GoogleSignInButton } from "@/components/admin/GoogleSignInButton";
import { TestSignInButton } from "@/components/admin/TestSignInButton";
import { Icon } from "@/components/icons/Icon";
import { googleSignInConfigured } from "@/lib/env";
import { isSignedInMember } from "@/modules/team/current-member";
import { testSignInEnabled } from "@/modules/team/test-sign-in.service";

export const metadata: Metadata = { title: "Sign in" };

// Messages for the ?error= codes set by the sign-in hooks (src/lib/auth.ts) and the admin guard
const ERRORS: Record<string, string> = {
  not_invited: "This Google account hasn't been invited. Ask the owner to invite your email address, then try again.",
  no_access: "Your access to this business is paused or has ended. Contact the owner if you think this is a mistake.",
};
const FALLBACK_ERROR = "Sign-in didn't work. Please try again.";

const TEAM_AREA = ["Accept and write CV orders", "Post jobs for 57,000+ job seekers", "Keep the website up to date"];

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <div className="signin-page">
      <div className="signin-shell">
        <aside className="signin-brand">
          <Link href="/" className="logo logo-light" aria-label="Jay CVS website">
            <span className="logo-mark">J</span>
            <span className="logo-text">
              Jay<strong>CVS</strong>
            </span>
          </Link>
          <div>
            <p className="signin-eyebrow">Team area</p>
            <h2>
              Where Jay CVS <span>gets the work done.</span>
            </h2>
            <ul className="signin-points">
              {TEAM_AREA.map((point) => (
                <li key={point}>
                  <Icon name="check" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <p className="signin-small">
            <Icon name="lock" /> Invite only. Every sign-in is checked.
          </p>
        </aside>

        <main className="signin-card">
          <h1>Welcome back</h1>
          <p className="signin-lead">Sign in with the Google account your Jay CVS invite was sent to.</p>
          <Suspense>
            <SignInOptions searchParams={searchParams} />
          </Suspense>
        </main>
      </div>
      <Link className="login-back" href="/">
        ← Back to the Jay CVS website
      </Link>
    </div>
  );
}

async function SignInOptions({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  const { error } = await searchParams;
  // A paused member still has a session cookie; let them see why instead of bouncing back
  if (!error && (await isSignedInMember())) redirect("/admin");
  const message = typeof error === "string" ? (ERRORS[error] ?? FALLBACK_ERROR) : null;

  return (
    <div className="signin-options">
      {message && (
        <p className="od-error" role="alert">
          {message}
        </p>
      )}
      <GoogleSignInButton available={googleSignInConfigured} />
      {!googleSignInConfigured && <p className="login-note">Google sign-in switches on once its keys are added.</p>}
      {testSignInEnabled && (
        <div className="signin-test">
          <span className="signin-divider">For testing on this computer</span>
          <TestSignInButton person="owner" label="Proceed as Jay (owner)" />
          <TestSignInButton person="writer" label="Proceed as Mary (writer)" />
          <p className="login-note">
            Signs you in as a test owner or a test writer. Only available while developing, never live.
          </p>
        </div>
      )}
    </div>
  );
}
