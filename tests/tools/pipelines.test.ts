import { describe, it, expect } from "vitest";
import { createPipelinesTools } from "../../src/tools/pipelines.js";
import { mockClient } from "../helpers/mock-client.js";

describe("pipelines_list", () => {
  it("calls /board_stages with pagination defaults", async () => {
    const client = mockClient(async () => []);
    const tool = createPipelinesTools(client).find((t) => t.name === "pipelines_list")!;
    await tool.handler({});
    expect(client.get).toHaveBeenCalledWith("/board_stages", { page: 1, limit: 50 });
  });

  it("passes board_id when provided", async () => {
    const client = mockClient(async () => []);
    const tool = createPipelinesTools(client).find((t) => t.name === "pipelines_list")!;
    await tool.handler({ board_id: 519158 });
    expect(client.get).toHaveBeenCalledWith("/board_stages", { page: 1, limit: 50, board_id: 519158 });
  });
});
