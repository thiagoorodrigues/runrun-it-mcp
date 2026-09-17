import { z } from "zod";

export const paginationFields = {
  page: z.number().int().min(1).optional().describe("Page number (default 1)"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Items per page (default 50, max 100)")
};

export type PaginationInput = {
  page?: number;
  limit?: number;
};

export const MAX_PAGE_SIZE = 100;

/**
 * Fetch every page of a list endpoint sequentially, starting at `startPage`,
 * and return the merged array. Stops when a page returns fewer than `limit`
 * items (or a non-array payload).
 */
export async function fetchAllPages<T = unknown>(
  fetchPage: (page: number, limit: number) => Promise<unknown>,
  startPage: number,
  limit: number
): Promise<T[]> {
  const items: T[] = [];
  let page = startPage;
  for (;;) {
    const data = await fetchPage(page, limit);
    if (!Array.isArray(data)) break;
    items.push(...(data as T[]));
    if (data.length < limit) break;
    page += 1;
  }
  return items;
}

export function applyPaginationDefaults(input: PaginationInput): {
  page: number;
  limit: number;
} {
  return {
    page: input.page ?? 1,
    limit: input.limit ?? 50
  };
}
