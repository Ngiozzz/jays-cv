import type { z } from "zod";

// What a Website content save returns to its form: a message for the toast, or errors by field
export type FieldErrors = Record<string, string>;
export type SaveResult = { ok: true; message: string } | { ok: false; fieldErrors: FieldErrors };

export const fieldErrorsOf = (error: z.ZodError): FieldErrors =>
  Object.fromEntries(error.issues.map((issue) => [issue.path.map(String).join("."), issue.message]));
