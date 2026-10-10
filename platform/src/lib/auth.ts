import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { acceptPendingInvites, isInvited, mayStartSession } from "@/modules/team/sign-in.service";
import { db } from "./db";
import { env } from "./env";

// Staff sign in with Google only. Clients never sign in: they use a private tracking link.
export const auth = betterAuth({
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: false },
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            prompt: "select_account",
          },
        }
      : {},
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!(await isInvited(user.email))) {
            throw new APIError("FORBIDDEN", { code: "not_invited", message: "This email has not been invited" });
          }
        },
        after: async (user) => {
          await acceptPendingInvites(user);
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          if (!(await mayStartSession(session.userId))) {
            throw new APIError("FORBIDDEN", { code: "no_access", message: "No active membership" });
          }
        },
      },
    },
  },
  // Must be last: lets server actions set the session cookie
  plugins: [nextCookies()],
});
