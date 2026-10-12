import { expect, test } from "@playwright/test";
import { removeTestJobs, removeTestStaff, signInAs } from "./staff";

test.afterAll(async () => {
  await removeTestJobs("Poster test ");
  await removeTestStaff();
});

// Runs with no Claude key, so the AI is in "pretend" mode and fills in the Kilimall sample
test("a poster is read into the form, highlighted, and saved with the job", async ({ page, context }) => {
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/jobs/new");

  await page.getByLabel("Upload job poster").setInputFiles("e2e/fixtures/poster.png");
  await expect(page.getByAltText("Job poster")).toBeVisible();

  await page.getByRole("button", { name: "Read poster & fill in details" }).click();
  await expect(page.getByRole("status")).toContainText("Pretend mode");
  await expect(page.getByLabel("Company")).toHaveValue("Kilimall");
  await expect(page.getByLabel("Company")).toHaveClass(/ai-filled/);

  // Editing a field clears its highlight
  const title = `Poster test ${Date.now()}`;
  await page.getByLabel("Job title").fill(title);
  await expect(page.getByLabel("Job title")).not.toHaveClass(/ai-filled/);

  await page.getByRole("button", { name: "Publish job" }).click();
  await expect(page.getByRole("heading", { name: "Job published 🎉" })).toBeVisible();

  // The saved poster shows on the job's page and loads
  const poster = page.getByAltText("Job poster");
  await expect(poster).toBeVisible();
  expect(await poster.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete job" }).click();
  await expect(page).toHaveURL(/deleted=1/);
});
