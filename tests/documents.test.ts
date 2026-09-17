import { describe, it, expect } from "vitest";
import { extractDocumentIds, fetchImageBlocks, MAX_IMAGE_BYTES, MAX_IMAGES } from "../src/documents.js";
import { RunrunApiError } from "../src/errors.js";
import type { RunrunClient } from "../src/client.js";

function binaryClient(impl: (path: string) => Promise<{ data: Buffer; contentType: string }>): RunrunClient {
  return { getBinary: impl } as unknown as RunrunClient;
}

describe("extractDocumentIds", () => {
  it("finds document ids in inline image tags", () => {
    const html = '<p><img onerror="x" src="/api/documents/41105664/download"></p>';
    expect(extractDocumentIds(html)).toEqual([41105664]);
  });

  it("returns ids in order without duplicates", () => {
    const html =
      '<img src="/api/documents/10/download"><img src="/api/documents/20/download"><img src="/api/documents/10/download">';
    expect(extractDocumentIds(html)).toEqual([10, 20]);
  });

  it("accepts absolute runrun.it URLs", () => {
    const html = '<img src="https://runrun.it/api/documents/77/download">';
    expect(extractDocumentIds(html)).toEqual([77]);
  });

  it("returns an empty list when there are no images", () => {
    expect(extractDocumentIds("<p>hello</p>")).toEqual([]);
    expect(extractDocumentIds(null)).toEqual([]);
  });
});

describe("fetchImageBlocks", () => {
  it("downloads each document and returns base64 image blocks", async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const client = binaryClient(async (path) => {
      expect(path).toBe("/documents/5/download");
      return { data: png, contentType: "image/png" };
    });
    const blocks = await fetchImageBlocks(client, [5]);
    expect(blocks).toEqual([{ type: "image", data: png.toString("base64"), mimeType: "image/png" }]);
  });

  it("replaces a non-image document with a text note", async () => {
    const client = binaryClient(async () => ({ data: Buffer.from("%PDF"), contentType: "application/pdf" }));
    const blocks = await fetchImageBlocks(client, [9]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("text");
    expect((blocks[0] as { text: string }).text).toContain("9");
    expect((blocks[0] as { text: string }).text).toContain("application/pdf");
  });

  it("replaces an oversized image with a text note", async () => {
    const client = binaryClient(async () => ({
      data: Buffer.alloc(MAX_IMAGE_BYTES + 1),
      contentType: "image/jpeg"
    }));
    const blocks = await fetchImageBlocks(client, [3]);
    expect(blocks[0].type).toBe("text");
    expect((blocks[0] as { text: string }).text).toContain("3");
  });

  it("replaces a failed download with a text note instead of throwing", async () => {
    const client = binaryClient(async () => {
      throw new RunrunApiError(404, "Not Found", "/documents/4/download");
    });
    const blocks = await fetchImageBlocks(client, [4]);
    expect(blocks[0].type).toBe("text");
    expect((blocks[0] as { text: string }).text).toContain("404");
  });

  it("downloads at most MAX_IMAGES documents and notes the rest", async () => {
    let calls = 0;
    const client = binaryClient(async () => {
      calls++;
      return { data: Buffer.from([1]), contentType: "image/png" };
    });
    const ids = Array.from({ length: MAX_IMAGES + 2 }, (_, i) => i + 1);
    const blocks = await fetchImageBlocks(client, ids);
    expect(calls).toBe(MAX_IMAGES);
    expect(blocks.filter((b) => b.type === "image")).toHaveLength(MAX_IMAGES);
    const notes = blocks.filter((b) => b.type === "text") as Array<{ text: string }>;
    expect(notes).toHaveLength(1);
    expect(notes[0].text).toContain("2");
  });
});
