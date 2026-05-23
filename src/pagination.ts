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

export function applyPaginationDefaults(input: PaginationInput): {
  page: number;
  limit: number;
} {
  return {
    page: input.page ?? 1,
    limit: input.limit ?? 50
  };
}
