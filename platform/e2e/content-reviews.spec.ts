import { expect, test } from "@playwright/test";
import { removeTestStaff, signInAs, snapshotReviews } from "./staff";

let restoreReviews: () => Promise<void>;

test.beforeAll(async () => {
  restoreReviews = await snapshotReviews();
});

test.afterAll(async () => {
  await restoreReviews();
  await removeTestStaff();
});

const review = "Jay CVS rewrote my CV and I got two interview calls the same week.";

test("the owner adds a review, puts it on the homepage, and undoes that", async ({ page, context }) => {
  // Works in the admin and on the website: allow for both pages compiling on a cold dev server
  test.slow();
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/content?tab=reviews");
  await expect(page.getByRole("heading", { name: /Published/ })).toBeVisible();

  // Adding one: the text is required
  await page.getByText("Add a review").click();
  await page.getByLabel("Client's name").fill("E2E Wanjiru");
  await page.getByRole("button", { name: "Add review" }).click();
  await expect(page.getByText("Write at least a sentence")).toBeVisible();

  await page.getByLabel("What they said").fill(review);
  await page.getByLabel(/The client agreed/).check();
  await page.getByRole("button", { name: "Add review" }).click();
  await expect(page.locator(".change-list")).toContainText("added a review from E2E Wanjiru");
  const card = page.locator(".review-card", { hasText: review });
  await expect(card).toContainText("May publish");

  // The homepage takes 3 at most: make room first if it's full
  const onHomepage = page.getByRole("button", { name: /★ On homepage/ });
  if ((await onHomepage.count()) >= 3) {
    await onHomepage.first().click();
    await expect(page.getByRole("status")).toContainText("off the homepage");
  }
  await card.getByRole("button", { name: /Show on homepage/ }).click();
  await expect(page.locator(".change-list")).toContainText("put E2E Wanjiru's review on the homepage");

  const site = await context.newPage();
  await site.goto("/");
  await expect(site.locator("#testimonials")).toContainText(review);

  // Undo takes it off the homepage again
  await page.getByRole("button", { name: "Undo: put E2E Wanjiru's review on the homepage" }).click();
  await expect(page.getByRole("status")).toContainText("Undone");
  await site.reload();
  await expect(site.getByText(review)).toHaveCount(0);
});

test("a review without the client's permission is kept private", async ({ page, context }) => {
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/content?tab=reviews");
  await page.getByText("Add a review").click();
  await page.getByLabel("Client's name").fill("E2E Private");
  await page.getByLabel("What they said").fill("Great service, but please don't put my name online.");
  await page.getByRole("button", { name: "Add review" }).click();
  await expect(page.locator(".change-list")).toContainText("added a review from E2E Private (kept private)");

  await page.getByText(/Hidden & private/).click();
  const card = page.locator(".review-card", { hasText: "E2E Private" });
  await expect(card).toContainText("no permission to publish");
  // Moved back to waiting, it still can't be published, only kept private
  await card.getByRole("button", { name: /Move back to waiting/ }).click();
  const waiting = page.locator(".review-card", { hasText: "E2E Private" });
  await expect(waiting.getByRole("button", { name: /Keep \(private\)/ })).toBeVisible();
  await expect(waiting.getByRole("button", { name: /Publish/ })).toHaveCount(0);
});
