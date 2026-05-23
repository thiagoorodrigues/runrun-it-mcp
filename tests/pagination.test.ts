import { describe, it, expect } from "vitest";
import { paginationFields, applyPaginationDefaults } from "../src/pagination.js";
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
