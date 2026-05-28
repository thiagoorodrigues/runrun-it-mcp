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

describe("RunrunClient.post", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("sends POST with JSON body and auth headers", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 1 })
    });
    const client = new RunrunClient(baseConfig);
    await client.post("/tasks", { task: { title: "Test" } });
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("https://runrun.it/api/v1.0/tasks");
    expect(init.method).toBe("POST");
    expect(init.headers["App-Key"]).toBe("app-key-xyz");
    expect(init.headers["User-Token"]).toBe("user-token-abc");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ task: { title: "Test" } });
  });

  it("returns parsed JSON on 2xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 99 })
    });
    const client = new RunrunClient(baseConfig);
    const data = await client.post("/tasks", { task: { title: "x" } });
    expect(data).toEqual({ id: 99 });
  });

  it("throws RunrunApiError on 4xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "Unprocessable Entity"
    });
    const client = new RunrunClient(baseConfig);
    await expect(client.post("/tasks", {})).rejects.toBeInstanceOf(RunrunApiError);
  });
});

describe("RunrunClient.patch", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("sends PATCH with JSON body and auth headers", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 5 })
    });
    const client = new RunrunClient(baseConfig);
    await client.patch("/tasks/5", { task: { title: "Updated" } });
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("https://runrun.it/api/v1.0/tasks/5");
    expect(init.method).toBe("PATCH");
    expect(init.headers["App-Key"]).toBe("app-key-xyz");
    expect(JSON.parse(init.body)).toEqual({ task: { title: "Updated" } });
  });

  it("throws RunrunApiError on 4xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "Not Found"
    });
    const client = new RunrunClient(baseConfig);
    await expect(client.patch("/tasks/999", {})).rejects.toBeInstanceOf(RunrunApiError);
  });
});

describe("RunrunClient.delete", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("sends DELETE with auth headers and no body", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({})
    });
    const client = new RunrunClient(baseConfig);
    await client.delete("/manual_work_periods/5");
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("https://runrun.it/api/v1.0/manual_work_periods/5");
    expect(init.method).toBe("DELETE");
    expect(init.headers["App-Key"]).toBe("app-key-xyz");
    expect(init.headers["User-Token"]).toBe("user-token-abc");
    expect(init.body).toBeUndefined();
  });

  it("returns parsed JSON on 2xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 5 })
    });
    const client = new RunrunClient(baseConfig);
    const data = await client.delete("/manual_work_periods/5");
    expect(data).toEqual({ id: 5 });
  });

  it("throws RunrunApiError on 4xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "Not Found"
    });
    const client = new RunrunClient(baseConfig);
    await expect(client.delete("/manual_work_periods/999")).rejects.toBeInstanceOf(RunrunApiError);
  });
});

describe("RunrunClient.put", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("sends PUT with JSON body and auth headers", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 1 })
    });
    const client = new RunrunClient(baseConfig);
    await client.put("/tasks/1", { task: { custom_fields: { custom_67: "val" } } });
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("https://runrun.it/api/v1.0/tasks/1");
    expect(init.method).toBe("PUT");
    expect(init.headers["App-Key"]).toBe("app-key-xyz");
    expect(init.headers["User-Token"]).toBe("user-token-abc");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ task: { custom_fields: { custom_67: "val" } } });
  });

  it("returns parsed JSON on 2xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 42 })
    });
    const client = new RunrunClient(baseConfig);
    const data = await client.put("/tasks/1", {});
    expect(data).toEqual({ id: 42 });
  });

  it("throws RunrunApiError on 4xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "Unprocessable Entity"
    });
    const client = new RunrunClient(baseConfig);
    await expect(client.put("/tasks/1", {})).rejects.toBeInstanceOf(RunrunApiError);
  });
});
