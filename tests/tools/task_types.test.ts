import { describe, it, expect } from "vitest";
import { createTaskTypesTools } from "../../src/tools/task_types.js";
import { mockClient } from "../helpers/mock-client.js";

describe("task_types_list", () => {
  it("calls /task_types with pagination defaults", async () => {
    const client = mockClient(async () => []);
    const tool = createTaskTypesTools(client).find((t) => t.name === "task_types_list")!;
    await tool.handler({});
    expect(client.get).toHaveBeenCalledWith("/task_types", { page: 1, limit: 50 });
  });

  it("forwards custom pagination", async () => {
    const client = mockClient(async () => []);
    const tool = createTaskTypesTools(client).find((t) => t.name === "task_types_list")!;
    await tool.handler({ page: 3, limit: 15 });
    expect(client.get).toHaveBeenCalledWith("/task_types", { page: 3, limit: 15 });
  });
});
