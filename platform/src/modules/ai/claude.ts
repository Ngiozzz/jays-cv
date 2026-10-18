import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { env } from "@/lib/env";
import {
  cvCheckAnswerSchema,
  cvCheckPrompt,
  PRETEND_FEEDBACK,
  type CheckCvType,
  type CheckJob,
  type CvCheckAnswer,
} from "@/modules/cv-check/cv-check";
import {
  extraTexts,
  parsePosterAnswer,
  posterAnswerSchema,
  posterPrompt,
  singleJobAnswer,
  type PosterAnswer,
  type PosterExtras,
} from "./poster-reading";
import { pretendReadingFor } from "./pretend-readings";
import {
  analysisPrompt,
  cvAnalysisSchema,
  finalCheckPrompt,
  finalCheckSchema,
  parseAnalysis,
  parseFinalCheck,
  parseReviewScreen,
  parseSummary,
  PRETEND_ANALYSIS,
  PRETEND_FINAL_CHECK,
  PRETEND_SUMMARY,
  reviewScreenPrompt,
  reviewScreenSchema,
  summaryDraftSchema,
  summaryPrompt,
  type CvAnalysis,
  type FinalCheck,
  type OrderBrief,
  type ReviewScreen,
  type SummaryDraft,
} from "./writer-tools";

// The one place the app talks to Claude. Without ANTHROPIC_API_KEY every call runs in
// "pretend" mode: it returns sample data and reports no token use.

export type AiUsage = { model: string; inputTokens: number; outputTokens: number };
export type AiResult<T> = { data: T; usage: AiUsage | null };

export class AiUnavailableError extends Error {}

export const aiPretendMode = !env.ANTHROPIC_API_KEY;

const client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;

// One request to Claude. If the API can't answer (busy, down, out of credit), the person sees a
// plain "try again" instead of an error page; the details go to the server log.
async function ask(client: Anthropic, params: Anthropic.Beta.MessageCreateParamsNonStreaming) {
  try {
    return await client.beta.messages.create(params);
  } catch (error) {
    if (!(error instanceof Anthropic.APIError)) throw error;
    console.error(`[ai] ${params.model}: API error ${error.status}`, error.message);
    throw new AiUnavailableError("The AI isn't available right now. Please try again in a few minutes.");
  }
}

// The JSON the AI wrote. The answer is read by our own forgiving checks rather than the SDK's strict
// parse, so one stray value doesn't throw away the whole answer. What couldn't be read is logged.
function answerJson(response: Anthropic.Beta.BetaMessage, task: string): unknown {
  if (response.stop_reason === "refusal") throw new AiUnavailableError(`The AI couldn't do the ${task}.`);
  const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
  try {
    return JSON.parse(text);
  } catch {
    console.error(`[ai] ${task}: unreadable answer (${response.stop_reason})`, text.slice(0, 2000));
    throw new AiUnavailableError("The AI's answer couldn't be read. Please try again.");
  }
}

export type PosterImage = { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp"; fileName: string };

// The poster, plus the text posted with it and the pages its links lead to (when there are any)
export async function readJobPoster(
  image: PosterImage,
  today: string,
  extras: PosterExtras | null = null,
): Promise<AiResult<PosterAnswer>> {
  if (!client) return { data: singleJobAnswer(pretendReadingFor(image.fileName, today)), usage: null };

  const response = await ask(client, {
    model: env.ANTHROPIC_POSTER_MODEL,
    max_tokens: 16000,
    // Reading a poster is extraction, not reasoning: low effort keeps it quick and cheap
    output_config: { effort: "low", format: betaZodOutputFormat(posterAnswerSchema) },
    // If a safety check declines (rare false positives), the API retries on a fallback model in the same call
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [
      {
        role: "user",
        content: [
          ...extraTexts(extras).map((text) => ({ type: "text" as const, text })),
          { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
          { type: "text", text: posterPrompt(today, extras) },
        ],
      },
    ],
  });

  const raw = answerJson(response, "poster reading");
  const reading = parsePosterAnswer(raw);
  if (!reading) {
    console.error("[ai] poster reading: unexpected answer", JSON.stringify(raw).slice(0, 2000));
    throw new AiUnavailableError("The AI's answer couldn't be read. Please try again.");
  }
  return {
    data: reading,
    usage: {
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

// "Check it yourself": the client's CV (a PDF or a photo) compared with one job. Feedback only.
export async function checkCvAgainstJob(
  cv: { base64: string; mediaType: CheckCvType },
  job: CheckJob,
): Promise<AiResult<CvCheckAnswer>> {
  if (!client)
    return { data: { ...PRETEND_FEEDBACK, name: "Faith Njeri", email: "faith.njeri@example.com" }, usage: null };

  const document =
    cv.mediaType === "application/pdf"
      ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data: cv.base64 } } as const)
      : ({ type: "image", source: { type: "base64", media_type: cv.mediaType, data: cv.base64 } } as const);

  const response = await ask(client, {
    model: env.ANTHROPIC_CV_CHECK_MODEL,
    max_tokens: 16000,
    // A recruiter's judgement, not deep research: medium effort keeps each check quick and cheap
    output_config: { effort: "medium", format: betaZodOutputFormat(cvCheckAnswerSchema) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [{ role: "user", content: [document, { type: "text", text: cvCheckPrompt(job) }] }],
  });

  const raw = answerJson(response, "CV check");
  const feedback = cvCheckAnswerSchema.safeParse(withMatchInRange(raw));
  if (!feedback.success) {
    console.error("[ai] CV check: unexpected answer", JSON.stringify(raw).slice(0, 2000));
    throw new AiUnavailableError("The AI's answer couldn't be read. Please try again.");
  }
  return {
    data: feedback.data,
    usage: {
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

// A match score outside 0–100 (or with decimals) is rounded into range rather than refused
function withMatchInRange(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const answer = raw as Record<string, unknown>;
  const match = Number(answer.matchPercent);
  return Number.isFinite(match) ? { ...answer, matchPercent: Math.min(100, Math.max(0, Math.round(match))) } : raw;
}

// ---------- The writer's AI helper (order page) ----------

// A CV as the AI receives it: a PDF or photo it reads directly, or the text of a Word file
export type CvDocument =
  | { kind: "pdf"; base64: string }
  | { kind: "image"; base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" }
  | { kind: "text"; text: string };

function documentBlock(cv: CvDocument): Anthropic.Beta.BetaContentBlockParam {
  if (cv.kind === "pdf")
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: cv.base64 } };
  if (cv.kind === "image")
    return { type: "image", source: { type: "base64", media_type: cv.mediaType, data: cv.base64 } };
  return { type: "document", source: { type: "text", media_type: "text/plain", data: cv.text } };
}

const usageOf = (response: Anthropic.Beta.BetaMessage): AiUsage => ({
  model: response.model,
  inputTokens: response.usage.input_tokens,
  outputTokens: response.usage.output_tokens,
});

// One document, one instruction, one structured answer read by the tool's own forgiving parser
async function askAboutDocument<T>(
  task: string,
  cv: CvDocument,
  prompt: string,
  format: Parameters<typeof betaZodOutputFormat>[0],
  parse: (raw: unknown) => T | null,
): Promise<AiResult<T>> {
  const response = await ask(client!, {
    model: env.ANTHROPIC_WRITER_MODEL,
    max_tokens: 16000,
    // A careful read of one CV: medium effort balances quality, speed and cost
    output_config: { effort: "medium", format: betaZodOutputFormat(format) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [{ role: "user", content: [documentBlock(cv), { type: "text", text: prompt }] }],
  });
  const raw = answerJson(response, task);
  const data = parse(raw);
  if (!data) {
    console.error(`[ai] ${task}: unexpected answer`, JSON.stringify(raw).slice(0, 2000));
    throw new AiUnavailableError("The AI's answer couldn't be read. Please try again.");
  }
  return { data, usage: usageOf(response) };
}

export async function analyseCv(cv: CvDocument, brief: OrderBrief): Promise<AiResult<CvAnalysis>> {
  if (!client) return { data: PRETEND_ANALYSIS, usage: null };
  return askAboutDocument("CV analysis", cv, analysisPrompt(brief), cvAnalysisSchema, parseAnalysis);
}

export async function draftSummary(cv: CvDocument, brief: OrderBrief): Promise<AiResult<SummaryDraft>> {
  if (!client) return { data: PRETEND_SUMMARY, usage: null };
  return askAboutDocument("summary drafts", cv, summaryPrompt(brief), summaryDraftSchema, parseSummary);
}

export async function checkDraft(cv: CvDocument, brief: OrderBrief): Promise<AiResult<FinalCheck>> {
  if (!client) return { data: PRETEND_FINAL_CHECK, usage: null };
  return askAboutDocument("final check", cv, finalCheckPrompt(brief), finalCheckSchema, parseFinalCheck);
}

// ---------- Review screening ----------

// Returns null in pretend mode: the owner simply sees no AI note on the review
export async function screenReview(review: {
  rating: number;
  name: string;
  role: string;
  text: string;
}): Promise<AiResult<ReviewScreen> | null> {
  if (!client) return null;
  const response = await ask(client, {
    model: env.ANTHROPIC_REVIEW_MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: betaZodOutputFormat(reviewScreenSchema) },
    messages: [{ role: "user", content: reviewScreenPrompt(review) }],
  });
  const data = parseReviewScreen(answerJson(response, "review screening"));
  if (!data) throw new AiUnavailableError("The AI's answer couldn't be read.");
  return { data, usage: usageOf(response) };
}
