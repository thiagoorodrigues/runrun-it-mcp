import type { RunrunClient, BinaryResponse } from "./client.js";
import type { McpContent } from "./errors.js";
import { RunrunApiError } from "./errors.js";

/** Largest image we embed in a tool result (raw bytes, before base64). */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
/** Most images downloaded for a single tool call. */
export const MAX_IMAGES = 10;

const DOCUMENT_URL_RE = /\/api\/(?:v1\.0\/)?documents\/(\d+)\/download/g;

/**
 * Find Runrun.it document ids referenced by inline images in a rich-text
 * description (<img src="/api/documents/123/download">). Order is preserved
 * and duplicates are dropped.
 */
export function extractDocumentIds(html: string | null | undefined): number[] {
  if (!html) return [];
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const match of html.matchAll(DOCUMENT_URL_RE)) {
    const id = Number(match[1]);
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function note(text: string): McpContent {
  return { type: "text", text };
}

/**
 * Turn downloaded document bytes into an MCP content block: an image block for
 * images within the size limit, otherwise a short text note explaining why the
 * bytes were not embedded.
 */
export function documentToBlock(id: number, file: BinaryResponse): McpContent {
  const { data, contentType } = file;
  if (!contentType.startsWith("image/")) {
    return note(`[document ${id}: not an image (${contentType}, ${data.length} bytes); not embedded]`);
  }
  if (data.length > MAX_IMAGE_BYTES) {
    return note(`[document ${id}: image too large to embed (${data.length} bytes, limit ${MAX_IMAGE_BYTES})]`);
  }
  return { type: "image", data: data.toString("base64"), mimeType: contentType };
}

export function documentDownloadPath(id: number): string {
  return `/documents/${id}/download`;
}

/** Download one document and convert it with documentToBlock. Never throws. */
export async function fetchDocumentBlock(client: RunrunClient, id: number): Promise<McpContent> {
  try {
    return documentToBlock(id, await client.getBinary(documentDownloadPath(id)));
  } catch (e) {
    const reason = e instanceof RunrunApiError ? `API error ${e.status}` : e instanceof Error ? e.message : String(e);
    return note(`[document ${id}: download failed (${reason})]`);
  }
}

/**
 * Download up to MAX_IMAGES documents in parallel and return one content block
 * per document, plus a trailing note listing any ids that were skipped.
 */
export async function fetchImageBlocks(client: RunrunClient, ids: number[]): Promise<McpContent[]> {
  const selected = ids.slice(0, MAX_IMAGES);
  const skipped = ids.slice(MAX_IMAGES);
  const blocks = await Promise.all(selected.map((id) => fetchDocumentBlock(client, id)));
  if (skipped.length > 0) {
    blocks.push(
      note(
        `[${skipped.length} more image(s) not embedded (limit ${MAX_IMAGES} per call): document ids ${skipped.join(", ")}. Use documents_download to fetch them individually.]`
      )
    );
  }
  return blocks;
}
