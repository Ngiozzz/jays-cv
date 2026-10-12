// Rules for job poster images (pure, shared by the form and the server)

export const POSTER_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PosterType = (typeof POSTER_TYPES)[number];

// Posters are shrunk in the browser before upload, so real files are far smaller than this
export const POSTER_MAX_BYTES = 6 * 1024 * 1024;

export function posterProblem(file: { type: string; size: number }): string | null {
  if (!POSTER_TYPES.includes(file.type as PosterType)) return "Please choose an image (JPG, PNG or WebP).";
  if (file.size > POSTER_MAX_BYTES) return "That image is too large. Please use one under 6 MB.";
  if (file.size === 0) return "That image is empty. Please choose it again.";
  return null;
}

export const isPosterType = (type: string): type is PosterType => POSTER_TYPES.includes(type as PosterType);

const EXTENSION: Record<PosterType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// tenant/job/random name: never guessable from the job, and a new upload never overwrites an old link
export function posterPath(tenantId: string, jobId: string, type: PosterType, randomPart: string): string {
  return `${tenantId}/${jobId}/${randomPart}.${EXTENSION[type]}`;
}
