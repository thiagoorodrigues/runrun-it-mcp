import { describe, it, expect } from "vitest";
import { createBoardsTools } from "../../src/tools/boards.js";
import { mockClient } from "../helpers/mock-client.js";

describe("boards_list", () => {
  it("calls /boards with pagination defaults", async () => {
    const client = mockClient(async () => []);
    const tool = createBoardsTools(client).find((t) => t.name === "boards_list")!;
    await tool.handler({});
    expect(client.get).toHaveBeenCalledWith("/boards", { page: 1, limit: 50 });
  });
});
