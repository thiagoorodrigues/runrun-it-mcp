import { describe, it, expect } from "vitest";
import { createProjectsTools } from "../../src/tools/projects.js";
import { mockClient } from "../helpers/mock-client.js";

describe("projects_list", () => {
  it("calls /projects with pagination defaults", async () => {
    const client = mockClient(async () => []);
    const tool = createProjectsTools(client).find((t) => t.name === "projects_list")!;
    await tool.handler({});
    expect(client.get).toHaveBeenCalledWith("/projects", {
      page: 1,
      limit: 50,
      client_id: undefined,
      is_closed: undefined,
      search_term: undefined
    });
  });

  it("forwards client_id and is_closed filters", async () => {
    const client = mockClient(async () => []);
    const tool = createProjectsTools(client).find((t) => t.name === "projects_list")!;
    await tool.handler({ client_id: 12, is_closed: false });
    expect(client.get).toHaveBeenCalledWith("/projects", {
      page: 1,
      limit: 50,
      client_id: 12,
      is_closed: false,
      search_term: undefined
    });
  });

  it("forwards search_term filter", async () => {
    const client = mockClient(async () => []);
    const tool = createProjectsTools(client).find((t) => t.name === "projects_list")!;
    await tool.handler({ search_term: "Genesis" });
    expect(client.get).toHaveBeenCalledWith("/projects", {
      page: 1,
      limit: 50,
      client_id: undefined,
      is_closed: undefined,
      search_term: "Genesis"
    });
  });
});

describe("projects_get", () => {
  it("calls /projects/:id", async () => {
    const client = mockClient(async () => ({ id: 99 }));
    const tool = createProjectsTools(client).find((t) => t.name === "projects_get")!;
    const res = await tool.handler({ id: 99 });
    expect(client.get).toHaveBeenCalledWith("/projects/99");
    expect(JSON.parse(res.content[0].text)).toEqual({ id: 99 });
  });
});
