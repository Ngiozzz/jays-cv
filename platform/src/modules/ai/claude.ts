import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { env } from "@/lib/env";
import { PRETEND_READING, posterPrompt, posterReadingSchema, type PosterReading } from "./poster-reading";

// The one place the app talks to Claude. Without ANTHROPIC_API_KEY every call runs in
// "pretend" mode: it returns sample data and reports no token use.

export type AiUsage = { model: string; inputTokens: number; outputTokens: number };
export type AiResult<T> = { data: T; usage: AiUsage | null };

export class AiUnavailableError extends Error {}

export const aiPretendMode = !env.ANTHROPIC_API_KEY;

const client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;

export type PosterImage = { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };

export async function readJobPoster(image: PosterImage, today: string): Promise<AiResult<PosterReading>> {
  if (!client) return { data: PRETEND_READING, usage: null };

  const response = await client.beta.messages.parse({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 16000,
    // Reading a poster is extraction, not reasoning: low effort keeps it quick and cheap
    output_config: { effort: "low", format: betaZodOutputFormat(posterReadingSchema) },
    // If a safety check declines (rare false positives), the API retries on a fallback model in the same call
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
          { type: "text", text: posterPrompt(today) },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new AiUnavailableError("The AI couldn't read this image.");
  if (!response.parsed_output) throw new AiUnavailableError("The AI's answer couldn't be read. Please try again.");
  return {
    data: response.parsed_output,
    usage: {
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}
