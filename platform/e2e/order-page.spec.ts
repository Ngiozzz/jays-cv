import { expect, test, type Page } from "@playwright/test";
import { createTrackedOrder, removeTestStaff, signInAs } from "./staff";

let unpaid: Awaited<ReturnType<typeof createTrackedOrder>>;
let other: Awaited<ReturnType<typeof createTrackedOrder>>;
const code = `E2E${Date.now().toString(36).toUpperCase()}`;

test.beforeAll(async () => {
  unpaid = await createTrackedOrder("NEW");
  other = await createTrackedOrder("NEW");
});

test.afterAll(async () => {
  await unpaid.remove();
  await other.remove();
  await removeTestStaff();
});

const toast = (page: Page) => page.locator(".toast");

test("an order goes from payment to complete, with each person doing only their part", async ({ browser }) => {
  test.slow();
  test.setTimeout(600_000);

  // The owner records a payment that came in another way; the same code can't pay a second order
  const ownerContext = await browser.newContext();
  await signInAs(ownerContext, "OWNER", "Jay Test");
  const owner = await ownerContext.newPage();
  await owner.goto(`/admin/orders/${unpaid.ref}`);
  await owner.getByText("Client paid but it's not showing?").click();
  await owner.getByLabel("M-Pesa code (or cash / bank reference)").fill(code);
  await owner.getByRole("button", { name: "Record payment" }).click();
  await expect(toast(owner)).toContainText("Payment recorded");
  await expect(owner.locator(".order-head .ostatus")).toHaveText("⚠ Not accepted");
  await owner.goto(`/admin/orders/${other.ref}`);
  await owner.getByText("Client paid but it's not showing?").click();
  await owner.getByLabel("M-Pesa code (or cash / bank reference)").fill(code);
  await owner.getByRole("button", { name: "Record payment" }).click();
  await expect(toast(owner)).toContainText(`already used for ${unpaid.ref}`);

  // The first writer to accept gets it
  const graceContext = await browser.newContext();
  await signInAs(graceContext, "WRITER", "Grace Test");
  const grace = await graceContext.newPage();
  await grace.goto(`/admin/orders/${unpaid.ref}`);
  await expect(grace.locator(".client-card")).not.toContainText(unpaid.phone);
  // Before accepting, the client's own files are listed but locked
  await expect(grace.getByRole("link", { name: "Download Wanjiku_old_CV.pdf" })).toHaveCount(0);
  await grace.getByRole("button", { name: "Accept as Grace" }).click();
  await expect(toast(grace)).toContainText("You accepted this order");
  await expect(grace.locator(".client-card")).toContainText(unpaid.phone);
  await expect(grace.locator("main")).not.toContainText("KES");
  await expect(grace.getByRole("link", { name: "Download Wanjiku_old_CV.pdf" })).toBeVisible();
  await expect(grace.locator(".file-group").first()).toContainText("My CV from 2022");

  // Another writer can read it, but not work on it or see the client's details
  const brianContext = await browser.newContext();
  await signInAs(brianContext, "WRITER", "Brian Test");
  const brian = await brianContext.newPage();
  await brian.goto(`/admin/orders/${unpaid.ref}`);
  await expect(brian.getByText("This is Grace's order")).toBeVisible();
  await expect(brian.locator(".client-card")).not.toContainText(unpaid.phone);
  await expect(brian.getByRole("button", { name: /Accept/ })).toHaveCount(0);

  // Grace sends a draft: a file is required
  await grace.locator('input[name="draft"]').setInputFiles({
    name: "Wanjiku_CV_draft.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n% E2E draft\n"),
  });
  await grace.getByLabel(/Message to the client/).fill("I moved your awards to the top.");
  await grace.getByRole("button", { name: "Send draft to client" }).click();
  await expect(toast(grace)).toContainText("Draft v1 sent");
  await expect(grace.locator(".file-group").nth(1)).toContainText("I moved your awards to the top.");
  await expect(grace.locator(".order-head .ostatus")).toHaveText("Draft with client");

  // The client opens it from their tracking page; a stranger can't
  const clientContext = await browser.newContext();
  const client = await clientContext.newPage();
  await client.goto(`/t/${unpaid.token}`);
  const files = client.locator(".track-files");
  await expect(files).toContainText("Wanjiku_CV_draft.pdf");
  await expect(files).toContainText("I moved your awards to the top.");
  await expect(files).toContainText("Wanjiku_old_CV.pdf");
  // Every file downloads, theirs and ours
  const fileUrl = await files.getByRole("link", { name: "Download Wanjiku_CV_draft.pdf" }).getAttribute("href");
  const download = await client.request.get(fileUrl!);
  expect(download.status()).toBe(200);
  expect(download.headers()["content-disposition"]).toContain("attachment");
  const ownUrl = await files.getByRole("link", { name: "Download Wanjiku_old_CV.pdf" }).getAttribute("href");
  expect((await client.request.get(ownUrl!)).status()).toBe(200);
  const stranger = await browser.newContext();
  expect((await stranger.request.get(`http://localhost:3000${fileUrl}`)).status()).toBe(404);

  // The client asked for changes on WhatsApp; Grace logs them, sends v2, and completes
  await grace.getByRole("button", { name: "Client asked for changes…" }).click();
  await grace.getByLabel("Requested changes").fill("Add my 2023 sales award");
  await grace.getByRole("button", { name: "Move to revisions" }).click();
  await expect(toast(grace)).toContainText("Moved to revisions");
  await expect(grace.locator(".change-request")).toContainText("Add my 2023 sales award");
  await grace.locator('input[name="draft"]').setInputFiles({
    name: "Wanjiku_CV_draft_v2.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n% E2E draft 2\n"),
  });
  await grace.getByRole("button", { name: "Send draft to client" }).click();
  await expect(toast(grace)).toContainText("Draft v2 sent");
  grace.once("dialog", (dialog) => dialog.accept());
  await grace.getByRole("button", { name: "Client approved: complete" }).click();
  await expect(grace.locator(".order-head .ostatus")).toHaveText("Delivered");

  await client.reload();
  await expect(client.getByText("Your order is complete")).toBeVisible();
  await expect(client.locator(".timeline-mini")).toContainText('Asked for changes: "Add my 2023 sales award"');
  for (const context of [ownerContext, graceContext, brianContext, clientContext, stranger]) await context.close();
});
