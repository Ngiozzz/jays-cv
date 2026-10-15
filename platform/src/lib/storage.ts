import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// File storage behind one interface, so the app runs without keys and the provider can be swapped.
// Buckets: "job-posters", "company-logos", "sample-cvs" and "about-photos" are public (they appear on the website).
// "order-files" (client CVs, drafts, finals) is private: never given a public address, only read by
// the server after checking who is asking (see modules/orders/order-files).

export type Bucket = "job-posters" | "company-logos" | "sample-cvs" | "about-photos" | "order-files";
export type PublicBucket = Exclude<Bucket, "order-files">;

const IMAGES = ["image/jpeg", "image/png", "image/webp"];
export const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ...IMAGES,
];

const BUCKETS: Record<Bucket, { public: boolean; limit: string; types: string[] }> = {
  "job-posters": { public: true, limit: "6MB", types: IMAGES },
  "company-logos": { public: true, limit: "1MB", types: IMAGES },
  "sample-cvs": { public: true, limit: "4MB", types: IMAGES },
  "about-photos": { public: true, limit: "4MB", types: IMAGES },
  "order-files": { public: false, limit: "10MB", types: DOCUMENT_TYPES },
};

export interface FileStore {
  put(bucket: Bucket, filePath: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(bucket: Bucket, filePath: string): Promise<Uint8Array>;
  remove(bucket: Bucket, filePath: string): Promise<void>;
  publicUrl(bucket: PublicBucket, filePath: string): string;
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
            public: BUCKETS[bucket].public,
            fileSizeLimit: BUCKETS[bucket].limit,
            allowedMimeTypes: BUCKETS[bucket].types,
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
    async get(bucket, filePath) {
      const { data, error } = await client.storage.from(bucket).download(filePath);
      if (error) throw error;
      return new Uint8Array(await data.arrayBuffer());
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
    async get(bucket, filePath) {
      return new Uint8Array(await readFile(fullPath(bucket, filePath)));
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
