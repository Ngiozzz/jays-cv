import { defineConfig, devices } from "@playwright/test";

// Key journeys in a real browser. Uses the dev database from .env.local and seeded content (npm run db:seed).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // The dev server compiles each page on its first visit, which can take several seconds
  expect: { timeout: 15_000 },
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
