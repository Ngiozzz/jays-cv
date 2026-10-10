import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GoogleSignInButton } from "@/components/admin/GoogleSignInButton";
import { googleSignInConfigured } from "@/lib/env";
import { isSignedInMember } from "@/modules/team/current-member";

export const metadata: Metadata = { title: "Sign in" };

// Messages for the ?error= codes set by the sign-in hooks (src/lib/auth.ts) and the admin guard
const ERRORS: Record<string, string> = {
  not_invited: "This Google account hasn't been invited. Ask the owner to invite your email address, then try again.",
  no_access: "Your access to this business is paused or has ended. Contact the owner if you think this is a mistake.",
};
const FALLBACK_ERROR = "Sign-in didn't work. Please try again.";

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <div className="login-page">
      <main className="login-card">
        <Link href="/" className="logo" aria-label="Jay CVS website">
          <span className="logo-mark">J</span>
          <span className="logo-text">
            Jay<strong>CVS</strong>
          </span>
        </Link>
        <h1>Admin sign in</h1>
        <p>For the Jay CVS team. Sign in with the Google account your invite was sent to.</p>
        <Suspense>
          <SignInState searchParams={searchParams} />
        </Suspense>
      </main>
      <Link className="login-back" href="/">
        ← Back to website
      </Link>
    </div>
  );
}

async function SignInState({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  const { error } = await searchParams;
  // A paused member still has a session cookie; let them see why instead of bouncing back
  if (!error && (await isSignedInMember())) redirect("/admin");
  const message = typeof error === "string" ? (ERRORS[error] ?? FALLBACK_ERROR) : null;

  return (
    <>
      {message && (
        <p className="od-error" role="alert">
          {message}
        </p>
      )}
      {googleSignInConfigured ? (
        <GoogleSignInButton />
      ) : (
        <p className="login-note">
          Google sign-in isn&apos;t set up yet: add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local.
        </p>
      )}
      <p className="login-note">Only invited team members can sign in.</p>
    </>
  );
}
