import { expect, test } from "@playwright/test";
import { removeTestStaff, removeWorkOfTestStaff, signInAs } from "./staff";

test.afterAll(async () => {
  await removeWorkOfTestStaff();
  await removeTestStaff();
});

// No Claude key in tests, so the AI is in pretend mode and reads the sample posters
test("posters are read, flagged, approved or discarded, and today's channel post is built", async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  await signInAs(context, "OWNER", "Jay Test");
  await page.goto("/admin/inbox");
  await page.getByRole("button", { name: /Load a sample batch/ }).click();

  // Reading finishes, and the scam poster lands in Flagged
  const tab = (name: string) => page.getByRole("button", { name: new RegExp(`^${name} [0-9]+`) });
  // All 8 posters uploaded and read (the Reading tab is empty only once nothing is left to read)
  await expect
    .poll(
      async () => {
        const texts = await page.locator(".inbox-tabs button").allTextContents();
        const count = (name: string) => Number(texts.find((t) => t.startsWith(name))?.replace(/[^0-9]/g, "") ?? 0);
        return count("Reading") === 0 && count("To check") + count("Flagged") === 8;
      },
      { timeout: 150_000 },
    )
    .toBe(true);
  await tab("Flagged").click();
  await page.getByRole("button", { name: /Airport jobs/ }).click();
  await expect(page.locator(".d-flag", { hasText: "Possible scam" })).toBeVisible();
  await page.getByRole("button", { name: "Discard as scam" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Discarded: Possible scam" })).toBeVisible();

  // A clean poster is approved and goes live
  await tab("To check").click();
  await page.getByRole("button", { name: /Accounts Assistant/ }).click();
  await expect(page.getByText("✓ Ready to approve")).toBeVisible();
  await page.getByRole("button", { name: /Approve & publish/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Published: Accounts Assistant" })).toBeVisible();

  // Today's channel post lists it with a link to the job page
  await expect(page.getByRole("heading", { name: "Today's WhatsApp channel post" })).toBeVisible();
  await expect(page.locator(".digest-text")).toContainText("Accounts Assistant");
  await expect(page.locator(".digest-text")).toContainText("/jobs/accounts-assistant");

  // The discarded scam can be found under Discarded
  await tab("Discarded").click();
  await expect(page.getByRole("button", { name: /Airport jobs/ })).toBeVisible();
});
