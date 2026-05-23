import { describe, it, expect } from "vitest";
import { createUsersTools } from "../../src/tools/users.js";
import { RunrunApiError } from "../../src/errors.js";
import { mockClient } from "../helpers/mock-client.js";

describe("users_list", () => {
  it("calls /users with pagination defaults and returns success", async () => {
    const client = mockClient(async () => [{ id: 1 }]);
    const tools = createUsersTools(client);
    const tool = tools.find((t) => t.name === "users_list")!;
    const res = await tool.handler({});
    expect(client.get).toHaveBeenCalledWith("/users", { page: 1, limit: 50 });
    expect(res.isError).toBeUndefined();
    expect(JSON.parse(res.content[0].text)).toEqual([{ id: 1 }]);
  });

  it("forwards custom page/limit", async () => {
    const client = mockClient(async () => []);
    const tool = createUsersTools(client).find((t) => t.name === "users_list")!;
    await tool.handler({ page: 3, limit: 10 });
    expect(client.get).toHaveBeenCalledWith("/users", { page: 3, limit: 10 });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(async () => {
      throw new RunrunApiError(500, "boom", "/users");
    });
    const tool = createUsersTools(client).find((t) => t.name === "users_list")!;
    const res = await tool.handler({});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("500");
  });
});

describe("users_get", () => {
  it("calls /users/:id", async () => {
    const client = mockClient(async () => ({ id: 42 }));
    const tool = createUsersTools(client).find((t) => t.name === "users_get")!;
    const res = await tool.handler({ id: 42 });
    expect(client.get).toHaveBeenCalledWith("/users/42");
    expect(JSON.parse(res.content[0].text)).toEqual({ id: 42 });
  });
});

describe("users_me", () => {
  it("calls /users/me", async () => {
    const client = mockClient(async () => ({ id: 1, name: "me" }));
    const tool = createUsersTools(client).find((t) => t.name === "users_me")!;
    const res = await tool.handler({});
    expect(client.get).toHaveBeenCalledWith("/users/me");
    expect(JSON.parse(res.content[0].text)).toEqual({ id: 1, name: "me" });
  });
});
