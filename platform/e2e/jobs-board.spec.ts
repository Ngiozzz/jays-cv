import { expect, test, type Page } from "@playwright/test";
import { removeTestJobs, removeTestStaff, signInAs } from "./staff";

test.afterAll(async () => {
  await removeTestJobs("Board Test Accountant ");
  await removeTestStaff();
});

const title = `Board Test Accountant ${Date.now()}`;

async function publishJob(page: Page) {
  await page.goto("/admin/jobs/new");
  await page.getByLabel("Job title").fill(title);
  await page.getByLabel("Company").fill("Savanna Foods");
  await page.getByLabel("Location").fill("Kisumu");
  await page.getByLabel("Category").selectOption("Finance & Accounting");
  await page.getByLabel("About the role").fill("Keep the books for a growing food company.");
  await page.getByLabel("Open until filled").check();
  await page.getByLabel("Send applications to").fill("jobs@savanna.example");
  await page.getByRole("button", { name: "Publish job" }).click();
  await expect(page.getByRole("heading", { name: "Job published 🎉" })).toBeVisible();
}

test("a published job appears on the website, and leaves it when unpublished", async ({ page, context }) => {
  await signInAs(context, "OWNER", "Jay Test");
  await publishJob(page);

  // Homepage: in the latest jobs
  await page.goto("/");
  await expect(page.locator("#jobs").getByRole("link", { name: title })).toBeVisible();

  // Find a job: listed, searchable, and filtered by a shared link
  await page.goto("/jobs");
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  await page.getByPlaceholder("Job title, company or keyword").fill("savanna");
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  await page.getByPlaceholder("Job title, company or keyword").fill("no-such-job-xyz");
  await expect(page.getByText("No jobs match your search")).toBeVisible();
  await page.goto("/jobs?q=savanna");
  // While the page loads, the plain list briefly sits next to the version that reads the address
  await expect(page.getByPlaceholder("Job title, company or keyword").filter({ visible: true })).toHaveValue("savanna");

  // The job's own page: details, how to apply, and the data Google reads
  await page.getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.locator("#how-to-apply")).toContainText("jobs@savanna.example");
  await expect(page.getByRole("link", { name: "Open in my email app" })).toHaveAttribute("href", /^mailto:/);
  const googleData = await page.locator('script[type="application/ld+json"]').textContent();
  expect(JSON.parse(googleData ?? "{}")).toMatchObject({ "@type": "JobPosting", title });
  const jobUrl = page.url();

  // Unpublish in the admin: it leaves the board straight away
  await page.goto("/admin/jobs?status=published");
  const row = page.getByRole("row", { name: new RegExp(title) });
  await row.getByTitle("Move to drafts").click();
  await expect(row).toHaveCount(0);
  await page.goto("/jobs");
  await expect(page.getByRole("link", { name: title })).toHaveCount(0);
  const response = await page.goto(jobUrl);
  expect(response?.status()).toBe(404);

  // Clean up
  await page.goto("/admin/jobs?status=draft");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("row", { name: new RegExp(title) })
    .getByTitle("Delete")
    .click();
  await expect(page.getByRole("row", { name: new RegExp(title) })).toHaveCount(0);
});
