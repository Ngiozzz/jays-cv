import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { formatKes } from "@/lib/money";
import { fileStore } from "@/lib/storage";
import { tenantDb } from "@/lib/tenant-db";
import { mpesa } from "@/modules/payments/gateway";
import { displayPhone } from "@/modules/payments/mpesa";
import { takeOrderNumber } from "@/modules/tenants/tenants.repo";
import type { CurrentTenant } from "@/modules/tenants/tenants.service";
import { siteUrl } from "./order-detail.service";
import { orderRef } from "./orders.rules";
import { findJobForOrder } from "@/modules/jobs/jobs.repo";
import { cvProblem, NEEDS, orderDetailsSchema, parseItem, PLACE_LIMIT, tailoringProblems } from "./place-order";
import { grantTrackingPass } from "./tracking-pass";
import * as trackingRepo from "./tracking.repo";
import { hashTrackingToken, newTrackingToken, sealTrackingToken } from "./tracking-token";

// The website's order card: creates the order, stores the client's CV privately, and lets their
// browser straight into the tracking page. The price and terms are copied from the price list now,
// so later price changes never alter an order already placed.

export type PlaceOrderResult =
  | {
      ok: true;
      ref: string;
      firstName: string;
      itemName: string;
      amount: string;
      // For the pay box
      amountDue: number;
      payPhone: string;
      pretendMpesa: boolean;
      trackingUrl: string;
      paybill: string;
      cvName: string | null;
      // A tailored CV: the job it's for
      forJob: string | null;
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const placedKey = (ip: string) => `placed:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
const extensionOf = (name: string) => /\.([a-z0-9]{1,5})$/i.exec(name)?.[1].toLowerCase() ?? "bin";

async function findItem(tenantId: string, item: { type: "package" | "service"; id: string }) {
  const db = tenantDb(tenantId);
  if (item.type === "package") {
    const pkg = await db.package.findFirst({ where: { id: item.id, visible: true } });
    return (
      pkg && {
        itemName: pkg.name,
        packageId: pkg.id,
        serviceId: null,
        amount: pkg.price,
        firstDraftHours: pkg.firstDraftHours,
        revisionRounds: pkg.revisionRounds,
        revisionWindowDays: pkg.revisionWindowDays,
        needsJobAdvert: false,
      }
    );
  }
  const service = await db.service.findFirst({ where: { id: item.id, visible: true } });
  return (
    service && {
      itemName: service.name,
      packageId: null,
      serviceId: service.id,
      amount: service.price,
      firstDraftHours: service.firstDraftHours,
      revisionRounds: service.revisionRounds,
      revisionWindowDays: null,
      needsJobAdvert: service.needsJobAdvert,
    }
  );
}

export async function placeOrder(
  tenant: CurrentTenant,
  raw: unknown,
  cv: File | null,
  ip: string,
  advert: File | null = null,
): Promise<PlaceOrderResult> {
  const parsed = orderDetailsSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }
  const details = parsed.data;
  const file = cv && cv.size > 0 ? cv : null;
  const problem = cvProblem(file, details.noCv);
  if (problem) return { ok: false, error: problem, fieldErrors: { cv: problem } };

  const visitor = placedKey(ip);
  const since = new Date(Date.now() - PLACE_LIMIT.minutes * 60_000);
  if ((await trackingRepo.countWrongTries(tenant.id, visitor, since)) >= PLACE_LIMIT.orders)
    return {
      ok: false,
      error: "You've placed several orders just now. Please wait a while, or message us on WhatsApp.",
    };

  const found = await findItem(tenant.id, parseItem(details.item)!);
  if (!found) return { ok: false, error: "That package is no longer offered. Please choose another." };
  const { needsJobAdvert, ...item } = found;

  // A CV tailored to a job: the job page it came from, or the advert the client sent
  const advertFile = needsJobAdvert && advert && advert.size > 0 ? advert : null;
  const job = needsJobAdvert && details.jobSlug ? await findJobForOrder(tenant.id, details.jobSlug) : null;
  if (needsJobAdvert) {
    const fieldErrors = tailoringProblems({
      hasCv: file !== null,
      fromJobPage: job !== null,
      jobAdvert: details.jobAdvert,
      hasAdvertFile: advertFile !== null,
    });
    const advertProblem = advertFile && cvProblem(advertFile, false);
    if (advertProblem) fieldErrors.advert = advertProblem.replace("your CV", "the advert");
    if (Object.keys(fieldErrors).length)
      return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }

  const orderId = randomUUID();
  const token = newTrackingToken();
  const cvPath = file
    ? `${tenant.id}/${orderId}/client-cv-${randomBytes(6).toString("hex")}.${extensionOf(file.name)}`
    : null;
  if (file && cvPath) await fileStore.put("order-files", cvPath, new Uint8Array(await file.arrayBuffer()), file.type);
  const advertPath = advertFile
    ? `${tenant.id}/${orderId}/job-advert-${randomBytes(6).toString("hex")}.${extensionOf(advertFile.name)}`
    : null;
  if (advertFile && advertPath)
    await fileStore.put("order-files", advertPath, new Uint8Array(await advertFile.arrayBuffer()), advertFile.type);
  const forJob = job ? `${job.title} at ${job.company}` : null;

  const need = NEEDS.find((choice) => choice.key === details.need);
  const notes = [need && `Chose "${need.title}" on the website.`, details.notes].filter(Boolean).join("\n\n");
  try {
    const number = await takeOrderNumber(tenant.id);
    await tenantDb(tenant.id).$transaction(
      async (tx) => {
        await tx.order.create({
          data: {
            id: orderId,
            tenantId: tenant.id,
            number,
            ...item,
            clientName: details.name,
            clientPhone: details.phone,
            clientEmail: details.email || null,
            whatsappUpdates: details.whatsappUpdates,
            targetRole: details.targetRole || job?.title || null,
            jobId: job?.id ?? null,
            jobAdvert: needsJobAdvert ? details.jobAdvert || null : null,
            notes: notes || null,
            noCv: details.noCv && !file,
            source: "website",
            trackingTokenHash: hashTrackingToken(token),
            trackingTokenSealed: sealTrackingToken(token, env.BETTER_AUTH_SECRET),
          },
        });
        if (file && cvPath)
          await tx.storedFile.create({
            data: {
              tenantId: tenant.id,
              orderId,
              kind: "CURRENT_CV",
              name: file.name.slice(0, 120),
              mimeType: file.type,
              sizeBytes: file.size,
              storagePath: cvPath,
              uploadedBy: "client",
            },
          });
        if (advertFile && advertPath)
          await tx.storedFile.create({
            data: {
              tenantId: tenant.id,
              orderId,
              kind: "JOB_ADVERT",
              name: advertFile.name.slice(0, 120),
              mimeType: advertFile.type,
              sizeBytes: advertFile.size,
              storagePath: advertPath,
              uploadedBy: "client",
            },
          });
        await tx.orderEvent.create({
          data: { tenantId: tenant.id, orderId, kind: "placed", actorType: "CLIENT", visibleToClient: true },
        });
        await tx.trackingAttempt.create({ data: { tenantId: tenant.id, key: visitor } });
      },
      { maxWait: 10_000, timeout: 20_000 },
    );
    const paybill = (await tenantDb(tenant.id).businessSettings.findFirstOrThrow({ select: { paybill: true } }))
      .paybill;
    await grantTrackingPass(tenant.id, orderId);
    return {
      ok: true,
      ref: orderRef(tenant.orderPrefix, number),
      firstName: details.name.split(/\s+/)[0],
      itemName: item.itemName,
      amount: formatKes(item.amount),
      amountDue: item.amount,
      payPhone: displayPhone(details.phone),
      pretendMpesa: mpesa.pretend,
      trackingUrl: `${siteUrl(tenant)}/t/${token}`,
      paybill,
      cvName: file?.name ?? null,
      forJob,
    };
  } catch (error) {
    if (cvPath) await fileStore.remove("order-files", cvPath).catch(() => {});
    if (advertPath) await fileStore.remove("order-files", advertPath).catch(() => {});
    throw error;
  }
}
