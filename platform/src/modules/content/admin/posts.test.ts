import { describe, expect, it } from "vitest";
import {
  canEditPost,
  COVERS,
  describePostSave,
  freeSlug,
  postSchema,
  readMinutes,
  slugify,
  statusAfter,
} from "./posts";

const owner = { id: "o", owner: true };
const writer = { id: "w", owner: false };

describe("postSchema", () => {
  const article = {
    title: "  5 things recruiters look for ",
    category: "CV tips",
    cover: COVERS[0].path,
    excerpt: "What Kenyan recruiters check first on a graduate CV.",
    body: "## Start strong\n\n" + "word ".repeat(60),
  };

  it("accepts a complete article and tidies it", () => {
    expect(postSchema.parse(article).title).toBe("5 things recruiters look for");
  });

  it("refuses a missing title, an unknown cover and a summary Google would cut", () => {
    expect(postSchema.safeParse({ ...article, title: "" }).success).toBe(false);
    expect(postSchema.safeParse({ ...article, cover: "/evil.jpg" }).success).toBe(false);
    expect(postSchema.safeParse({ ...article, excerpt: "x".repeat(161) }).success).toBe(false);
  });
});

describe("addresses", () => {
  it("are readable and never clash", () => {
    expect(slugify("Tell me about yourself: 3 answers!")).toBe("tell-me-about-yourself-3-answers");
    expect(slugify("???")).toBe("article");
    expect(freeSlug("cv-tips", ["cv-tips", "cv-tips-2"])).toBe("cv-tips-3");
    expect(freeSlug("new", ["cv-tips"])).toBe("new");
  });
});

it("estimates reading time at about 200 words a minute", () => {
  expect(readMinutes("word ".repeat(1000))).toBe(5);
  expect(readMinutes("short")).toBe(1);
});

describe("who may do what", () => {
  it("lets writers edit only their own unpublished articles", () => {
    expect(canEditPost(writer, { authorId: "w", status: "REVIEW" })).toBe(true);
    expect(canEditPost(writer, { authorId: "w", status: "PUBLISHED" })).toBe(false);
    expect(canEditPost(writer, { authorId: "someone else", status: "DRAFT" })).toBe(false);
    expect(canEditPost(owner, { authorId: "w", status: "PUBLISHED" })).toBe(true);
  });

  it("lets only the owner publish", () => {
    expect(statusAfter(writer, "review")).toEqual({ ok: true, status: "REVIEW" });
    expect(statusAfter(writer, "publish").ok).toBe(false);
    expect(statusAfter(owner, "publish")).toEqual({ ok: true, status: "PUBLISHED" });
    expect(statusAfter(owner, "unpublish")).toEqual({ ok: true, status: "DRAFT" });
  });

  it("describes each save", () => {
    expect(describePostSave("publish", "CV tips", false)).toBe('published "CV tips"');
    expect(describePostSave("publish", "CV tips", true)).toBe('updated the article "CV tips"');
    expect(describePostSave("review", "CV tips", false)).toBe('sent "CV tips" to the owner for review');
  });
});
