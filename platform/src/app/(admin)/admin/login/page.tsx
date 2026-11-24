import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GoogleSignInButton } from "@/components/admin/GoogleSignInButton";
import { TestSignInButton } from "@/components/admin/TestSignInButton";
import { Icon } from "@/components/icons/Icon";
import { StageTrack } from "@/components/site/StageTrack";
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

// Three orders on the desk, drawn in code: the work this area is for
const SHEETS = [
  { ref: "JC-1052", who: "Ann Chebet", what: "Professional", writer: "Grace", when: "Due in 3h", at: 2 },
  { ref: "JC-1046", who: "Dr. Amina Hassan", what: "Executive", writer: "Jay", when: "Due in 15h", at: 1 },
  { ref: "JC-1048", who: "Faith Njeri", what: "Professional", writer: "Nobody yet", when: "Paid", at: 0 },
];

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <div className="signin-page">
      <aside className="signin-brand">
        <Link href="/" className="signin-logo" aria-label="Jay CVS website">
          <span className="logo-mark">J</span>
          <span className="admin-word">
            Jay <span>CVS</span>
          </span>
          <small>Team area</small>
        </Link>
        <div className="signin-pitch">
          <div>
            <h2>
              Where the team <span>gets the work done</span>
            </h2>
            <ul className="signin-points">
              {TEAM_AREA.map((point, i) => (
                <li key={point} className={i === 0 ? "now" : undefined}>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="signin-desk" aria-hidden="true">
            {SHEETS.map((sheet) => (
              <div key={sheet.ref} className="signin-sheet">
                <span className="ref">{sheet.ref}</span>
                <b>{sheet.who}</b>
                <span className="signin-sheet-pk">{sheet.what}</span>
                <i className="signin-sheet-line" />
                <span className="signin-sheet-foot">
                  <span>{sheet.writer}</span>
                  <span>{sheet.when}</span>
                </span>
                <StageTrack of={5} at={sheet.at} />
              </div>
            ))}
          </div>
        </div>
        <p className="signin-small">
          Not on the team? <Link href="/">Go to the Jay CVS website</Link>
        </p>
      </aside>

      <main className="signin-card">
        <h1>Welcome back</h1>
        <p className="signin-lead">Sign in with the Google account your Jay CVS invite was sent to.</p>
        <Suspense>
          <SignInOptions searchParams={searchParams} />
        </Suspense>
        <p className="signin-note">
          <Icon name="lock" />
          Invite only. Every sign-in is checked.
        </p>
      </main>
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
          <p className="signin-divider">For testing on this computer</p>
          <TestSignInButton
            person="owner"
            label="Proceed as Jay (owner)"
            name="Jay"
            role="Owner · sees everything"
            initials="JA"
          />
          <TestSignInButton
            person="writer"
            label="Proceed as Mary (writer)"
            name="Mary"
            role="Writer · orders and jobs"
            initials="MK"
          />
          <p className="login-note">
            Signs you in as a test owner or a test writer. Only available while developing, never live.
          </p>
        </div>
      )}
    </div>
  );
}
