import { expect, test } from "@playwright/test";

test("the homepage shows the packages and prices from the database", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("shortlisted.");
  const pricing = page.locator("#pricing");
  await expect(pricing.getByRole("heading", { name: "Professional" })).toBeVisible();
  await expect(pricing.getByText("Most popular")).toBeVisible();
});

test("every main page opens from the menu", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const [label, heading] of [
    ["Services", "Services to move your career forward"],
    ["How it works", "From old CV to interview-ready in four steps"],
    ["Pricing", "Simple, transparent pricing"],
    ["Samples", "See the difference a professional CV makes"],
    ["Career tips", "Career tips from our HR experts"],
  ]) {
    await nav.getByRole("link", { name: label }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(nav.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
  }
});

test("an article opens from the career tips page", async ({ page }) => {
  await page.goto("/blog");
  await page.getByRole("link", { name: "Read article" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("CV mistakes");
  await expect(page.getByRole("heading", { name: "Related articles" })).toBeVisible();
});

test("the sample filter shows only the chosen industry", async ({ page }) => {
  await page.goto("/samples");
  await page.getByRole("button", { name: "Healthcare" }).click();
  await expect(page.locator(".sample")).toHaveCount(1);
  await page.getByRole("button", { name: "All" }).click();
  await expect(page.locator(".sample")).toHaveCount(8);
});
