import "server-only";
import { docxText } from "@/lib/docx-text";
import { fileStore } from "@/lib/storage";
import { tenantDb } from "@/lib/tenant-db";
import {
  AiUnavailableError,
  analyseCv,
  checkDraft,
  draftSummary,
  type AiResult,
  type CvDocument,
} from "@/modules/ai/claude";
import { AI_PAUSED_MESSAGE, aiStopped } from "@/modules/ai/tokens";
import { getTokenBalance } from "@/modules/ai/tokens.service";
import { recordUsage } from "@/modules/ai/tokens.repo";
import { TOOL_LABEL, type OrderBrief, type WriterTool } from "@/modules/ai/writer-tools";
import type { CurrentMember } from "@/modules/team/current-member";
import { canWorkOn } from "./order-detail.service";

// The writer's AI helper on an order page: analyse the client's CV, draft the professional summary,
// and check a draft before it's sent. Only the order's writer and the owner use it, while the order
// is being worked on. Each result is kept, so opening the order again costs nothing.

export type AiHelperResult = { tool: WriterTool; fileName: string; at: string; by: string; data: unknown };
export type AiHelperOutcome = { ok: true; result: AiHelperResult } | { ok: false; error: string };

const WORKING = ["WRITING", "REVISIONS", "DRAFT_SENT"];
const MAX_BYTES = 10 * 1024 * 1024;

// The latest result of each tool on an order, for the page
export async function latestAiResults(tenantId: string, orderId: string): Promise<AiHelperResult[]> {
  const rows = await tenantDb(tenantId).orderAiResult.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    select: { kind: true, fileName: true, result: true, createdAt: true, createdBy: { select: { displayName: true } } },
  });
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    if (seen.has(row.kind)) return [];
    seen.add(row.kind);
    return [
      {
        tool: row.kind as WriterTool,
        fileName: row.fileName,
        at: row.createdAt.toISOString(),
        by: row.createdBy?.displayName ?? "Someone",
        data: row.result,
      },
    ];
  });
}

// A file as the AI reads it: PDFs and photos directly, Word documents as their text
export function toCvDocument(bytes: Uint8Array, mimeType: string): CvDocument | string {
  const base64 = Buffer.from(bytes).toString("base64");
  if (mimeType === "application/pdf") return { kind: "pdf", base64 };
  if (mimeType === "image/jpeg" || mimeType === "image/png" || mimeType === "image/webp")
    return { kind: "image", base64, mediaType: mimeType };
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const text = docxText(bytes);
    return text && text.length > 40
      ? { kind: "text", text }
      : "This Word file couldn't be read. Save it as PDF and upload that.";
  }
  if (mimeType === "application/msword")
    return "This is an old Word (.doc) file the AI can't read. Save it as .docx or PDF and upload that.";
  return "Upload a PDF, Word (.docx) file or photo.";
}

export async function runWriterTool(
  member: CurrentMember,
  orderId: string,
  tool: WriterTool,
  upload: File | null,
): Promise<AiHelperOutcome> {
  const tenantId = member.tenant.id;
  const db = tenantDb(tenantId);
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      writerId: true,
      itemName: true,
      targetRole: true,
      industry: true,
      experience: true,
      notes: true,
      jobAdvert: true,
      job: { select: { title: true, company: true, responsibilities: true, requirements: true } },
      files: {
        where: { deletedAt: null, kind: { in: ["CURRENT_CV", "DRAFT", "FINAL"] } },
        orderBy: { createdAt: "desc" },
        select: { kind: true, name: true, mimeType: true, storagePath: true },
      },
    },
  });
  if (!order) return { ok: false, error: "This order no longer exists." };
  if (!canWorkOn(member, order))
    return { ok: false, error: "Only the writer on this order and the owner can use the AI helper." };
  if (!WORKING.includes(order.status))
    return { ok: false, error: "The AI helper works while an order is being written." };
  const stopped = aiStopped(await getTokenBalance(tenantId));
  if (stopped === "paused") return { ok: false, error: AI_PAUSED_MESSAGE };
  if (stopped) return { ok: false, error: "The AI tokens have run out. Ask your developer for more." };

  // What to read: a file the writer chose, or the client's CV (analysis, summary) / our latest draft (final check)
  let document: CvDocument | string;
  let fileName: string;
  if (upload && upload.size > 0) {
    if (upload.size > MAX_BYTES) return { ok: false, error: "That file is over 10 MB." };
    document = toCvDocument(new Uint8Array(await upload.arrayBuffer()), upload.type);
    fileName = upload.name || "Uploaded file";
  } else {
    const wanted = tool === "final-check" ? ["DRAFT", "FINAL"] : ["CURRENT_CV"];
    const file = order.files.find((candidate) => wanted.includes(candidate.kind));
    if (!file)
      return {
        ok: false,
        error:
          tool === "final-check"
            ? "Choose your draft file first (PDF or Word)."
            : "The client didn't send a CV. Upload one to use this.",
      };
    document = toCvDocument(await fileStore.get("order-files", file.storagePath), file.mimeType);
    fileName = file.name;
  }
  if (typeof document === "string") return { ok: false, error: document };

  const brief: OrderBrief = {
    service: order.itemName,
    targetRole: order.targetRole ?? "",
    industry: order.industry ?? "",
    experience: order.experience ?? "",
    notes: order.notes ?? "",
    job: order.job
      ? [
          `${order.job.title} at ${order.job.company}`,
          ...order.job.responsibilities.map((item) => `- ${item}`),
          "Requirements:",
          ...order.job.requirements.map((item) => `- ${item}`),
        ].join("\n")
      : (order.jobAdvert ?? ""),
  };

  let answer: AiResult<unknown>;
  try {
    answer =
      tool === "analysis"
        ? await analyseCv(document, brief)
        : tool === "summary"
          ? await draftSummary(document, brief)
          : await checkDraft(document, brief);
  } catch (error) {
    if (error instanceof AiUnavailableError) return { ok: false, error: error.message };
    throw error;
  }
  if ((answer.data as { isCv?: boolean }).isCv === false)
    return { ok: false, error: `That file doesn't look like a CV (${fileName}).` };

  if (answer.usage) {
    await recordUsage(tenantId, { feature: TOOL_LABEL[tool], memberId: member.id, orderId, ...answer.usage });
  }
  const saved = await db.orderAiResult.create({
    data: {
      tenantId,
      orderId,
      kind: tool,
      fileName,
      result: answer.data as object,
      createdById: member.id,
    },
  });
  return {
    ok: true,
    result: { tool, fileName, at: saved.createdAt.toISOString(), by: member.name, data: answer.data },
  };
}
