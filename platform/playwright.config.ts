import { defineConfig, devices } from "@playwright/test";

// Key journeys in a real browser. Uses the dev database from .env.local and seeded content (npm run db:seed).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // One browser at a time: the dev server compiles pages on demand and the dev database is remote,
  // so parallel runs time out without anything being wrong
  workers: 1,
  // The dev server compiles each page on its first visit, which can take several seconds
  expect: { timeout: 20_000 },
  timeout: 60_000,
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
