// Phone screenshots of posters can be several MB. Shrinking in the browser keeps uploads fast on
// mobile data, and smaller images cost fewer AI tokens to read. Text stays sharp at 1600px.
const MAX_SIDE = 1600;
const QUALITY = 0.85;

export async function shrinkImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  // If the browser can't re-encode it, send the original (the server still checks type and size)
  if (!blob || blob.size >= file.size) return file;
  const name = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
