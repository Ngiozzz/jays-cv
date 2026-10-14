import { expect, test } from "@playwright/test";
import { removeTestStaff, signInAs, snapshotFaqs } from "./staff";

let restoreFaqs: () => Promise<void>;

test.beforeAll(async () => {
  restoreFaqs = await snapshotFaqs();
});

test.afterAll(async () => {
  await restoreFaqs();
  await removeTestStaff();
});

test("the owner adds a question, deletes one, publishes, and undoes it all", async ({ page, context }) => {
  // Works in the admin and on the website: allow for both pages compiling on a cold dev server
  test.slow();
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/content?tab=faqs");
  const firstQuestion = await page.getByLabel("Question 1", { exact: true }).inputValue();
  const count = await page.locator(".faq-admin li").count();

  // A new question without an answer is refused
  await page.getByRole("button", { name: "Add question" }).click();
  await page.getByLabel(`Question ${count + 1}`, { exact: true }).fill("E2E: Do you work on weekends?");
  await page.getByRole("button", { name: "Save & publish FAQs" }).click();
  await expect(page.getByText("Write the answer")).toBeVisible();

  await page.getByLabel(`Answer ${count + 1}`, { exact: true }).fill("Yes, every day of the week.");
  await page.getByRole("button", { name: "Delete question 1", exact: true }).click();
  await page.getByRole("button", { name: "Save & publish FAQs" }).click();
  await expect(page.locator(".change-list")).toContainText('added "E2E: Do you work on weekends?"');

  const site = await context.newPage();
  await site.goto("/");
  await expect(site.locator("#faq")).toContainText("E2E: Do you work on weekends?");
  await expect(site.locator("#faq")).not.toContainText(firstQuestion);

  // Undo brings back the deleted question and removes the new one
  await page.getByRole("button", { name: /^Undo: FAQs: added "E2E/ }).click();
  await expect(page.getByRole("status")).toContainText("Undone");
  await expect(page.getByLabel("Question 1", { exact: true })).toHaveValue(firstQuestion);
  await site.reload();
  await expect(site.locator("#faq")).toContainText(firstQuestion);
  await expect(site.locator("#faq")).not.toContainText("E2E: Do you work on weekends?");
});

test("the owner hides a question and moves another", async ({ page, context }) => {
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/content?tab=faqs");
  const second = await page.getByLabel("Question 2", { exact: true }).inputValue();
  await page.getByRole("button", { name: "Move question 2 up" }).click();
  await expect(page.getByLabel("Question 1", { exact: true })).toHaveValue(second);
  await page.getByLabel("Show question 1").uncheck();
  await page.getByRole("button", { name: "Save & publish FAQs" }).click();
  await expect(page.locator(".change-list")).toContainText("changed the order");
  await expect(page.locator(".change-list")).toContainText("hid");
});
