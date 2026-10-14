import { expect, test } from "@playwright/test";
import { createTrackedOrder } from "./staff";

let order: Awaited<ReturnType<typeof createTrackedOrder>>;

test.beforeAll(async () => {
  order = await createTrackedOrder("DRAFT_SENT");
});

test.afterAll(async () => {
  await order.remove();
});

test("a client finds their order from the homepage with its number and phone", async ({ page }) => {
  test.slow();
  await page.goto("/");
  await page.getByRole("link", { name: "Track my order" }).first().click();
  await expect(page.getByRole("heading", { name: "Track your order" })).toBeVisible();

  // The wrong phone gets the same answer as a missing order
  await page.getByLabel("Order number").fill(order.ref.toLowerCase());
  await page.getByLabel("Phone number you ordered with").fill("0700 000 000");
  await page.getByRole("button", { name: "Find my order" }).click();
  await expect(page.locator(".track-error")).toContainText("We couldn't find an order with those details");

  await page.getByLabel("Phone number you ordered with").fill(order.phone);
  await page.getByRole("button", { name: "Find my order" }).click();
  await expect(page).toHaveURL(new RegExp(`/track/${order.ref}$`));
  await expect(page.getByRole("heading", { name: "Hi Wanjiku 👋" })).toBeVisible();
  await expect(page.getByText("Your draft is ready").first()).toBeVisible();
  await expect(page.locator(".timeline-mini")).toContainText("Payment received (M-Pesa code E2E4H7XQ2P)");
  // Staff-only notes never reach the client
  await expect(page.locator("body")).not.toContainText("E2E staff-only note");
});

test("the tracking page needs proof, and the private link is that proof", async ({ page }) => {
  test.slow();
  // A fresh browser without a pass is sent to the lookup form, with the number filled in
  await page.goto(`/track/${order.ref}`);
  await expect(page).toHaveURL(/\/track\?order=/);
  await expect(page.getByLabel("Order number")).toHaveValue(order.ref);

  await page.goto("/t/notarealtokenatallxxxx");
  await expect(page.locator(".track-error")).toContainText("That tracking link isn't valid");

  await page.goto(`/t/${order.token}`);
  await expect(page).toHaveURL(new RegExp(`/track/${order.ref}$`));
  await expect(page.getByRole("heading", { name: "Hi Wanjiku 👋" })).toBeVisible();
});

test("too many wrong phone numbers lock the order for a while", async ({ page }) => {
  test.slow();
  await page.goto("/track");
  await page.getByLabel("Order number").fill(order.ref);
  for (let i = 0; i < 5; i++) {
    await page.getByLabel("Phone number you ordered with").fill(`0711 000 00${i}`);
    await page.getByRole("button", { name: "Find my order" }).click();
    await expect(page.getByRole("button", { name: "Find my order" })).toBeEnabled();
  }
  // Even the right number is refused now
  await page.getByLabel("Phone number you ordered with").fill(order.phone);
  await page.getByRole("button", { name: "Find my order" }).click();
  await expect(page.locator(".track-error")).toContainText("Too many tries for this order");
});
