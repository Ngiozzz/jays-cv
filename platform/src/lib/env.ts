import "server-only";
import { z } from "zod";

// Empty strings in .env.local mean "not set", so optional keys fall back to mock services
const optional = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url(),
  DEFAULT_TENANT_SLUG: z.string().min(1),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
  // File storage: without both, files are kept in a local folder (development only)
  SUPABASE_URL: optional,
  SUPABASE_SERVICE_ROLE_KEY: optional,
  // AI: without a key, AI features run in "pretend" mode and use no tokens
  ANTHROPIC_API_KEY: optional,
  // Each AI task uses the cheapest model that does it well (compared on real posters and CVs)
  ANTHROPIC_POSTER_MODEL: z.string().trim().min(1).default("claude-haiku-5-5"),
  ANTHROPIC_CV_CHECK_MODEL: z.string().trim().min(1).default("claude-sonnet-5-5"),
  ANTHROPIC_WRITER_MODEL: z.string().trim().min(1).default("claude-sonnet-5-5"),
  ANTHROPIC_REVIEW_MODEL: z.string().trim().min(1).default("claude-haiku-5-5"),
  // "on" keeps the pretend M-Pesa on a deployed test website (e.g. the Vercel preview shown to Jay),
  // with a "Test website" banner on every page. Never set it on the real website.
  MPESA_PRETEND: z.enum(["on", "off"]).default("off"),
  // Shared secret for the nightly tasks (Vercel Cron sends it automatically when set in Vercel)
  CRON_SECRET: optional,
});

function parseEnv() {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`);
    // Fail at start-up with every missing key listed, instead of failing later mid-request
    throw new Error(`Invalid environment variables (see .env.example):\n${problems.join("\n")}`);
  }
  return result.data;
}

export const env = parseEnv();

export const googleSignInConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
