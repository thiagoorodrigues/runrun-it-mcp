import { describe, it, expect, vi, beforeEach } from "vitest";
import { RunrunClient } from "../src/client.js";
import { RunrunApiError } from "../src/errors.js";

const baseConfig = {
  appKey: "app-key-xyz",
  userToken: "user-token-abc",
  baseUrl: "https://runrun.it/api/v1.0",
  logLevel: "error" as const
};

describe("RunrunClient.get", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("sends auth headers", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true })
    });
    const client = new RunrunClient(baseConfig);
    await client.get("/users/me");
    const call = (global.fetch as any).mock.calls[0];
    expect(call[0]).toBe("https://runrun.it/api/v1.0/users/me");
    expect(call[1].headers["App-Key"]).toBe("app-key-xyz");
    expect(call[1].headers["User-Token"]).toBe("user-token-abc");
  });

  it("serializes query params", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([])
    });
    const client = new RunrunClient(baseConfig);
    await client.get("/tasks", { board_id: 5, page: 2, limit: 25 });
    const url = (global.fetch as any).mock.calls[0][0];
    expect(url).toContain("board_id=5");
    expect(url).toContain("page=2");
    expect(url).toContain("limit=25");
  });

  it("omits undefined params", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([])
    });
    const client = new RunrunClient(baseConfig);
    await client.get("/tasks", { board_id: undefined, page: 1 });
    const url = (global.fetch as any).mock.calls[0][0];
    expect(url).not.toContain("board_id");
    expect(url).toContain("page=1");
  });

  it("returns parsed JSON on 2xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 42 })
    });
    const client = new RunrunClient(baseConfig);
    const data = await client.get("/users/42");
    expect(data).toEqual({ id: 42 });
  });

  it("throws RunrunApiError on 4xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "Not Found"
    });
    const client = new RunrunClient(baseConfig);
    await expect(client.get("/tasks/999")).rejects.toBeInstanceOf(RunrunApiError);
  });

  it("throws RunrunApiError on 5xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error"
    });
    const client = new RunrunClient(baseConfig);
    await expect(client.get("/tasks")).rejects.toMatchObject({
      status: 500,
      endpoint: "/tasks"
    });
  });

  it("propagates fetch network errors", async () => {
    (global.fetch as any).mockRejectedValue(new Error("ECONNREFUSED"));
    const client = new RunrunClient(baseConfig);
    await expect(client.get("/users")).rejects.toThrow("ECONNREFUSED");
  });

  it("normalizes trailing slash in baseUrl", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({})
    });
    const client = new RunrunClient({ ...baseConfig, baseUrl: "https://runrun.it/api/v1.0/" });
    await client.get("/users/me");
    expect((global.fetch as any).mock.calls[0][0]).toBe("https://runrun.it/api/v1.0/users/me");
  });
});
