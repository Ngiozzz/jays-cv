import { expect, test } from "@playwright/test";
import { removeTestInvites, removeTestStaff, signInAs, testEmail } from "./staff";

test.afterAll(async () => {
  await removeTestInvites();
  await removeTestStaff();
});

const run = Date.now();

test("the owner invites a writer, and the message names the Google account to use", async ({ page, context }) => {
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/team");
  const name = `Wanjiku ${run}`;
  const email = testEmail(name);

  await page.getByRole("button", { name: "Invite a writer" }).click();
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Google email").fill(email);
  await page.getByLabel("WhatsApp number").fill("0712 345 678");
  await page.getByRole("button", { name: "Create invite" }).click();
  await expect(page.getByRole("heading", { name: `Invite ready for ${name}` })).toBeVisible();
  await expect(page.locator(".wa-text")).toContainText(`using ${email}`);
  await expect(page.getByRole("link", { name: "Send on WhatsApp" })).toHaveAttribute("href", /wa\.me\/254712345678/);
  await page.getByRole("button", { name: "Done" }).click();

  // Listed as invited; the same email can't be invited twice
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row.getByText("Invited", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Invite a writer" }).click();
  await page.getByLabel("Name").fill("Someone Else");
  await page.getByLabel("Google email").fill(email);
  await page.getByRole("button", { name: "Create invite" }).click();
  await expect(page.getByText("already on the team or invited")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "Cancel invite" }).click();
  await expect(row).toHaveCount(0);
});

test("the owner edits, pauses, resumes and removes a writer", async ({ page, context, browser }) => {
  const writerName = `Brian Test ${run}`;
  await signInAs(await browser.newContext(), "WRITER", writerName);
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/team");
  const row = page.getByRole("row", { name: new RegExp(writerName) });

  await row.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Pay per CV").fill("35");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(row.getByRole("cell", { name: "35%" })).toBeVisible();

  await row.getByRole("button", { name: "Pause" }).click();
  await expect(row.getByText("Paused", { exact: true })).toBeVisible();
  await row.getByRole("button", { name: "Resume" }).click();
  await expect(row.getByText("Active", { exact: true })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "Remove" }).click();
  await expect(row).toHaveCount(0);
});

test("a writer can't open the Team page", async ({ page, context }) => {
  await signInAs(context, "WRITER", "Grace Test");
  await page.goto("/admin/team");
  await expect(page.getByRole("heading", { name: "You don't have access to the team" })).toBeVisible();
});
