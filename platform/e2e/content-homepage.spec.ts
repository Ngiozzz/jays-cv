import { expect, test } from "@playwright/test";
import { removeTestStaff, signInAs, snapshotHomepage } from "./staff";

let restoreHomepage: () => Promise<void>;

test.beforeAll(async () => {
  restoreHomepage = await snapshotHomepage();
});

test.afterAll(async () => {
  await restoreHomepage();
  await removeTestStaff();
});

test("the owner changes the headline and announcement, publishes, and undoes it", async ({ page, context }) => {
  // Works in the admin and on the website: allow for both pages compiling on a cold dev server
  test.slow();
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/content?tab=home");
  const highlight = await page.getByLabel(/Highlighted words/).inputValue();

  // The preview follows the typing
  await page.getByLabel(/Highlighted words/).fill("E2E hired.");
  await expect(page.locator(".home-prev")).toContainText("E2E hired.");

  // Turning the bar on without a message is refused
  await page.getByLabel("Show the announcement").check();
  await page.getByLabel("Message").fill("");
  await page.getByRole("button", { name: "Save & publish" }).click();
  await expect(page.getByText("Write the message, or untick Show the announcement")).toBeVisible();

  await page.getByLabel("Message").fill("E2E: open on Saturdays");
  await page.getByLabel(/^Link/).fill("/pricing");
  await page.getByRole("button", { name: "Save & publish" }).click();
  await expect(page.locator(".change-list")).toContainText("Homepage: changed the headline");

  const site = await context.newPage();
  await site.goto("/");
  await expect(site.locator(".hero h1")).toContainText("E2E hired.");
  await expect(site.locator("#announce")).toContainText("E2E: open on Saturdays");

  await page.getByRole("button", { name: /^Undo: Homepage: changed the headline/ }).click();
  await expect(page.getByRole("status")).toContainText("Undone");
  await expect(page.getByLabel(/Highlighted words/)).toHaveValue(highlight);
  await site.reload();
  await expect(site.locator(".hero h1")).toContainText(highlight);
  await expect(site.locator("body")).not.toContainText("E2E: open on Saturdays");
});
