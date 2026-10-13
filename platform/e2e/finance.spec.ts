import { expect, test } from "@playwright/test";
import { addTestWriterWithOrders, removeTestOrders, removeTestStaff, signInAs } from "./staff";

const run = Date.now();
// M-Pesa codes are unique across the database, so each run makes its own
const code = (n: number) => `E2E${String(run).slice(-6)}${n}`;

test.afterAll(async () => {
  await removeTestOrders();
  await removeTestStaff();
});

test("the owner sees writer pay, records and removes a payout, and downloads payments", async ({ page, context }) => {
  const writer = `Achieng ${run}`;
  const client = `Client ${run}`;
  await addTestWriterWithOrders(writer, 40, [
    { itemName: "Professional", amount: 2500, clientName: client, receipt: code(1) },
    { itemName: "Starter", amount: 1500, clientName: client, receipt: code(2) },
  ]);
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/finance");

  // 40% of 2,500 + 1,500 = 1,600 earned and owed
  const row = page.getByRole("row", { name: new RegExp(writer) });
  await expect(row.getByRole("cell").nth(2)).toHaveText("2");
  await expect(row.getByRole("cell").nth(3)).toHaveText("KES 1,600");
  await expect(row.getByRole("cell").nth(5)).toHaveText("KES 1,600");
  await expect(page.getByRole("row", { name: new RegExp(code(1)) })).toContainText("Professional");

  // Can't record more than is owed
  await row.getByRole("button", { name: "Record payout" }).click();
  await page.getByLabel("Amount (KES)").fill("2000");
  await page.getByRole("button", { name: "Record payout" }).last().click();
  await expect(page.getByText(`more than ${writer} is owed (KES 1,600)`)).toBeVisible();

  await page.getByLabel("Amount (KES)").fill("1000");
  await page.getByLabel("M-Pesa code").fill(code(3).toLowerCase());
  await page.getByRole("button", { name: "Record payout" }).last().click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row.getByRole("cell").nth(4)).toHaveText("KES 1,000");
  await expect(row.getByRole("cell").nth(5)).toHaveText("KES 600");

  // A payout recorded by mistake can be removed; it shows as owed again
  const payout = page.locator(".fin-payouts li", { hasText: code(3) });
  page.once("dialog", (dialog) => dialog.accept());
  await payout.getByRole("button", { name: "Remove" }).click();
  await expect(payout).toHaveCount(0);
  await expect(row.getByRole("cell").nth(5)).toHaveText("KES 1,600");

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
