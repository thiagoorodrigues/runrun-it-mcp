import { describe, it, expect } from "vitest";
import { paginationFields, applyPaginationDefaults, fetchAllPages } from "../src/pagination.js";
import { z } from "zod";

describe("paginationFields", () => {
  it("accepts valid page and limit", () => {
    const schema = z.object(paginationFields);
    expect(schema.safeParse({ page: 2, limit: 50 }).success).toBe(true);
  });

  it("accepts empty (both optional)", () => {
    const schema = z.object(paginationFields);
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("rejects limit > 100", () => {
    const schema = z.object(paginationFields);
    expect(schema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it("rejects page < 1", () => {
    const schema = z.object(paginationFields);
    expect(schema.safeParse({ page: 0 }).success).toBe(false);
  });
});

describe("applyPaginationDefaults", () => {
  it("fills missing values with defaults", () => {
    expect(applyPaginationDefaults({})).toEqual({ page: 1, limit: 50 });
  });

  it("respects provided values", () => {
    expect(applyPaginationDefaults({ page: 3, limit: 10 })).toEqual({ page: 3, limit: 10 });
  });
});

describe("fetchAllPages", () => {
  it("walks pages until a short page and merges results", async () => {
    const pages: Record<number, number[]> = { 1: [1, 2], 2: [3, 4], 3: [5] };
    const calls: Array<[number, number]> = [];
    const result = await fetchAllPages<number>(async (page, limit) => {
      calls.push([page, limit]);
      return pages[page] ?? [];
    }, 1, 2);
    expect(result).toEqual([1, 2, 3, 4, 5]);
    expect(calls).toEqual([[1, 2], [2, 2], [3, 2]]);
  });

  it("starts from the given page", async () => {
    const calls: number[] = [];
    await fetchAllPages(async (page) => { calls.push(page); return []; }, 4, 50);
    expect(calls).toEqual([4]);
  });

  it("stops on a non-array payload", async () => {
    const result = await fetchAllPages(async () => ({ error: "nope" }), 1, 10);
    expect(result).toEqual([]);
  });
});
