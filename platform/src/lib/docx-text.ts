import { inflateRawSync } from "node:zlib";

// The text of a Word (.docx) file, so the AI can read CVs clients send as Word documents.
// A .docx is a zip; the words are in word/document.xml. Returns null for anything it can't read
// (an old .doc, a damaged file), and the caller asks for a PDF instead.

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;
const DOCUMENT = "word/document.xml";

export function docxText(bytes: Uint8Array): string | null {
  try {
    const xml = documentXml(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
    return xml === null ? null : xmlToText(xml);
  } catch {
    return null;
  }
}

function documentXml(zip: Buffer): string | null {
  // The end-of-directory record sits in the last 64 KB (after an optional comment)
  let end = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i--) {
    if (zip.readUInt32LE(i) === EOCD) {
      end = i;
      break;
    }
  }
  if (end < 0) return null;
  const entries = zip.readUInt16LE(end + 10);
  let at = zip.readUInt32LE(end + 16);
  for (let n = 0; n < entries; n++) {
    if (zip.readUInt32LE(at) !== CENTRAL) return null;
    const method = zip.readUInt16LE(at + 10);
    const size = zip.readUInt32LE(at + 20);
    const nameLength = zip.readUInt16LE(at + 28);
    const extraLength = zip.readUInt16LE(at + 30);
    const commentLength = zip.readUInt16LE(at + 32);
    const local = zip.readUInt32LE(at + 42);
    const name = zip.toString("utf8", at + 46, at + 46 + nameLength);
    if (name === DOCUMENT) {
      if (zip.readUInt32LE(local) !== LOCAL) return null;
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + size);
      if (method === 0) return data.toString("utf8");
      if (method === 8) return inflateRawSync(data).toString("utf8");
      return null;
    }
    at += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function xmlToText(xml: string): string {
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>|<w:cr\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<\/w:tc>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, name: string) => ENTITIES[name])
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
