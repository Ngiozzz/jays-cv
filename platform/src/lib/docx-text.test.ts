import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { docxText } from "./docx-text";

// A minimal .docx: a zip holding word/document.xml (compressed, as Word saves it) and one other file
function zip(files: Record<string, string>): Uint8Array {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = deflateRawSync(Buffer.from(text, "utf8"));
    const nameBytes = Buffer.from(name, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, data);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, directory, end]));
}

const documentXml =
  '<w:document><w:body><w:p><w:r><w:t>Jane Wanjiku</w:t></w:r></w:p>' +
  "<w:p><w:r><w:t>Accountant</w:t></w:r><w:r><w:tab/><w:t>Nairobi &amp; Kisumu</w:t></w:r></w:p>" +
  "<w:p><w:r><w:t>CPA (K) &#8211; 2019</w:t></w:r></w:p></w:body></w:document>";

describe("docxText", () => {
  it("reads the words of a Word document, one paragraph per line", () => {
    const docx = zip({ "[Content_Types].xml": "<Types/>", "word/document.xml": documentXml });
    expect(docxText(docx)).toBe("Jane Wanjiku\nAccountant\tNairobi & Kisumu\nCPA (K) – 2019");
  });

  it("gives up on files that aren't Word documents", () => {
    expect(docxText(zip({ "other.xml": "<x/>" }))).toBeNull();
    expect(docxText(new TextEncoder().encode("not a zip at all"))).toBeNull();
  });
});
