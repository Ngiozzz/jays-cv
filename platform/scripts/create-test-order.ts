// Development only: creates a test order so the tracking page and admin screens have something to show
// before the website's order card exists.
//
//   npm run dev:test-order              (an order a writer is working on)
//   npm run dev:test-order -- draft     (new | paid | writing | draft | revisions | delivered)
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import type { OrderStatus } from "../src/generated/prisma/enums";
import { hashTrackingToken, newTrackingToken, sealTrackingToken } from "../src/modules/orders/tracking-token";

config({ path: ".env.local" });
if (process.env.NODE_ENV === "production") throw new Error("Test orders are for development only");

const STAGES: Record<string, OrderStatus> = {
  new: "NEW",
  paid: "PAID",
  writing: "WRITING",
  draft: "DRAFT_SENT",
  revisions: "REVISIONS",
  delivered: "DELIVERED",
};
const stage = process.argv[2] ?? "writing";
const status = STAGES[stage];
if (!status) throw new Error(`Unknown stage "${stage}". Use one of: ${Object.keys(STAGES).join(", ")}`);

const PHONE = "0712 345 678";
const HOUR = 3_600_000;
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! }),
});

async function main() {
  const slug = process.env.DEFAULT_TENANT_SLUG!;
  const tenant = await db.tenant.findUniqueOrThrow({ where: { slug } });
  const pkg = await db.package.findFirstOrThrow({ where: { tenantId: tenant.id, shortName: "Professional" } });
  // The real (or dev) owner, never an account made by the browser tests
  const owner = await db.membership.findFirst({
    where: {
      tenantId: tenant.id,
      role: "OWNER",
      status: "ACTIVE",
      user: { email: { not: { endsWith: "@e2e.jaycvs.test" } } },
    },
  });
  const token = newTrackingToken();
  const reached = (s: OrderStatus) => ["NEW", "PAID", "WRITING", "DRAFT_SENT", "REVISIONS", "DELIVERED"].indexOf(s);
  const past = (s: OrderStatus) => reached(status) >= reached(s);
  const now = Date.now();
  const at = (hoursAgo: number) => new Date(now - hoursAgo * HOUR);

  const order = await db.$transaction(async (tx) => {
    // The order number is handed out inside the same transaction, so two orders never share one
    const { nextOrderNumber } = await tx.tenant.update({
      where: { id: tenant.id },
      data: { nextOrderNumber: { increment: 1 } },
      select: { nextOrderNumber: true },
    });
    const number = nextOrderNumber - 1;
    const writerId = past("WRITING") ? (owner?.id ?? null) : null;
    const created = await tx.order.create({
      data: {
        tenantId: tenant.id,
        number,
        status,
        itemName: pkg.name,
        packageId: pkg.id,
        amount: pkg.price,
        firstDraftHours: pkg.firstDraftHours,
        revisionRounds: pkg.revisionRounds,
        revisionWindowDays: pkg.revisionWindowDays,
        clientName: "Test Client",
        clientPhone: PHONE,
        clientEmail: "test.client@example.com",
        targetRole: "Marketing Officer",
        industry: "FMCG",
        experience: "3 years",
        source: "test script",
        trackingTokenHash: hashTrackingToken(token),
        trackingTokenSealed: sealTrackingToken(token, process.env.BETTER_AUTH_SECRET ?? ""),
        writerId,
        createdAt: at(10),
        paidAt: past("PAID") ? at(9.9) : null,
        acceptedAt: past("WRITING") ? at(9) : null,
        draftSentAt: past("DRAFT_SENT") ? at(3) : null,
        deliveredAt: status === "DELIVERED" ? at(1) : null,
      },
    });
    const events: Prisma.OrderEventCreateManyInput[] = [
      { kind: "placed", actorType: "CLIENT" as const, at: at(10) },
      ...(past("PAID")
        ? [
            {
              kind: "paid",
              actorType: "MPESA" as const,
              data: { amount: pkg.price, receipt: "TST4H7XQ2P" },
              at: at(9.9),
            },
          ]
        : []),
      ...(past("WRITING") ? [{ kind: "accepted", actorType: "STAFF" as const, actorId: writerId, at: at(9) }] : []),
      ...(past("DRAFT_SENT")
        ? [{ kind: "draftSent", actorType: "STAFF" as const, actorId: writerId, data: { version: "v1" }, at: at(3) }]
        : []),
    ].map((event) => ({ ...event, tenantId: tenant.id, orderId: created.id, visibleToClient: true }));
    if (status === "REVISIONS") {
      const text = "Please add my 2023 sales award";
      await tx.orderRevision.create({
        data: { tenantId: tenant.id, orderId: created.id, round: 1, requestedBy: "Client", text, requestedAt: at(2) },
      });
      events.push({
        tenantId: tenant.id,
        orderId: created.id,
        kind: "changesRequested",
        actorType: "CLIENT",
        data: { round: 1, text },
        visibleToClient: true,
        at: at(2),
      });
    }
    if (status === "DELIVERED")
      events.push({
        tenantId: tenant.id,
        orderId: created.id,
        kind: "completed",
        actorType: "CLIENT",
        visibleToClient: true,
        at: at(1),
      });
    await tx.orderEvent.createMany({ data: events });
    return created;
  });

  // The client's CV, sent with the order. Only with the local file store (no Supabase Storage key):
  // the real store is written to by the app itself.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const storagePath = `${tenant.id}/${order.id}/client-cv.pdf`;
    const dir = join(process.cwd(), ".uploads", "order-files", tenant.id, order.id);
    await mkdir(dir, { recursive: true });
    const pdf =
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n";
    await writeFile(join(process.cwd(), ".uploads", "order-files", storagePath), pdf);
    await db.storedFile.create({
      data: {
        tenantId: tenant.id,
        orderId: order.id,
        kind: "CURRENT_CV",
        name: "Test_Client_CV_2022.pdf",
        mimeType: "application/pdf",
        sizeBytes: pdf.length,
        storagePath,
        note: "This is my old CV. Please make it fit marketing roles.",
        uploadedBy: "client",
      },
    });
  }

  const ref = `${tenant.orderPrefix}-${order.number}`;
  console.log(`\nCreated test order ${ref} (${stage})`);
  console.log(`  Track it at   http://localhost:3000/track   with order ${ref} and phone ${PHONE}`);
  console.log(`  Private link  http://localhost:3000/t/${token}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
