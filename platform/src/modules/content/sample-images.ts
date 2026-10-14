import "server-only";
import { fileStore } from "@/lib/storage";

// Where a sample's before/after image is: uploaded ones are in storage, the starting samples'
// are in /public/img/samples, named after the slug
export function sampleImageUrl(
  sample: { slug: string; beforeImage: string | null; afterImage: string | null },
  side: "before" | "after",
) {
  const uploaded = side === "before" ? sample.beforeImage : sample.afterImage;
  return uploaded ? fileStore.publicUrl("sample-cvs", uploaded) : `/img/samples/${sample.slug}-${side}.jpeg`;
}
