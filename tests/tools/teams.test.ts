import { describe, it, expect } from "vitest";
import { createTeamsTools } from "../../src/tools/teams.js";
import { mockClient } from "../helpers/mock-client.js";

describe("teams_list", () => {
  it("calls /teams with pagination defaults", async () => {
    const client = mockClient(async () => []);
    const tool = createTeamsTools(client).find((t) => t.name === "teams_list")!;
    await tool.handler({});
    expect(client.get).toHaveBeenCalledWith("/teams", { page: 1, limit: 50 });
  });

  it("forwards custom pagination", async () => {
    const client = mockClient(async () => []);
    const tool = createTeamsTools(client).find((t) => t.name === "teams_list")!;
    await tool.handler({ page: 2, limit: 20 });
    expect(client.get).toHaveBeenCalledWith("/teams", { page: 2, limit: 20 });
  });
});
