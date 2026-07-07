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
  it("calls /manual_work_periods with task_id filter and pagination", async () => {
    const client = mockClient(async () => []);
    const tool = createTasksTools(client).find((t) => t.name === "tasks_time_entries_list")!;
    await tool.handler({ task_id: 200 });
    expect(client.get).toHaveBeenCalledWith("/manual_work_periods", {
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
    const res = await tool.handler({
      title: "Nova tarefa",
      project_id: 10,
      responsible_id: 7,
      type_id: 3
    });
    expect(client.post).toHaveBeenCalledWith("/tasks", {
      task: { title: "Nova tarefa", project_id: 10, responsible_id: 7, type_id: 3 }
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
    const res = await tool.handler({ title: "T", project_id: 1, responsible_id: 5, type_id: 2 });
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
  it("calls POST /tasks/:id/change_status with task_status_id", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({ id: 10, board_stage_id: 42 })
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_update_status")!;
    const res = await tool.handler({ id: 10, board_stage_id: 42 });
    expect(client.post).toHaveBeenCalledWith("/tasks/10/change_status", {
      task_status_id: 42
    });
    expect(JSON.parse(res.content[0].text)).toMatchObject({ id: 10 });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(
      async () => ({}),
      async () => { throw new RunrunApiError(404, "Not Found", "/tasks/0/change_status"); }
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_update_status")!;
    const res = await tool.handler({ id: 0, board_stage_id: 1 });
    expect(res.isError).toBe(true);
  });
});

describe("tasks_comments_create", () => {
  it("calls POST /tasks/:task_id/comments with text", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({ id: 55, text: "Olá" })
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_comments_create")!;
    const res = await tool.handler({ task_id: 10, text: "Olá" });
    expect(client.post).toHaveBeenCalledWith("/tasks/10/comments", {
      comment: { text: "Olá" }
    });
    expect(JSON.parse(res.content[0].text)).toMatchObject({ id: 55 });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(
      async () => ({}),
      async () => { throw new RunrunApiError(404, "Not Found", "/tasks/999/comments"); }
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_comments_create")!;
    const res = await tool.handler({ task_id: 999, text: "x" });
    expect(res.isError).toBe(true);
  });
});

describe("tasks_get_description", () => {
  it("calls /tasks/:id/description", async () => {
    const client = mockClient(async () => ({ id: 68959, description: "<p>hello</p>" }));
    const tool = createTasksTools(client).find((t) => t.name === "tasks_get_description")!;
    const res = await tool.handler({ id: 68959 });
    expect(client.get).toHaveBeenCalledWith("/tasks/68959/description");
    expect(JSON.parse(res.content[0].text)).toMatchObject({ id: 68959, description: "<p>hello</p>" });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(async () => {
      throw new RunrunApiError(404, "Not Found", "/tasks/999/description");
    });
    const tool = createTasksTools(client).find((t) => t.name === "tasks_get_description")!;
    const res = await tool.handler({ id: 999 });
    expect(res.isError).toBe(true);
  });
});

describe("tasks_play", () => {
  it("calls POST /tasks/:id/play", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({ id: 10, is_working_on: true })
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_play")!;
    const res = await tool.handler({ id: 10 });
    expect(client.post).toHaveBeenCalledWith("/tasks/10/play", {});
    expect(JSON.parse(res.content[0].text)).toMatchObject({ id: 10 });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(
      async () => ({}),
      async () => { throw new RunrunApiError(422, "Already working", "/tasks/10/play"); }
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_play")!;
    const res = await tool.handler({ id: 10 });
    expect(res.isError).toBe(true);
  });
});

describe("tasks_pause", () => {
  it("calls POST /tasks/:id/pause", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({ id: 10, is_working_on: false })
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_pause")!;
    const res = await tool.handler({ id: 10 });
    expect(client.post).toHaveBeenCalledWith("/tasks/10/pause", {});
    expect(JSON.parse(res.content[0].text)).toMatchObject({ id: 10 });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(
      async () => ({}),
      async () => { throw new RunrunApiError(422, "Not working", "/tasks/10/pause"); }
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_pause")!;
    const res = await tool.handler({ id: 10 });
    expect(res.isError).toBe(true);
  });
});

describe("tasks_list_fields", () => {
  it("calls /tasks/:id/fields", async () => {
    const client = mockClient(async () => [{ id: "custom_67", name: "Responsáveis" }]);
    const tool = createTasksTools(client).find((t) => t.name === "tasks_list_fields")!;
    const res = await tool.handler({ id: 68959 });
    expect(client.get).toHaveBeenCalledWith("/tasks/68959/fields");
    expect(JSON.parse(res.content[0].text)).toMatchObject([{ id: "custom_67" }]);
  });

  it("returns isError on API error", async () => {
    const client = mockClient(async () => { throw new RunrunApiError(404, "Not Found", "/tasks/999/fields"); });
    const tool = createTasksTools(client).find((t) => t.name === "tasks_list_fields")!;
    const res = await tool.handler({ id: 999 });
    expect(res.isError).toBe(true);
  });
});

describe("tasks_update_custom_fields", () => {
  it("calls PUT /tasks/:id with custom_fields", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({}),
      async () => ({}),
      async () => ({ id: 1 })
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_update_custom_fields")!;
    const res = await tool.handler({ id: 1, custom_fields: { custom_67: "Carlos", custom_73: { id: "abc" } } });
    expect(client.put).toHaveBeenCalledWith("/tasks/1", {
      task: { custom_fields: { custom_67: "Carlos", custom_73: { id: "abc" } } }
    });
    expect(JSON.parse(res.content[0].text)).toMatchObject({ id: 1 });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({}),
      async () => ({}),
      async () => { throw new RunrunApiError(422, "Invalid", "/tasks/1"); }
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_update_custom_fields")!;
    const res = await tool.handler({ id: 1, custom_fields: {} });
    expect(res.isError).toBe(true);
  });
});

describe("tasks_update_tags", () => {
  it("calls PUT /tasks/:id with tags_data", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({}),
      async () => ({}),
      async () => ({ id: 5 })
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_update_tags")!;
    const res = await tool.handler({ id: 5, tags: [{ name: "bug", color: "#FF0000" }] });
    expect(client.put).toHaveBeenCalledWith("/tasks/5", {
      task: { tags_data: [{ name: "bug", color: "#FF0000" }] }
    });
    expect(JSON.parse(res.content[0].text)).toMatchObject({ id: 5 });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({}),
      async () => ({}),
      async () => { throw new RunrunApiError(404, "Not Found", "/tasks/999"); }
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_update_tags")!;
    const res = await tool.handler({ id: 999, tags: [] });
    expect(res.isError).toBe(true);
  });
});
