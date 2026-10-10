import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Secrets live in .env.local (never committed), the same file Next.js reads
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations use the direct connection; the app uses the pooled DATABASE_URL
    url: env("DIRECT_URL"),
  },
});
