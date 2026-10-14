import { expect, test, type Page } from "@playwright/test";
import { removeTestStaff, signInAs, snapshotPosts } from "./staff";

let restorePosts: () => Promise<void>;

test.beforeAll(async () => {
  restorePosts = await snapshotPosts();
});

test.afterAll(async () => {
  await restorePosts();
  await removeTestStaff();
});

const title = "E2E: Five things recruiters check first";

async function writeArticle(page: Page) {
  await page.getByRole("link", { name: "New article" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel(/Short summary/).fill("What recruiters in Kenya look at in the first ten seconds.");
  await page.getByLabel(/^Article/).fill("## Start strong\n\n" + "Recruiters skim your CV quickly. ".repeat(12));
}

test("a writer drafts an article, sends it for review, and the owner publishes it", async ({ browser }) => {
  // Two people, the admin and the website: allow for pages compiling on a cold dev server
  test.slow();
  const writerContext = await browser.newContext();
  const writer = await writerContext.newPage();
  await signInAs(writerContext, "WRITER", "Wanjiku Writer");

  // Writers find Website content in the menu, with only Career tips in it
  await writer.goto("/admin");
  await writer.getByRole("link", { name: "Website content" }).click();
  await expect(writer.getByRole("link", { name: "Career tips" })).toBeVisible();
  await expect(writer.getByRole("link", { name: "Packages & prices" })).toHaveCount(0);
  await expect(writer.getByRole("button", { name: "Publish", exact: true })).toHaveCount(0);

  await writeArticle(writer);
  await expect(writer.locator(".serp")).toContainText("e2e-five-things-recruiters-check-first");
  await writer.getByRole("button", { name: "Send to owner for review" }).click();
  await expect(writer.getByRole("status")).toContainText("sent");
  await expect(writer.getByRole("row", { name: new RegExp(title) })).toContainText("Waiting for owner");
  await writerContext.close();

  // The owner sees it waiting, and publishes it
  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  await signInAs(ownerContext, "OWNER", "Jay Test");
  await owner.goto("/admin/content?tab=posts");
  await expect(owner.getByText("1 waiting for you")).toBeVisible();
  await owner.getByRole("link", { name: `Edit ${title}` }).click();
  await owner.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(owner.locator(".change-list")).toContainText(`published "${title}"`);

  await owner.goto("/blog/e2e-five-things-recruiters-check-first");
  await expect(owner.getByRole("heading", { name: title })).toBeVisible();
  await ownerContext.close();
});

test("the owner deletes an article and brings it back with undo", async ({ page, context }) => {
  test.slow();
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/content?tab=posts");
  await writeArticle(page);
  await page.getByLabel("Title").fill("E2E: Delete me");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("heading", { name: "Edit article" })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete article" }).click();
  await expect(page.getByRole("row", { name: /E2E: Delete me/ })).toHaveCount(0);

  await page.getByRole("button", { name: 'Undo: deleted the article "E2E: Delete me"' }).click();
  await expect(page.getByRole("row", { name: /E2E: Delete me/ })).toContainText("Draft");
});

test("an article needs a title and a summary", async ({ page, context }) => {
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/content?tab=posts&post=new");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Give the article a title")).toBeVisible();
  await expect(page.getByText(/Write a sentence or two/)).toBeVisible();
});
