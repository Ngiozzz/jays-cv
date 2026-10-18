import "server-only";
import { randomUUID } from "node:crypto";
import { fileStore } from "@/lib/storage";
import { tenantDb } from "@/lib/tenant-db";
import { AiUnavailableError, checkCvAgainstJob } from "@/modules/ai/claude";
import { getTokenBalance } from "@/modules/ai/tokens.service";
import { recordUsage } from "@/modules/ai/tokens.repo";
import { findSettings } from "@/modules/content/content.repo";
import { grantCheckPass, hasCheckPass } from "@/modules/orders/tracking-pass";
import { mpesa } from "@/modules/payments/gateway";
import {
  localPhone,
  mpesaPhone,
  PROMPT_RESULT,
  PROMPT_SECONDS,
  pretendReceipt,
  type PretendOutcome,
} from "@/modules/payments/mpesa";
import { settlePrompt } from "@/modules/payments/payments.service";
import type { CurrentTenant } from "@/modules/tenants/tenants.service";
import { z } from "zod";
import {
  CHECK_CV_KEEP_HOURS,
  checkCvKeptUntil,
  checkCvProblem,
  cvFeedbackSchema,
  type CheckCvType,
  type CvFeedback,
} from "./cv-check";

// "Check it yourself": the client uploads their CV on a job page, pays by M-Pesa prompt, and the AI
// compares it with that job. Self-service: no order is created and Jay never sees the CV. It's kept
// privately for 48 hours in case the client then orders a tailored CV (the order form starts filled
// in, with this CV attached); otherwise it's deleted. Only the browser that started a check can see it.

type Refused = { ok: false; error: string; field?: string };
const refuse = (error: string, field?: string): Refused => ({ ok: false, error, field });
// One phone can't run up checks (each one stores a file and costs AI tokens)
const CHECK_LIMIT = { count: 5, minutes: 60 };
const ACCOUNT = "CVCHECK";
const SORRY =
  "Sorry, we couldn't read your CV this time. Message us on WhatsApp with your M-Pesa code and we'll sort it out.";

const extensionOf = (type: string) => (type === "application/pdf" ? "pdf" : type.split("/")[1]);

function findLiveJob(tenantId: string, slug: string) {
  return tenantDb(tenantId).job.findFirst({
    where: { status: "PUBLISHED", slug },
    select: {
      id: true,
      slug: true,
      title: true,
      company: true,
      location: true,
      summary: true,
      responsibilities: true,
      requirements: true,
    },
  });
}

// ---------- Starting a check: the CV is stored privately and the M-Pesa prompt is sent ----------

export async function startCvCheck(
  tenant: CurrentTenant,
  jobSlug: string,
  typedPhone: string,
  cv: File | null,
): Promise<
  { ok: true; checkId: string; paymentId: string; amount: number; phone: string; pretend: boolean } | Refused
> {
  const job = await findLiveJob(tenant.id, jobSlug);
  if (!job) return refuse("This job is no longer on the board.");
  const phone = mpesaPhone(typedPhone);
  if (!phone) return refuse("Enter a Safaricom M-Pesa number, e.g. 0712 345 678.", "phone");
  const file = cv && cv.size > 0 ? cv : null;
  const problem = checkCvProblem(file);
  if (problem) return refuse(problem, "cv");

  const db = tenantDb(tenant.id);
  await deleteOldCheckCvs(tenant.id, new Date());
  const recent = await db.cvCheck.count({
    where: { phone, createdAt: { gte: new Date(Date.now() - CHECK_LIMIT.minutes * 60_000) } },
  });
  if (recent >= CHECK_LIMIT.count) return refuse("You've run several checks just now. Please try again in an hour.");
  if ((await getTokenBalance(tenant.id)).remaining <= 0)
    return refuse("CV checks aren't available right now. Please try again later.");

  const { cvCheckPrice } = await findSettings(tenant.id);
  const sent = await mpesa.sendPrompt({
    phone,
    amount: cvCheckPrice,
    account: ACCOUNT,
    description: `${tenant.name} CV check`,
  });
  if (!sent.ok) return refuse(sent.error);

  const checkId = randomUUID();
  const cvPath = `${tenant.id}/cv-checks/${checkId}.${extensionOf(file!.type)}`;
  await fileStore.put("order-files", cvPath, new Uint8Array(await file!.arrayBuffer()), file!.type);
  try {
    const payment = await db.$transaction(async (tx) => {
      await tx.cvCheck.create({
        data: {
          id: checkId,
          tenantId: tenant.id,
          jobId: job.id,
          jobLabel: `${job.title} at ${job.company}`,
          jobSlug: job.slug,
          phone,
          amount: cvCheckPrice,
          cvPath,
          cvName: file!.name.slice(0, 120),
          cvType: file!.type,
        },
      });
      return tx.payment.create({
        data: {
          tenantId: tenant.id,
          cvCheckId: checkId,
          channel: "MPESA_STK",
          status: "PENDING",
          amount: cvCheckPrice,
          phone,
          accountReference: ACCOUNT,
          checkoutRequestId: sent.checkoutRequestId,
          merchantRequestId: sent.merchantRequestId,
        },
        select: { id: true },
      });
    });
    await grantCheckPass(tenant.id, checkId);
    return {
      ok: true,
      checkId,
      paymentId: payment.id,
      amount: cvCheckPrice,
      phone: localPhone(phone),
      pretend: mpesa.pretend,
    };
  } catch (error) {
    await fileStore.remove("order-files", cvPath).catch(() => {});
    throw error;
  }
}

// ---------- Following the payment, then the reading ----------

export type CheckProgress =
  | { state: "waiting" }
  | { state: "failed"; message: string }
  | { state: "reading" }
  | { state: "done" }
  | { state: "error"; message: string };

async function ownCheck(tenant: CurrentTenant, checkId: string) {
  if (!(await hasCheckPass(tenant.id, checkId))) return null;
  return tenantDb(tenant.id).cvCheck.findFirst({ where: { id: checkId }, select: { id: true, status: true } });
}

const notYours = refuse("We couldn't find this check in your browser. Please start again from the job page.");

// The check page asks every few seconds: has the client paid, and is the feedback ready?
export async function followCvCheck(
  tenant: CurrentTenant,
  checkId: string,
  paymentId: string,
): Promise<CheckProgress | Refused> {
  const check = await ownCheck(tenant, checkId);
  if (!check) return notYours;
  if (check.status === "DONE") return { state: "done" };
  if (check.status === "FAILED") return { state: "error", message: SORRY };
  if (check.status === "READING") return { state: "reading" };
  if (check.status === "PAID") return readCv(tenant, checkId);

  const payment = await tenantDb(tenant.id).payment.findFirst({
    where: { id: paymentId, cvCheckId: checkId },
    select: { status: true, raw: true, createdAt: true, checkoutRequestId: true },
  });
  if (!payment) return refuse("We couldn't find that payment. Please start again.");
  if (payment.status === "PENDING") {
    // M-Pesa drops an unanswered prompt after about a minute
    const expired = Date.now() - payment.createdAt.getTime() > (PROMPT_SECONDS + 30) * 1000;
    if (expired && payment.checkoutRequestId) {
      await settlePrompt(tenant.id, payment.checkoutRequestId, { ok: false, outcome: "timeout" });
      return { state: "failed", message: PROMPT_RESULT.timeout };
    }
    return { state: "waiting" };
  }
  if (payment.status === "CONFIRMED") return readCv(tenant, checkId);
  const outcome = (payment.raw as { outcome?: keyof typeof PROMPT_RESULT } | null)?.outcome ?? "failed";
  return { state: "failed", message: PROMPT_RESULT[outcome] ?? PROMPT_RESULT.failed };
}

// The pretend M-Pesa only: the tester plays the client's phone
export async function pretendCheckPayment(
  tenant: CurrentTenant,
  checkId: string,
  paymentId: string,
  outcome: PretendOutcome,
): Promise<CheckProgress | Refused> {
  if (!mpesa.pretend) return refuse("Not available: real M-Pesa is connected.");
  if (!(await ownCheck(tenant, checkId))) return notYours;
  const payment = await tenantDb(tenant.id).payment.findFirst({
    where: { id: paymentId, cvCheckId: checkId, status: "PENDING" },
    select: { checkoutRequestId: true },
  });
  if (!payment?.checkoutRequestId) return refuse("This prompt has already been answered.");
  await settlePrompt(
    tenant.id,
    payment.checkoutRequestId,
    outcome === "paid" ? { ok: true, receipt: pretendReceipt() } : { ok: false, outcome },
  );
  return followCvCheck(tenant, checkId, paymentId);
}

// Paid: the AI reads the CV once. The CV is then kept for 48 hours (deleted at once if it isn't a
// CV). Only the request that moves the check from Paid to Reading runs it, so a check is never read
// (or charged in tokens) twice.
async function readCv(tenant: CurrentTenant, checkId: string): Promise<CheckProgress> {
  const db = tenantDb(tenant.id);
  const { count } = await db.cvCheck.updateMany({
    where: { id: checkId, status: "PAID" },
    data: { status: "READING" },
  });
  if (count !== 1) return { state: "reading" };
  const check = await db.cvCheck.findFirstOrThrow({
    where: { id: checkId },
    select: {
      cvPath: true,
      cvType: true,
      jobLabel: true,
      job: {
        select: {
          title: true,
          company: true,
          location: true,
          summary: true,
          responsibilities: true,
          requirements: true,
        },
      },
    },
  });
  try {
    if (!check.cvPath) throw new AiUnavailableError("The CV is no longer stored.");
    const bytes = await fileStore.get("order-files", check.cvPath);
    const job = check.job ?? {
      title: check.jobLabel,
      company: "",
      location: "",
      summary: "",
      responsibilities: [],
      requirements: [],
    };
    const { data, usage } = await checkCvAgainstJob(
      { base64: Buffer.from(bytes).toString("base64"), mediaType: check.cvType as CheckCvType },
      job,
    );
    if (usage) await recordUsage(tenant.id, { feature: "CV check", memberId: null, ...usage });
    const { name, email, ...feedback } = data;
    await db.cvCheck.updateMany({
      where: { id: checkId },
      data: {
        status: "DONE",
        result: feedback,
        doneAt: new Date(),
        applicantName: feedback.isCv ? name.trim().slice(0, 80) : "",
        applicantEmail: feedback.isCv && z.email().safeParse(email.trim()).success ? email.trim().toLowerCase() : "",
        cvPath: feedback.isCv ? check.cvPath : null,
      },
    });
    if (!feedback.isCv) await fileStore.remove("order-files", check.cvPath).catch(() => {});
    return { state: "done" };
  } catch (error) {
    await db.cvCheck.updateMany({
      where: { id: checkId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message.slice(0, 300) : "Unknown error",
        cvPath: null,
      },
    });
    if (check.cvPath) await fileStore.remove("order-files", check.cvPath).catch(() => {});
    return { state: "error", message: SORRY };
  }
}

// ---------- The result page ----------

export async function loadCvCheck(tenant: CurrentTenant, checkId: string) {
  if (!(await hasCheckPass(tenant.id, checkId))) return null;
  const check = await tenantDb(tenant.id).cvCheck.findFirst({
    where: { id: checkId },
    select: {
      status: true,
      jobLabel: true,
      jobSlug: true,
      result: true,
      doneAt: true,
      amount: true,
      cvPath: true,
    },
  });
  if (!check) return null;
  const { cvPath, ...rest } = check;
  const feedback: CvFeedback | null = rest.result ? cvFeedbackSchema.parse(rest.result) : null;
  const keptUntil = cvPath && rest.doneAt ? checkCvKeptUntil(rest.doneAt) : null;
  return {
    ...rest,
    feedback,
    doneAt: rest.doneAt?.toISOString() ?? null,
    // While the CV is still kept for a tailored CV order: until when
    cvKeptUntil: keptUntil && keptUntil.getTime() > Date.now() ? keptUntil.toISOString() : null,
  };
}

// ---------- Ordering a tailored CV straight after a check ----------

export type CheckPrefill = {
  checkId: string;
  name: string;
  phone: string;
  email: string;
  // The checked CV, while it's still kept
  cv: { name: string; keptUntil: string } | null;
};

async function ownDoneCheck(tenant: CurrentTenant, checkId: string) {
  if (!(await hasCheckPass(tenant.id, checkId))) return null;
  return tenantDb(tenant.id).cvCheck.findFirst({
    where: { id: checkId, status: "DONE" },
    select: {
      phone: true,
      applicantName: true,
      applicantEmail: true,
      cvPath: true,
      cvName: true,
      cvType: true,
      doneAt: true,
    },
  });
}

const stillKept = (check: { cvPath: string | null; doneAt: Date | null }, now: Date) =>
  Boolean(check.cvPath && check.doneAt && checkCvKeptUntil(check.doneAt) > now);

// The order form's starting values: only for the browser that paid for the check
export async function checkPrefill(tenant: CurrentTenant, checkId: string): Promise<CheckPrefill | null> {
  const check = await ownDoneCheck(tenant, checkId);
  if (!check) return null;
  return {
    checkId,
    name: check.applicantName,
    phone: localPhone(check.phone),
    email: check.applicantEmail,
    cv: stillKept(check, new Date())
      ? { name: check.cvName, keptUntil: checkCvKeptUntil(check.doneAt!).toISOString() }
      : null,
  };
}

// The checked CV as an upload, for an order placed without choosing another file
export async function checkCvFile(tenant: CurrentTenant, checkId: string): Promise<File | null> {
  const check = await ownDoneCheck(tenant, checkId);
  if (!check || !stillKept(check, new Date())) return null;
  const bytes = await fileStore.get("order-files", check.cvPath!).catch(() => null);
  return bytes ? new File([new Uint8Array(bytes)], check.cvName, { type: check.cvType }) : null;
}

// Once the order has its own copy, the check's copy goes
export async function releaseCheckCv(tenant: CurrentTenant, checkId: string): Promise<void> {
  const db = tenantDb(tenant.id);
  const check = await db.cvCheck.findFirst({ where: { id: checkId }, select: { cvPath: true } });
  if (!check?.cvPath) return;
  await db.cvCheck.updateMany({ where: { id: checkId }, data: { cvPath: null } });
  await fileStore.remove("order-files", check.cvPath).catch(() => {});
}

export type LoadedCvCheck = NonNullable<Awaited<ReturnType<typeof loadCvCheck>>>;

// ---------- CVs past their time: nightly, and whenever a new check starts ----------

// Checks nobody paid for (the AI never read them): deleted after two hours. Checked CVs: deleted
// 48 hours after the check, unless an order took them first.
export async function deleteOldCheckCvs(tenantId: string, now: Date): Promise<number> {
  const db = tenantDb(tenantId);
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);
  const stale = await db.cvCheck.findMany({
    where: {
      cvPath: { not: null },
      OR: [
        { status: "UNPAID", createdAt: { lte: hoursAgo(2) } },
        { status: "DONE", doneAt: { lte: hoursAgo(CHECK_CV_KEEP_HOURS) } },
      ],
    },
    select: { id: true, cvPath: true },
    take: 500,
  });
  for (const check of stale) {
    await fileStore.remove("order-files", check.cvPath!).catch(() => {});
    await db.cvCheck.updateMany({ where: { id: check.id }, data: { cvPath: null } });
  }
  return stale.length;
}
