import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { LOCAL_UPLOAD_DIR, usingLocalStorage } from "@/lib/storage";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// Serves files from the local stand-in store while developing without Supabase Storage keys.
// Never active in production, where files are served by Supabase.
export async function GET(_request: Request, { params }: RouteContext<"/api/dev-files/[...path]">) {
  if (env.NODE_ENV === "production" || !usingLocalStorage) return new Response("Not found", { status: 404 });
  const parts = (await params).path;
  // Private client files are only served through the permission-checked order files route
  if (parts[0] === "order-files") return new Response("Not found", { status: 404 });
  const target = path.resolve(LOCAL_UPLOAD_DIR, ...parts);
  // Refuse anything that would step outside the upload folder (e.g. "../")
  if (!target.startsWith(LOCAL_UPLOAD_DIR + path.sep)) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(target);
    return new Response(bytes, {
      headers: { "content-type": TYPES[path.extname(target).toLowerCase()] ?? "application/octet-stream" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
