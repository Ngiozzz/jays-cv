import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local", quiet: true });

// "Check it yourself" from a job page, with the pretend M-Pesa and the pretend AI (no keys in
// development): upload a CV, pay KES 10 on the "phone", read the feedback. Then "Let us tailor it":
// the order form starts with the details read off the CV, and the checked CV moves to the order.

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });
const PHONE = "0799 000 111";

test.afterAll(async () => {
  // The tailored CV order, then the checks and their payments this test made
  const orders = await db.order.findMany({ where: { clientPhone: PHONE }, select: { id: true } });
  const orderIds = orders.map((order) => order.id);
  await db.orderEvent.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.storedFile.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.order.deleteMany({ where: { id: { in: orderIds } } });
  const checks = await db.cvCheck.findMany({ where: { phone: "254799000111" }, select: { id: true } });
  await db.payment.deleteMany({ where: { cvCheckId: { in: checks.map((check) => check.id) } } });
  await db.cvCheck.deleteMany({ where: { id: { in: checks.map((check) => check.id) } } });
  await db.$disconnect();
});

test("a job seeker checks their CV against a job, then orders it tailored with everything filled in", async ({
  page,
}) => {
  test.slow();
  const job = await db.job.findFirst({ where: { status: "PUBLISHED" }, select: { slug: true, title: true } });
  test.skip(!job, "No published job to check against");

  await page.goto(`/jobs/${job!.slug}`);
  await page.getByRole("link", { name: /Check it yourself/ }).click();
  await expect(page.getByRole("heading", { name: "How well does your CV fit this job?" })).toBeVisible();
  await expect(page.getByText("We don't rewrite it.")).toBeVisible();

  // A Word file is refused: the AI reads PDFs and photos
  await page.locator('input[name="cv"]').setInputFiles({
    name: "cv.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: Buffer.from("not really word"),
  });
  await page.getByLabel(/M-Pesa number/).fill(PHONE);
  await page.getByRole("button", { name: /Pay KES .* & check my CV/ }).click();
  await expect(page.locator(".field-error")).toContainText("Save it as PDF");

  await page.locator('input[name="cv"]').setInputFiles({
    name: "my-cv.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%%EOF"),
  });
  await page.getByRole("button", { name: /Pay KES .* & check my CV/ }).click();
  await expect(page.getByText("Check your phone")).toBeVisible();
  await page.getByRole("button", { name: "✓ Entered PIN" }).click();

  // Paid → the AI reads it → the feedback page, which only this browser can open
  await expect(page).toHaveURL(/\/check\/[\w-]+$/, { timeout: 60_000 });
  await expect(page.getByText("Your CV feedback").first()).toBeVisible();
  await expect(page.locator(".match strong")).toHaveText(/\d+%/);
  await expect(page.getByRole("heading", { name: "What already fits" })).toBeVisible();
  // The fixing is left to Jay CVS's tailoring service, so no step-by-step tips or keywords
  await expect(page.getByRole("heading", { name: "What to change first" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Keywords to add/ })).toHaveCount(0);
  // The CV is kept for 48 hours in case they order, and they're told so
  await expect(page.getByText(/Your CV is kept privately for 48 hours/)).toBeVisible();
  const checked = await db.cvCheck.findFirst({
    where: { phone: "254799000111" },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, cvPath: true, applicantName: true, applicantEmail: true },
  });
  expect(checked).toMatchObject({
    status: "DONE",
    applicantName: "Faith Njeri",
    applicantEmail: "faith.njeri@example.com",
  });
  expect(checked?.cvPath).toBeTruthy();

  // "Let us tailor it": their details and the checked CV are already on the order form
  await page.getByRole("link", { name: /Let us tailor it/ }).click();
  await expect(page.getByLabel(/Full name/)).toHaveValue("Faith Njeri");
  await expect(page.getByLabel(/WhatsApp number/)).toHaveValue("0799 000 111");
  await expect(page.getByLabel(/Email/)).toHaveValue("faith.njeri@example.com");
  await expect(page.getByText("Your CV from the check: my-cv.pdf")).toBeVisible();
  await page.getByRole("button", { name: /place my order/ }).click();
  await expect(page.getByRole("heading", { name: /Order .* created, Faith!/ })).toBeVisible();

  // The CV moved to the order: the order has it, the check no longer does
  const order = await db.order.findFirst({
    where: { clientPhone: PHONE },
    select: { clientName: true, clientEmail: true, files: { select: { kind: true, name: true } } },
  });
  expect(order).toMatchObject({
    clientName: "Faith Njeri",
    clientEmail: "faith.njeri@example.com",
    files: [{ kind: "CURRENT_CV", name: "my-cv.pdf" }],
  });
  const after = await db.cvCheck.findUnique({ where: { id: checked!.id }, select: { cvPath: true } });
  expect(after?.cvPath).toBeNull();
});
