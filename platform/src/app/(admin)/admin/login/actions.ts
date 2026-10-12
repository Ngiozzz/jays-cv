"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { SESSION_COOKIE, signedSessionValue } from "@/lib/session-cookie";
import { startTestOwnerSession } from "@/modules/team/test-sign-in.service";
import { getRequestTenant } from "@/modules/tenants/tenants.service";

export async function proceedForTesting() {
  const tenant = await getRequestTenant();
  const { token, expiresAt } = await startTestOwnerSession(tenant.id);
  (await cookies()).set(SESSION_COOKIE, signedSessionValue(token, env.BETTER_AUTH_SECRET), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  redirect("/admin");
}
