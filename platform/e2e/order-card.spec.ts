import { expect, test } from "@playwright/test";
import { removeOrderByRef, removeTestStaff, signInAs } from "./staff";

const placed: string[] = [];

test.afterAll(async () => {
  for (const ref of placed) await removeOrderByRef(ref);
  await removeTestStaff();
});

test("a client orders from the pricing page, uploads their CV and lands on their tracking page", async ({
  page,
  browser,
}) => {
  test.slow();
  await page.goto("/pricing");
  await page.getByRole("link", { name: "Choose Professional" }).first().click();
  await expect(page).toHaveURL(/\/order\?pkg=Professional/);
  // Starts on step 2 with the package already chosen
  await expect(page.getByRole("heading", { name: "Pick a package" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // Nothing is created until the details are right
  await page.getByRole("button", { name: "Upload CV & place my order" }).click();
  await expect(page.locator(".od-error")).toContainText("Please check the highlighted fields");
  await expect(page.getByText("Please enter your full name")).toBeVisible();

  await page.getByLabel(/Full name/).fill("Faith E2E-Njeri");
  await page.getByLabel(/WhatsApp number/).fill("0711 222 333");
  await page.getByLabel(/Job you're targeting/).fill("Procurement Officer");
  await page.getByRole("button", { name: "Upload CV & place my order" }).click();
  await expect(page.locator(".od-error")).toContainText("upload your CV");

  await page.locator('input[name="cv"]').setInputFiles({
    name: "Faith_CV.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n% E2E client CV\n"),
  });
  await page.getByRole("button", { name: "Upload CV & place my order" }).click();
  const title = page.getByRole("heading", { name: /^Order [A-Z]+-\d+ created, Faith!$/ });
  await expect(title).toBeVisible();
  const ref = (await title.textContent())!.match(/[A-Z]+-\d+/)![0];
  placed.push(ref);
  await expect(page.locator(".od-link code")).toContainText("/t/");
  await expect(page.locator(".od-pay")).toContainText(`Account ${ref}`);

  // Straight into the tracking page: no need to type the details again
  await page.getByRole("link", { name: "Open my tracking page" }).click();
  await expect(page.getByRole("heading", { name: "Hi Faith 👋" })).toBeVisible();
  await expect(page.locator(".track-files")).toContainText("Faith_CV.pdf");
  await expect(page.getByText("Complete your payment")).toBeVisible();

  // The team sees the new order, with the client's choice and CV
  const team = await browser.newContext();
  await signInAs(team, "OWNER", "Jay Test");
  const admin = await team.newPage();
  await admin.goto(`/admin/orders/${ref}`);
  await expect(admin.locator(".order-head")).toContainText("Professional");
  await expect(admin.locator(".brief-grid")).toContainText("Procurement Officer");
  await expect(admin.locator(".file-group").first()).toContainText("Faith_CV.pdf");
  await expect(admin.locator(".client-card")).toContainText("0711 222 333");
  await team.close();
});

test("a client without a CV can order a single service", async ({ page }) => {
  test.slow();
  await page.goto("/order");
  // On a slow dev server the first click can land before the card is interactive: click until it sticks
  const single = page.getByRole("radio", { name: /Just one service/ });
  await expect(async () => {
    await single.check();
    await expect(single).toBeChecked({ timeout: 1000 });
  }).toPass();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Pick a service" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel(/Full name/).fill("Brian E2E-Otieno");
  await page.getByLabel(/WhatsApp number/).fill("+254 722 333 444");
  await page.getByLabel(/I don't have a CV yet/).check();
  await page.getByRole("button", { name: "Place my order" }).click();
  const title = page.getByRole("heading", { name: /created, Brian!$/ });
  await expect(title).toBeVisible();
  placed.push((await title.textContent())!.match(/[A-Z]+-\d+/)![0]);
  await expect(page.locator(".order-sub").first()).toContainText("we'll send you a short questionnaire");
});
