// Phone screenshots can be several MB. Shrinking in the browser keeps uploads fast on mobile data,
// keeps storage small, and smaller posters cost fewer AI tokens to read.
type ShrinkOptions = { maxSide: number; type: "image/jpeg" | "image/png" };

// Posters: text stays sharp at 1600px. Logos: 200px is plenty for a 52px square on any screen,
// and PNG keeps transparent backgrounds.
export const POSTER_SIZE: ShrinkOptions = { maxSide: 1600, type: "image/jpeg" };
export const LOGO_SIZE: ShrinkOptions = { maxSide: 200, type: "image/png" };

const QUALITY = 0.85;

export async function shrinkImage(file: File, { maxSide, type }: ShrinkOptions = POSTER_SIZE): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
  // If the browser can't re-encode it, send the original (the server still checks type and size)
  if (!blob || blob.size >= file.size) return file;
  const name = file.name.replace(/\.\w+$/, "") + (type === "image/png" ? ".png" : ".jpg");
  return new File([blob], name, { type });
}
