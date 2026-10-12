import { expect, test } from "@playwright/test";
import { removeTestJobs, removeTestStaff, signInAs } from "./staff";

test.afterAll(async () => {
  await removeTestJobs("Test Accountant ");
  await removeTestStaff();
});

const title = `Test Accountant ${Date.now()}`;

test("post a job: missing details are flagged, then it publishes and can be managed", async ({ page, context }) => {
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/jobs/new");

  // Publishing with only a title lists what's missing, and keeps what was typed
  await page.getByLabel("Job title").fill(title);
  await page.getByRole("button", { name: "Publish job" }).click();
  await expect(page.getByText("Please fix the highlighted fields.")).toBeVisible();
  await expect(page.getByText("Add the company")).toBeVisible();
  await expect(page.getByLabel("Job title")).toHaveValue(title);

  // Fill in the rest; the live preview follows
  await page.getByLabel("Company").fill("Savanna Foods");
  await page.getByLabel("Location").fill("Nairobi");
  await expect(page.locator(".job-card")).toContainText("Savanna Foods");
  await page.getByLabel("Open until filled").check();
  await page.getByLabel("Send applications to").fill("jobs@savanna.example");
  await page.getByRole("button", { name: "Publish job" }).click();

  // Published: the WhatsApp channel post is ready to copy
  await expect(page.getByRole("heading", { name: "Job published 🎉" })).toBeVisible();
  await expect(page.getByLabel("WhatsApp channel post")).toHaveValue(/SAVANNA FOODS|Savanna Foods/);
  await expect(page.getByLabel("WhatsApp channel post")).toHaveValue(/jobs@savanna\.example/);

  // In the list, under Published
  await page.goto("/admin/jobs?status=published");
  const row = page.getByRole("row", { name: new RegExp(title) });
  await expect(row).toBeVisible();

  // Move to drafts, then delete
  await row.getByTitle("Move to drafts").click();
  // It leaves the Published tab once saved
  await expect(row).toHaveCount(0);
  await page.goto("/admin/jobs?status=draft");
  await expect(page.getByRole("row", { name: new RegExp(title) })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("row", { name: new RegExp(title) })
    .getByTitle("Delete")
    .click();
  await expect(page.getByRole("row", { name: new RegExp(title) })).toHaveCount(0);
});

test("a writer without the 'post jobs' switch can't open the jobs screens", async ({ page, context }) => {
  await signInAs(context, "WRITER", "Grace Test");
  await page.goto("/admin");
  await expect(page.getByRole("complementary", { name: "Admin menu" }).getByText("Post a job")).toHaveCount(0);
  await page.goto("/admin/jobs/new");
  await expect(page.getByRole("heading", { name: "You don't have access to jobs" })).toBeVisible();
});
