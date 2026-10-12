import { expect, test } from "@playwright/test";
import { removeTestCompanies, removeTestJobs, removeTestStaff, signInAs } from "./staff";

const run = Date.now();
const company = `Logo Test Co ${run}`;
const title = `Logo test job ${run}`;

test.afterAll(async () => {
  await removeTestJobs("Logo test job ");
  await removeTestCompanies("Logo Test Co ");
  await removeTestStaff();
});

test("a logo added while posting shows on the website and is remembered for the company", async ({ page, context }) => {
  await signInAs(context, "OWNER", "Jay Test");
  // Wait until the form is interactive before choosing files
  await page.goto("/admin/jobs/new", { waitUntil: "networkidle" });
  await page.getByLabel("Job title").fill(title);
  await page.getByLabel("Company").fill(company);
  await page.getByLabel("Location").fill("Nairobi");
  await page.getByLabel("Open until filled").check();
  await page.getByLabel("Send applications to").fill("jobs@logo.example");
  await page.getByLabel("Logo image").setInputFiles("e2e/fixtures/poster.png");
  await expect(page.getByText("New logo: saved with the job")).toBeVisible();
  await page.getByRole("button", { name: "Publish job" }).click();
  await expect(page.getByRole("heading", { name: "Job published 🎉" })).toBeVisible();

  // On the jobs board, the card shows the logo instead of initials
  await page.goto("/jobs");
  const card = page.locator(".job-card", { hasText: title }).filter({ visible: true });
  await expect(card.locator(".job-logo.has-logo img")).toBeVisible();

  // A new job for the same company picks the saved logo up by itself
  // Wait until the form is interactive before choosing files
  await page.goto("/admin/jobs/new", { waitUntil: "networkidle" });
  await page.getByLabel("Company").fill(company.toUpperCase());
  await expect(page.getByText(`Saved logo for ${company}.`)).toBeVisible();

  // The Company logos screen lists it; removing the logo brings the initials back
  await page.goto("/admin/companies");
  const row = page.getByRole("row", { name: new RegExp(company) });
  await expect(row.getByText("Has logo")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "Remove" }).click();
  await expect(row.getByText("Initials")).toBeVisible();
});
