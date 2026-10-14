import { expect, test } from "@playwright/test";
import { removeTestStaff, signInAs, snapshotSettings } from "./staff";

let restoreSettings: () => Promise<void>;

test.beforeAll(async () => {
  restoreSettings = await snapshotSettings();
});

test.afterAll(async () => {
  await restoreSettings();
  await removeTestStaff();
});

test("the owner changes the WhatsApp number, the website follows, and undo puts it back", async ({ page, context }) => {
  // Works in the admin and on the website: allow for both pages compiling on a cold dev server
  test.slow();
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/content?tab=settings");
  const whatsapp = page.getByLabel("WhatsApp number", { exact: true });
  const oldNumber = await whatsapp.inputValue();

  // A wrong number and a link to another site are refused
  await whatsapp.fill("0725 912");
  await page.getByLabel("Facebook").fill("https://evil.example/facebook.com");
  await page.getByRole("button", { name: "Save & publish settings" }).click();
  await expect(page.getByText("Enter a Kenyan mobile number, e.g. 0712 345 678")).toBeVisible();
  await expect(page.getByText("Paste the full link, e.g. https://facebook.com/…")).toBeVisible();

  await whatsapp.fill("0711 222 333");
  await page.getByLabel("Facebook").fill("");
  await page.getByRole("button", { name: "Save & publish settings" }).click();
  await expect(page.locator(".change-list")).toContainText("WhatsApp number");

  const site = await context.newPage();
  await site.goto("/");
  await expect(site.locator('a[href*="wa.me/254711222333"]').first()).toBeAttached();

  await page.getByRole("button", { name: /^Undo: Settings: WhatsApp number/ }).click();
  await expect(page.getByRole("status")).toContainText("Undone");
  await expect(page.getByLabel("WhatsApp number", { exact: true })).toHaveValue(oldNumber);
  await site.reload();
  await expect(site.locator('a[href*="wa.me/254711222333"]')).toHaveCount(0);
});
