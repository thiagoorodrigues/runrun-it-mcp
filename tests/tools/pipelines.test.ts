import { describe, it, expect } from "vitest";
import { createPipelinesTools } from "../../src/tools/pipelines.js";
import { mockClient } from "../helpers/mock-client.js";

describe("pipelines_list", () => {
  it("calls /pipelines with pagination defaults", async () => {
    const client = mockClient(async () => []);
    const tool = createPipelinesTools(client).find((t) => t.name === "pipelines_list")!;
    await tool.handler({});
    expect(client.get).toHaveBeenCalledWith("/pipelines", { page: 1, limit: 50 });
  });
});
