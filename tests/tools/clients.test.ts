import { describe, it, expect } from "vitest";
import { createClientsTools } from "../../src/tools/clients.js";
import { RunrunApiError } from "../../src/errors.js";
import { mockClient } from "../helpers/mock-client.js";

describe("clients_list", () => {
  it("calls /clients with pagination defaults", async () => {
    const client = mockClient(async () => []);
    const tool = createClientsTools(client).find((t) => t.name === "clients_list")!;
    await tool.handler({});
    expect(client.get).toHaveBeenCalledWith("/clients", { page: 1, limit: 50 });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(async () => {
      throw new RunrunApiError(404, "Not Found", "/clients");
    });
    const tool = createClientsTools(client).find((t) => t.name === "clients_list")!;
    const res = await tool.handler({});
    expect(res.isError).toBe(true);
  });
});

describe("clients_get", () => {
  it("calls /clients/:id", async () => {
    const client = mockClient(async () => ({ id: 7 }));
    const tool = createClientsTools(client).find((t) => t.name === "clients_get")!;
    const res = await tool.handler({ id: 7 });
    expect(client.get).toHaveBeenCalledWith("/clients/7");
    expect(JSON.parse(res.content[0].text)).toEqual({ id: 7 });
  });
});
