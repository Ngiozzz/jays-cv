import { expect, test } from "@playwright/test";
import { removeTestStaff, signInAs, snapshotPrices } from "./staff";

let restorePrices: () => Promise<void>;

test.beforeAll(async () => {
  restorePrices = await snapshotPrices();
});

test.afterAll(async () => {
  await restorePrices();
  await removeTestStaff();
});

test("the owner changes a package price, sees it on the website, then undoes it", async ({ page, context }) => {
  // Works in the admin and on the website: allow for both pages compiling on a cold dev server
  test.slow();
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/content?tab=packages");
  await page.getByRole("link", { name: "Edit Basic CV" }).click();
  await expect(page.getByRole("heading", { name: "Edit: Basic CV" })).toBeVisible();

  // The live preview follows the form before saving
  await page.getByLabel("Price (KES)").fill("1750");
  await expect(page.locator(".preview-col .price")).toContainText("1,750");

  await page.getByLabel("Price (KES)").fill("");
  await page.getByRole("button", { name: "Save & publish", exact: true }).click();
  await expect(page.getByText("Enter a price")).toBeVisible();

  await page.getByLabel("Price (KES)").fill("1750");
  await page.getByRole("button", { name: "Save & publish", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Basic CV: price 1,500 → 1,750");
  await expect(page.locator(".change-list")).toContainText("Basic CV: price 1,500 → 1,750");

  // Live on the website straight away
  const site = await context.newPage();
  await site.goto("/pricing");
  await expect(site.locator(".price-card", { hasText: "Basic CV" }).locator(".price")).toContainText("1,750");

  // Undo puts the old price back, on the website too
  await page.getByRole("button", { name: "Undo: Basic CV: price 1,500 → 1,750" }).click();
  await expect(page.getByRole("status")).toContainText("Undone");
  await expect(page.getByLabel("Price (KES)")).toHaveValue("1500");
  await site.reload();
  await expect(site.locator(".price-card", { hasText: "Basic CV" }).locator(".price")).toContainText("1,500");
});

test("the owner changes a single service price, and a wrong price is refused", async ({ page, context }) => {
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/content?tab=packages");
  await page.getByLabel("Cover letter price").fill("950");
  await page.getByRole("button", { name: "Save & publish services" }).click();
  await expect(page.getByRole("status")).toContainText("Cover letter 800 → 950");
  // The refreshed screen (history and forms) arrives together
  await expect(page.locator(".change-list")).toContainText("Cover letter 800 → 950");
  await expect(page.getByLabel("Cover letter price")).toHaveValue("950");

  await page.getByLabel("Mock interview price").fill("abc");
  await page.getByRole("button", { name: "Save & publish services" }).click();
  await expect(page.getByText("Enter a price")).toBeVisible();
});

test("a writer only gets Career tips, not prices", async ({ page, context }) => {
  await signInAs(context, "WRITER", "Grace Test");
  await page.goto("/admin/content?tab=packages");
  await expect(page.getByRole("link", { name: "Career tips" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Packages & prices" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Recent changes" })).toHaveCount(0);
});
