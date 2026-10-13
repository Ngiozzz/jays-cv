import { expect, test } from "@playwright/test";
import { removeTestStaff, signInAs } from "./staff";

test.afterAll(async () => {
  await removeTestStaff();
});

test("a writer edits their names, nickname and phone; the email can't be changed", async ({ page, context }) => {
  await signInAs(context, "WRITER", "Grace Wanjiku");
  await page.goto("/admin/profile");

  // Members who joined with one name see it split into first and last
  await expect(page.getByLabel("First name")).toHaveValue("Grace");
  await expect(page.getByLabel("Last name")).toHaveValue("Wanjiku");
  await expect(page.getByLabel("Email")).toHaveJSProperty("readOnly", true);

  await page.getByLabel("Last name").fill("");
  await page.getByLabel("Phone number").fill("12345");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Enter your last name")).toBeVisible();
  await expect(page.getByText("Enter a Kenyan phone number")).toBeVisible();

  await page.getByLabel("Last name").fill("Kamau");
  await page.getByLabel("Nickname (optional)").fill("Gee");
  await page.getByLabel("Phone number").fill("0712 345 678");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");

  // The nickname is the name the team sees
  await expect(page.getByRole("heading", { name: "Gee", level: 2 })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Last name")).toHaveValue("Kamau");
  await expect(page.getByLabel("Phone number")).toHaveValue("0712345678");
});
