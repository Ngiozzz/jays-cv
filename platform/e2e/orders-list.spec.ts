import { expect, test } from "@playwright/test";
import { createTrackedOrder, removeTestStaff, signInAs } from "./staff";

let order: Awaited<ReturnType<typeof createTrackedOrder>>;

test.beforeAll(async () => {
  order = await createTrackedOrder("DRAFT_SENT");
});

test.afterAll(async () => {
  await order.remove();
  await removeTestStaff();
});

test("the owner sees every order with money, and filters it", async ({ page, context }) => {
  test.slow();
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/orders");
  const row = page.locator("tr", { has: page.getByRole("link", { name: order.ref, exact: true }) });
  await expect(row).toContainText("KES 3,500");
  await expect(row).toContainText(order.phone);
  await expect(page.getByRole("link", { name: /Paid this month/ })).toBeVisible();
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/orders-owner.png`, fullPage: true });

  // A tab and a search narrow the list, and the address keeps the view
  await page.getByRole("link", { name: /^Draft sent/ }).click();
  await expect(page).toHaveURL(/status=draft/);
  await page.getByRole("searchbox", { name: "Search orders" }).fill(order.ref);
  await page.getByRole("searchbox", { name: "Search orders" }).press("Enter");
  await expect(page).toHaveURL(/status=draft.*q=/);
  await expect(page.locator(".orders-table tbody tr")).toHaveCount(1);
  await page.getByRole("link", { name: "Clear all" }).click();
  await expect(page).toHaveURL(/\/admin\/orders$/);
});

test("a writer sees the orders but no money, and no contact details until they accept", async ({ page, context }) => {
  test.slow();
  await signInAs(context, "WRITER", "Writer Test");
  await page.goto("/admin/orders");
  const row = page.locator("tr", { has: page.getByRole("link", { name: order.ref, exact: true }) });
  await expect(row).toContainText("Wanjiku E2E-Test");
  await expect(row).toContainText("Shown once accepted");
  await expect(row).not.toContainText(order.phone);
  await expect(page.locator("main")).not.toContainText("KES");
  await expect(page.getByRole("link", { name: /Paid this month/ })).toHaveCount(0);
  if (process.env.SHOT_DIR)
    await page.screenshot({ path: `${process.env.SHOT_DIR}/orders-writer.png`, fullPage: true });
});
