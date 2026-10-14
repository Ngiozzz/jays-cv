import { expect, test } from "@playwright/test";
import { createTrackedOrder, removeTestStaff } from "./staff";

// Paying from the tracking page with the pretend M-Pesa (no Safaricom keys in development):
// the tester plays the client's phone with the buttons under "Check your phone".

const cleanups: (() => Promise<void>)[] = [];

test.afterAll(async () => {
  for (const remove of cleanups) await remove();
  await removeTestStaff();
});

test("a client pays with the M-Pesa prompt: a wrong number is refused, a cancel can be retried", async ({ page }) => {
  test.slow();
  const order = await createTrackedOrder("NEW");
  cleanups.push(order.remove);
  await page.goto(`/t/${order.token}`);
  await expect(page.getByText("Complete your payment")).toBeVisible();
  const box = page.locator(".pay-box");
  await expect(box).toContainText("TEST MODE");
  await expect(box).toContainText("KES 3,500");
  // The client's number from the order is filled in
  await expect(box.getByLabel("M-Pesa phone number")).toHaveValue(/^07\d{2} \d{3} \d{3}$/);

  await box.getByLabel("M-Pesa phone number").fill("0812 345");
  await box.getByRole("button", { name: "Pay KES 3,500" }).click();
  await expect(box.getByRole("alert")).toContainText("Enter a Safaricom M-Pesa number");

  // Someone else pays: their number, then they cancel on their phone
  await box.getByLabel("M-Pesa phone number").fill("+254 722 000 111");
  await box.getByRole("button", { name: "Pay KES 3,500" }).click();
  await expect(box.getByText("Check your phone")).toBeVisible();
  await expect(box).toContainText("0722 000 111");
  await box.getByRole("button", { name: "Cancelled" }).click();
  await expect(box.getByRole("alert")).toContainText("You cancelled the M-Pesa prompt. No money was taken.");

  // Try again, and this time the PIN is entered
  await box.getByRole("button", { name: "Try again" }).click();
  await box.getByRole("button", { name: "Pay KES 3,500" }).click();
  await box.getByRole("button", { name: "✓ Entered PIN" }).click();
  await expect(box.getByText("Payment received")).toBeVisible();
  await expect(box).toContainText(/M-Pesa code PRT[A-Z0-9]{7}/);

  // The page moves on by itself, and the update is in the order's history
  await expect(page.getByRole("heading", { name: "Payment received: thank you!" })).toBeVisible();
  await expect(page.locator(".pay-box")).toHaveCount(0);
  await expect(page.getByText(/Payment received \(M-Pesa code PRT/)).toBeVisible();
});

test("Paybill: the account number shows only when the client asks for it", async ({ page }) => {
  const order = await createTrackedOrder("NEW");
  cleanups.push(order.remove);
  await page.goto(`/t/${order.token}`);
  const box = page.locator(".pay-box");
  await box.getByRole("button", { name: "🏦 Pay via Paybill" }).click();
  const number = order.ref.split("-").pop()!;
  await expect(box).toContainText("4027127");
  // (The order number is on the page anyway; the account slot itself stays hidden until asked)
  await expect(box.locator(".mp-copy").nth(1)).toHaveText("••••");
  await box.getByRole("button", { name: "Show account number" }).click();
  await expect(box.locator(".mp-copy").nth(1)).toHaveText(number);
  await expect(box).toContainText(`Type exactly ${number} as the account number, not your name`);
});

test("a stranger's browser can't pay or reveal anything for someone else's order", async ({ page }) => {
  const order = await createTrackedOrder("NEW");
  cleanups.push(order.remove);
  // No tracking pass: the order's page asks for the details instead of showing the pay box
  await page.goto(`/track/${order.ref}`);
  await expect(page).toHaveURL(/\/track\?order=/);
  await expect(page.locator(".pay-box")).toHaveCount(0);
});
