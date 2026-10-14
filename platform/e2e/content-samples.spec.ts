import { expect, test } from "@playwright/test";
import { removeTestStaff, signInAs, snapshotSamples } from "./staff";

let restoreSamples: () => Promise<void>;

test.beforeAll(async () => {
  restoreSamples = await snapshotSamples();
});

test.afterAll(async () => {
  await restoreSamples();
  await removeTestStaff();
});

test("the owner adds a sample, publishes it, and it appears on the Samples page", async ({ page, context }) => {
  // Works in the admin and on the website: allow for both pages compiling on a cold dev server
  test.slow();
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/content?tab=samples");
  await page.getByText("Add a sample").click();

  // Both images are needed
  await page.getByLabel("Role", { exact: true }).last().fill("E2E Procurement Officer");
  await page.getByLabel("Result", { exact: true }).last().fill("Graduate → Shortlisted in 2 weeks");
  await page.getByRole("button", { name: "Add sample" }).click();
  await expect(page.getByText("Choose the image").first()).toBeVisible();

  await page.getByLabel(/CV before/).setInputFiles("e2e/fixtures/poster.png");
  await page.getByLabel(/CV after/).setInputFiles("e2e/fixtures/poster.png");
  await expect(page.getByAltText("Chosen after image")).toBeVisible();
  await page.getByRole("button", { name: "Add sample" }).click();
  await expect(page.locator(".change-list")).toContainText('added the "E2E Procurement Officer" sample');

  // Added unpublished: not on the website yet
  const card = page.locator(".sample-admin", {
    has: page.locator("input[value='E2E Procurement Officer']"),
  });
  await expect(card).toHaveClass(/off/);
  await card.getByLabel("Published").check();
  await page.getByRole("button", { name: "Save & publish samples" }).click();
  await expect(page.locator(".change-list")).toContainText("E2E Procurement Officer published");

  const site = await context.newPage();
  await site.goto("/samples");
  const figure = site.locator("figure", { hasText: "E2E Procurement Officer" });
  await expect(figure).toBeVisible();
  await expect(figure.locator("img").first()).toHaveJSProperty("complete", true);
  expect(
    await figure
      .locator("img")
      .first()
      .evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
});

test("the owner reorders samples and undoes it", async ({ page, context }) => {
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/content?tab=samples");
  const firstRole = await page.locator(".sample-admin input[name^='role-']").first().inputValue();

  await page.getByRole("button", { name: `Move ${firstRole} later` }).click();
  await expect(page.locator(".change-list")).toContainText(`moved "${firstRole}" later`);
  await expect(page.locator(".sample-admin input[name^='role-']").nth(1)).toHaveValue(firstRole);

  await page.getByRole("button", { name: `Undo: moved "${firstRole}" later` }).click();
  await expect(page.getByRole("status")).toContainText("Undone");
  await expect(page.locator(".sample-admin input[name^='role-']").first()).toHaveValue(firstRole);
});

test("a wrong edit is refused next to the field", async ({ page, context }) => {
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/content?tab=samples");
  await page.locator(".sample-admin input[name^='role-']").first().fill("");
  await page.getByRole("button", { name: "Save & publish samples" }).click();
  await expect(page.getByText("Enter the job title")).toBeVisible();
});
