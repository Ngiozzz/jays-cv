import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local", quiet: true });

// "Check it yourself" from a job page, with the pretend M-Pesa and the pretend AI (no keys in
// development): upload a CV, pay KES 10 on the "phone", read the feedback. No order is created.

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });
const PHONE = "0799 000 111";

test.afterAll(async () => {
  // The checks and their payments this test made
  const checks = await db.cvCheck.findMany({ where: { phone: "254799000111" }, select: { id: true } });
  await db.payment.deleteMany({ where: { cvCheckId: { in: checks.map((check) => check.id) } } });
  await db.cvCheck.deleteMany({ where: { id: { in: checks.map((check) => check.id) } } });
  await db.$disconnect();
});

test("a job seeker checks their CV against a job and gets feedback only", async ({ page }) => {
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
  await expect(page.getByRole("heading", { name: "What to change first" })).toBeVisible();
  await expect(page.getByText("Your CV has been deleted.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Let us tailor it/ })).toBeVisible();

  // The CV is gone, and no order was made
  const check = await db.cvCheck.findFirst({
    where: { phone: "254799000111" },
    orderBy: { createdAt: "desc" },
    select: { status: true, cvPath: true },
  });
  expect(check).toEqual({ status: "DONE", cvPath: null });
});
