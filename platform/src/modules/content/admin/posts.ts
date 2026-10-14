import { z } from "zod";

// Career tips tab: writers draft articles and send them to the owner; only the owner publishes

export const POST_CATEGORIES = ["CV tips", "LinkedIn", "Interviews", "Job search", "Career growth"] as const;

// The cover photos to choose from (in /public/img/photos), with their description for screen readers
export const COVERS = [
  {
    path: "/img/photos/blog-cv-mistakes.jpg",
    label: "Recruiter reading a CV",
    alt: "Recruiter reviewing a CV on a clipboard",
  },
  { path: "/img/photos/blog-linkedin.jpg", label: "Laptop, smiling", alt: "Smiling professional using a laptop" },
  {
    path: "/img/photos/blog-tell-me-about-yourself.jpg",
    label: "Interview handshake",
    alt: "Candidate shaking hands at a job interview",
  },
  {
    path: "/img/photos/blog-ngo-jobs.jpg",
    label: "Taking notes",
    alt: "Job seeker taking notes while searching for jobs",
  },
  {
    path: "/img/photos/blog-ats.jpg",
    label: "Application on a laptop",
    alt: "Professional reviewing an application on a laptop",
  },
  {
    path: "/img/photos/blog-salary.jpg",
    label: "Negotiation",
    alt: "Two professionals shaking hands after a negotiation",
  },
  { path: "/img/photos/blog-uk-canada-cv.jpg", label: "Video call", alt: "Professional smiling during a video call" },
  {
    path: "/img/photos/blog-interview-questions.jpg",
    label: "Welcomed to an interview",
    alt: "Interviewer welcoming a candidate into an office",
  },
  { path: "/img/photos/blog-fake-jobs.jpg", label: "Business handshake", alt: "Close-up of a business handshake" },
  {
    path: "/img/photos/blog-career-change.jpg",
    label: "Professional in a suit",
    alt: "Confident professional in a suit",
  },
] as const;

const coverPaths = COVERS.map((cover) => cover.path) as [string, ...string[]];
export const coverAlt = (path: string) => COVERS.find((cover) => cover.path === path)?.alt ?? "";

export const postSchema = z.object({
  title: z.string().trim().min(5, "Give the article a title").max(100, "Keep the title under 100 characters"),
  category: z.enum(POST_CATEGORIES, { error: "Pick a category" }),
  cover: z.enum(coverPaths, { error: "Pick a cover photo" }),
  excerpt: z
    .string()
    .trim()
    .min(20, "Write a sentence or two for Google and the Career tips page")
    .max(160, "Keep it under 160 characters (Google cuts the rest)"),
  body: z.string().trim().min(50, "Write the article").max(20_000, "That's very long. Split it into two articles"),
});

export type PostInput = z.infer<typeof postSchema>;

export function postFormToInput(form: FormData): unknown {
  return {
    title: form.get("title") ?? "",
    category: form.get("category") ?? "",
    cover: form.get("cover") ?? "",
    excerpt: form.get("excerpt") ?? "",
    body: String(form.get("body") ?? "").replace(/\r\n/g, "\n"),
  };
}

// The web address part, e.g. "5-things-recruiters-look-for"
export const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .replace(/-$/, "") || "article";

// The first free address: "cv-tips", then "cv-tips-2", "cv-tips-3"…
export function freeSlug(base: string, taken: string[]) {
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

// About 200 words a minute
export const readMinutes = (body: string) => Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200));

// ---------- Who may do what ----------

export type PostStatus = "DRAFT" | "REVIEW" | "PUBLISHED";
export const POST_INTENTS = ["draft", "review", "publish", "unpublish"] as const;
export type PostIntent = (typeof POST_INTENTS)[number];

type Editor = { id: string; owner: boolean };
type PostOwnership = { authorId: string | null; status: PostStatus };

// The owner edits any article; a writer edits only their own, and only until it's published
export function canEditPost(editor: Editor, post: PostOwnership) {
  return editor.owner || (post.authorId === editor.id && post.status !== "PUBLISHED");
}

// What pressing a button does to the article's status, or why it isn't allowed
export function statusAfter(
  editor: Editor,
  intent: PostIntent,
): { ok: true; status: PostStatus } | { ok: false; error: string } {
  if (intent === "draft") return { ok: true, status: "DRAFT" };
  if (intent === "review") return { ok: true, status: "REVIEW" };
  if (!editor.owner) return { ok: false, error: "Only the owner can publish. Send it for review instead." };
  return { ok: true, status: intent === "publish" ? "PUBLISHED" : "DRAFT" };
}

export const STATUS_LABEL: Record<PostStatus, string> = {
  DRAFT: "Draft",
  REVIEW: "Waiting for owner",
  PUBLISHED: "Published",
};

// How a save reads in "Recent changes"
export function describePostSave(intent: PostIntent, title: string, wasPublished: boolean) {
  if (intent === "publish") return wasPublished ? `updated the article "${title}"` : `published "${title}"`;
  if (intent === "unpublish") return `unpublished "${title}"`;
  if (intent === "review") return `sent "${title}" to the owner for review`;
  return `saved the draft "${title}"`;
}
