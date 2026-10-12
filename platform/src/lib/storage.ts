import "server-only";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// File storage behind one interface, so the app runs without keys and the provider can be swapped.
// Buckets: "job-posters" is public (posters are public job adverts). Client CVs will get a private
// bucket with short-lived signed links only.

export type Bucket = "job-posters";

export interface FileStore {
  put(bucket: Bucket, filePath: string, bytes: Uint8Array, contentType: string): Promise<void>;
  remove(bucket: Bucket, filePath: string): Promise<void>;
  publicUrl(bucket: Bucket, filePath: string): string;
}

function supabaseStore(url: string, serviceRoleKey: string): FileStore {
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const ready = new Map<Bucket, Promise<void>>();

  // Created on first use, so a new Supabase project needs no manual setup
  const ensureBucket = (bucket: Bucket) => {
    if (!ready.has(bucket)) {
      ready.set(
        bucket,
        (async () => {
          const existing = await client.storage.getBucket(bucket);
          if (existing.data) return;
          const created = await client.storage.createBucket(bucket, {
            public: true,
            fileSizeLimit: "6MB",
            allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
          });
          if (created.error) throw created.error;
        })(),
      );
    }
    return ready.get(bucket)!;
  };

  return {
    async put(bucket, filePath, bytes, contentType) {
      await ensureBucket(bucket);
      const { error } = await client.storage.from(bucket).upload(filePath, bytes, { contentType, upsert: true });
      if (error) throw error;
    },
    async remove(bucket, filePath) {
      const { error } = await client.storage.from(bucket).remove([filePath]);
      if (error) throw error;
    },
    publicUrl(bucket, filePath) {
      return client.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
    },
  };
}

// Development stand-in: files go to platform/.uploads and are served by /api/dev-files
export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".uploads");

function localStore(): FileStore {
  const fullPath = (bucket: Bucket, filePath: string) => path.join(LOCAL_UPLOAD_DIR, bucket, filePath);
  return {
    async put(bucket, filePath, bytes) {
      const target = fullPath(bucket, filePath);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes);
    },
    async remove(bucket, filePath) {
      await rm(fullPath(bucket, filePath), { force: true });
    },
    publicUrl(bucket, filePath) {
      return `/api/dev-files/${bucket}/${filePath}`;
    },
  };
}

export const usingLocalStorage = !(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

export const fileStore: FileStore =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? supabaseStore(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    : localStore();
