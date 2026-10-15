import type { FileKind } from "@/generated/prisma/enums";

// An order's files, split by who they came from: the client's own (their current CV, a job advert)
// and ours (drafts and the final version). Used by the team's order page and the client's tracking page.

export type OrderFileRecord = {
  id: string;
  kind: FileKind;
  version: number | null;
  name: string;
  sizeBytes: number;
  note: string | null;
  createdAt: Date;
};

export type OrderFileView = {
  id: string;
  name: string;
  label: string;
  size: string;
  note: string | null;
  at: string;
  url: string;
};

const LABEL: Record<FileKind, string> = {
  CURRENT_CV: "Current CV",
  JOB_ADVERT: "Job advert",
  DRAFT: "Draft",
  FINAL: "Final version",
  JOB_POSTER: "Poster",
  CHANGES: "File with change request",
  OTHER: "Other file",
};

export const isOurs = (kind: FileKind) => kind === "DRAFT" || kind === "FINAL";

export const fileLabel = (file: Pick<OrderFileRecord, "kind" | "version">) =>
  file.kind === "DRAFT" && file.version ? `Draft v${file.version}` : LABEL[file.kind];

export function fileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Every file is opened (and downloaded) through the permission-checked route, never a public link
export const fileUrl = (id: string, download = false) => `/api/order-files/${id}${download ? "?download" : ""}`;

const view = (file: OrderFileRecord): OrderFileView => ({
  id: file.id,
  name: file.name,
  label: fileLabel(file),
  size: fileSize(file.sizeBytes),
  note: file.note,
  at: file.createdAt.toISOString(),
  url: fileUrl(file.id),
});

// Newest first within each group, so the latest draft is on top
export function groupFiles(files: OrderFileRecord[]) {
  const newest = [...files].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return {
    fromClient: newest.filter((file) => !isOurs(file.kind)).map(view),
    fromUs: newest.filter((file) => isOurs(file.kind)).map(view),
  };
}

export const MAX_FILE_NOTE = 500;
