import { expect, test } from "@playwright/test";
import { addTestWriterWithOrders, removeTestOrders, removeTestStaff, signInAs } from "./staff";

const run = Date.now();
// M-Pesa codes are unique across the database, so each run makes its own
const code = (n: number) => `E2E${String(run).slice(-6)}${n}`;

test.afterAll(async () => {
  await removeTestOrders();
  await removeTestStaff();
});

test("the owner sees takings and payments, switches period and downloads payments", async ({ page, context }) => {
  const writer = `Achieng ${run}`;
  const client = `Client ${run}`;
  await addTestWriterWithOrders(writer, [
    { itemName: "Professional", amount: 2500, clientName: client, receipt: code(1) },
    { itemName: "Starter", amount: 1500, clientName: client, receipt: code(2) },
  ]);
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/finance");

  await expect(page.getByRole("row", { name: new RegExp(code(1)) })).toContainText("Professional");
  await expect(page.getByRole("row", { name: new RegExp(code(2)) })).toContainText("KES 1,500");
  // Writers are on a monthly salary: no pay per CV anywhere on the money screen
  await expect(page.locator("main")).not.toContainText("Writer pay");
  await expect(page.getByRole("button", { name: "Record payout" })).toHaveCount(0);

  // Period links and the CSV download
  await page.getByRole("link", { name: "All time" }).click();
  await expect(page).toHaveURL(/period=all/);
  await expect(page.getByRole("link", { name: "All time" })).toHaveAttribute("aria-current", "page");
  const csv = await page.request.get("/admin/finance/export?period=month");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const text = await csv.text();
  expect(text).toContain(`"${client}","Professional","M-Pesa prompt","${code(1)}"`);
});

test("a writer can't see the money", async ({ page, context }) => {
  await signInAs(context, "WRITER", "Grace Test");
  await page.goto("/admin/finance");
  await expect(page.getByRole("heading", { name: "You don't have access to the business money" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Finance" })).toHaveCount(0);
  expect((await page.request.get("/admin/finance/export")).status()).toBe(403);
});
