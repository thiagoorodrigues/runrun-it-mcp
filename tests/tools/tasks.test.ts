import { describe, it, expect } from "vitest";
import { createTasksTools } from "../../src/tools/tasks.js";
import { RunrunApiError } from "../../src/errors.js";
import { mockClient } from "../helpers/mock-client.js";

describe("tasks_list", () => {
  it("calls /tasks with pagination defaults and all filters undefined", async () => {
    const client = mockClient(async () => []);
    const tool = createTasksTools(client).find((t) => t.name === "tasks_list")!;
    await tool.handler({});
    expect(client.get).toHaveBeenCalledWith("/tasks", {
      page: 1,
      limit: 50,
      board_id: undefined,
      project_id: undefined,
      client_id: undefined,
      responsible_id: undefined,
      type_id: undefined,
      is_closed: undefined
    });
  });

  it("forwards all filter fields", async () => {
    const client = mockClient(async () => []);
    const tool = createTasksTools(client).find((t) => t.name === "tasks_list")!;
    await tool.handler({
      board_id: 1,
      project_id: 2,
      client_id: 3,
      responsible_id: 4,
      type_id: 5,
      is_closed: false,
      page: 2,
      limit: 25
    });
    expect(client.get).toHaveBeenCalledWith("/tasks", {
      page: 2,
      limit: 25,
      board_id: 1,
      project_id: 2,
      client_id: 3,
      responsible_id: 4,
      type_id: 5,
      is_closed: false
    });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(async () => {
      throw new RunrunApiError(429, "Too Many Requests", "/tasks");
    });
    const tool = createTasksTools(client).find((t) => t.name === "tasks_list")!;
    const res = await tool.handler({});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("rate limit");
  });
});

describe("tasks_get", () => {
  it("calls /tasks/:id", async () => {
    const client = mockClient(async () => ({ id: 7 }));
    const tool = createTasksTools(client).find((t) => t.name === "tasks_get")!;
    const res = await tool.handler({ id: 7 });
    expect(client.get).toHaveBeenCalledWith("/tasks/7");
    expect(JSON.parse(res.content[0].text)).toEqual({ id: 7 });
  });
});

describe("tasks_comments_list", () => {
  it("calls /tasks/:task_id/comments with pagination", async () => {
    const client = mockClient(async () => []);
    const tool = createTasksTools(client).find((t) => t.name === "tasks_comments_list")!;
    await tool.handler({ task_id: 100 });
    expect(client.get).toHaveBeenCalledWith("/tasks/100/comments", { page: 1, limit: 50 });
  });
});

describe("tasks_time_entries_list", () => {
  it("calls /time_entries with task_id filter and pagination", async () => {
    const client = mockClient(async () => []);
    const tool = createTasksTools(client).find((t) => t.name === "tasks_time_entries_list")!;
    await tool.handler({ task_id: 200 });
    expect(client.get).toHaveBeenCalledWith("/time_entries", {
      task_id: 200,
      page: 1,
      limit: 50
    });
  });
});

describe("tasks_create", () => {
  it("calls POST /tasks with required fields", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({ id: 1, title: "Nova tarefa" })
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_create")!;
    const res = await tool.handler({ title: "Nova tarefa", project_id: 10 });
    expect(client.post).toHaveBeenCalledWith("/tasks", {
      task: { title: "Nova tarefa", project_id: 10 }
    });
    expect(JSON.parse(res.content[0].text)).toMatchObject({ id: 1 });
  });

  it("includes all optional fields when provided", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({ id: 2 })
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_create")!;
    await tool.handler({
      title: "T",
      project_id: 1,
      responsible_id: 5,
      board_id: 3,
      type_id: 2,
      due_date: "2026-06-01",
      description: "desc",
      estimated_work_hours: 4
    });
    expect(client.post).toHaveBeenCalledWith("/tasks", {
      task: {
        title: "T",
        project_id: 1,
        responsible_id: 5,
        board_id: 3,
        type_id: 2,
        due_date: "2026-06-01",
        description: "desc",
        estimated_work_hours: 4
      }
    });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(
      async () => ({}),
      async () => { throw new RunrunApiError(422, "Unprocessable", "/tasks"); }
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_create")!;
    const res = await tool.handler({ title: "T", project_id: 1 });
    expect(res.isError).toBe(true);
  });
});

describe("tasks_update", () => {
  it("calls PATCH /tasks/:id with provided fields only", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({ id: 7, title: "Updated" })
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_update")!;
    const res = await tool.handler({ id: 7, title: "Updated", responsible_id: 3 });
    expect(client.patch).toHaveBeenCalledWith("/tasks/7", {
      task: { title: "Updated", responsible_id: 3 }
    });
    expect(JSON.parse(res.content[0].text)).toMatchObject({ id: 7 });
  });

  it("sends only the fields provided", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({ id: 5 })
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_update")!;
    await tool.handler({ id: 5, due_date: "2026-07-01" });
    expect(client.patch).toHaveBeenCalledWith("/tasks/5", {
      task: { due_date: "2026-07-01" }
    });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => { throw new RunrunApiError(404, "Not Found", "/tasks/999"); }
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_update")!;
    const res = await tool.handler({ id: 999, title: "X" });
    expect(res.isError).toBe(true);
  });
});

describe("tasks_update_status", () => {
  it("calls PATCH /tasks/:id with current_board_stage_id", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({ id: 10, current_board_stage_id: 42 })
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_update_status")!;
    const res = await tool.handler({ id: 10, current_board_stage_id: 42 });
    expect(client.patch).toHaveBeenCalledWith("/tasks/10", {
      task: { current_board_stage_id: 42 }
    });
    expect(JSON.parse(res.content[0].text)).toMatchObject({ id: 10 });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => { throw new RunrunApiError(404, "Not Found", "/tasks/0"); }
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_update_status")!;
    const res = await tool.handler({ id: 0, current_board_stage_id: 1 });
    expect(res.isError).toBe(true);
  });
});
