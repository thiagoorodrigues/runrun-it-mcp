import { describe, it, expect } from "vitest";
import { successResponse, apiErrorResponse, networkErrorResponse, RunrunApiError } from "../src/errors.js";

describe("successResponse", () => {
  it("wraps data as MCP text content", () => {
    const r = successResponse({ id: 1, name: "x" });
    expect(r.isError).toBeUndefined();
    expect(r.content).toHaveLength(1);
    expect(r.content[0].type).toBe("text");
    expect(JSON.parse(r.content[0].text)).toEqual({ id: 1, name: "x" });
  });
});

describe("apiErrorResponse", () => {
  it("formats 4xx as MCP error", () => {
    const err = new RunrunApiError(404, "Not Found", "tasks/999");
    const r = apiErrorResponse(err);
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("404");
    expect(r.content[0].text).toContain("Not Found");
  });

  it("flags 429 as rate limit", () => {
    const err = new RunrunApiError(429, "Too Many Requests", "tasks");
    const r = apiErrorResponse(err);
    expect(r.content[0].text).toContain("rate limit");
  });
});

describe("networkErrorResponse", () => {
  it("formats network errors", () => {
    const r = networkErrorResponse(new Error("ECONNREFUSED"));
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("Network error");
    expect(r.content[0].text).toContain("ECONNREFUSED");
  });
});
