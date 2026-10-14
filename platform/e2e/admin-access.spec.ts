import { expect, test } from "@playwright/test";
import { removeTestStaff, setMemberStatus, signInAs } from "./staff";

test.afterAll(removeTestStaff);

test("signed-out visitors are sent to the sign-in page", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("the owner sees the dashboard, every menu item and the AI token balance", async ({ page, context }) => {
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /, Jay 👋$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "This month" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Writer pay owed/ })).toHaveAttribute("href", "/admin/finance");
  await expect(page.getByRole("heading", { name: "Team CV progress" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI tokens" })).toBeVisible();
  const menu = page.getByRole("complementary", { name: "Admin menu" });
  await expect(menu.getByText("Team")).toBeVisible();
  await expect(menu.getByText("Finance")).toBeVisible();
});

test("a writer never sees money, the team or finance", async ({ page, context }) => {
  await signInAs(context, "WRITER", "Grace Test");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /, Grace 👋$/ })).toBeVisible();
  await expect(page.getByText("AI tokens")).toHaveCount(0);
  await expect(page.getByText("This month")).toHaveCount(0);
  // Amounts look like "KES 1,500" (a plain "KES" would match words like "takes")
  await expect(page.getByText(/KES\s?[\d,]+/)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Orders you can accept" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your CVs, Grace" })).toBeVisible();
  const menu = page.getByRole("complementary", { name: "Admin menu" });
  await expect(menu.getByText("Team")).toHaveCount(0);
  await expect(menu.getByText("Finance")).toHaveCount(0);
  await expect(page.getByText("See prices, takings and payouts")).toHaveCount(0);
});

test("pausing a member blocks them on their next request", async ({ page, context }) => {
  const { userId } = await signInAs(context, "WRITER", "Brian Test");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /, Brian 👋$/ })).toBeVisible();
  await setMemberStatus(userId, "PAUSED");
  await page.reload();
  await expect(page).toHaveURL(/error=no_access/);
  await expect(page.getByRole("alert").filter({ hasText: "paused" })).toBeVisible();
});

test("in development, 'Proceed for testing' signs in as the test owner", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await page.getByRole("button", { name: "Proceed for testing" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: /, Jay 👋$/ })).toBeVisible();
});
