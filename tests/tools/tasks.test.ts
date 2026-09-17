import { describe, it, expect, vi } from "vitest";
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
      user_id: undefined,
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
      responsible_id: "hugo-goncalves",
      user_id: "thiago-rodrigues",
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
      responsible_id: "hugo-goncalves",
      user_id: "thiago-rodrigues",
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

  it("forwards explicit page and limit", async () => {
    const client = mockClient(async () => []);
    const tool = createTasksTools(client).find((t) => t.name === "tasks_comments_list")!;
    await tool.handler({ task_id: 100, page: 3, limit: 10 });
    expect(client.get).toHaveBeenCalledWith("/tasks/100/comments", { page: 3, limit: 10 });
  });

  it("with all=true fetches every page and returns the merged list", async () => {
    const pages: Record<number, unknown[]> = {
      1: [{ id: 1 }, { id: 2 }],
      2: [{ id: 3 }, { id: 4 }],
      3: [{ id: 5 }]
    };
    const client = mockClient(async (_path, params) => pages[(params as any).page] ?? []);
    const tool = createTasksTools(client).find((t) => t.name === "tasks_comments_list")!;
    const res = await tool.handler({ task_id: 100, all: true, limit: 2 });
    expect(client.get).toHaveBeenCalledTimes(3);
    expect(client.get).toHaveBeenNthCalledWith(1, "/tasks/100/comments", { page: 1, limit: 2 });
    expect(client.get).toHaveBeenNthCalledWith(2, "/tasks/100/comments", { page: 2, limit: 2 });
    expect(client.get).toHaveBeenNthCalledWith(3, "/tasks/100/comments", { page: 3, limit: 2 });
    expect(JSON.parse(res.content[0].text)).toEqual([
      { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }
    ]);
  });

  it("with all=true stops when a page comes back empty", async () => {
    const pages: Record<number, unknown[]> = { 1: [{ id: 1 }, { id: 2 }] };
    const client = mockClient(async (_path, params) => pages[(params as any).page] ?? []);
    const tool = createTasksTools(client).find((t) => t.name === "tasks_comments_list")!;
    const res = await tool.handler({ task_id: 100, all: true, limit: 2 });
    expect(client.get).toHaveBeenCalledTimes(2);
    expect(JSON.parse(res.content[0].text)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("with all=true uses max page size when limit is omitted", async () => {
    const client = mockClient(async () => []);
    const tool = createTasksTools(client).find((t) => t.name === "tasks_comments_list")!;
    await tool.handler({ task_id: 100, all: true });
    expect(client.get).toHaveBeenCalledWith("/tasks/100/comments", { page: 1, limit: 100 });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(async () => { throw new RunrunApiError(404, "Not Found", "/tasks/999/comments"); });
    const tool = createTasksTools(client).find((t) => t.name === "tasks_comments_list")!;
    const res = await tool.handler({ task_id: 999 });
    expect(res.isError).toBe(true);
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
      type_id: 3
    });
    expect(client.post).toHaveBeenCalledWith("/tasks", {
      task: { title: "Nova tarefa", project_id: 10, type_id: 3 }
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
      responsible_id: "hugo-goncalves",
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
        responsible_id: "hugo-goncalves",
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
    const res = await tool.handler({ title: "T", project_id: 1, type_id: 2 });
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
    const res = await tool.handler({ id: 7, title: "Updated", responsible_id: "hugo-goncalves" });
    expect(client.patch).toHaveBeenCalledWith("/tasks/7", {
      task: { title: "Updated", responsible_id: "hugo-goncalves" }
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

describe("tasks_comments_update", () => {
  it("calls PUT /comments/:comment_id with text", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({}),
      async () => ({}),
      async () => ({ id: 55, text: "edited" })
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_comments_update")!;
    const res = await tool.handler({ comment_id: 55, text: "edited" });
    expect(client.put).toHaveBeenCalledWith("/comments/55", { comment: { text: "edited" } });
    expect(JSON.parse(res.content[0].text)).toMatchObject({ id: 55, text: "edited" });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({}),
      async () => ({}),
      async () => { throw new RunrunApiError(404, "Not Found", "/comments/999"); }
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_comments_update")!;
    const res = await tool.handler({ comment_id: 999, text: "x" });
    expect(res.isError).toBe(true);
  });
});

describe("tasks_comments_delete", () => {
  it("calls DELETE /comments/:comment_id", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({}),
      async () => ({})
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_comments_delete")!;
    const res = await tool.handler({ comment_id: 55 });
    expect(client.delete).toHaveBeenCalledWith("/comments/55");
    expect(res.isError).toBeUndefined();
    expect(JSON.parse(res.content[0].text)).toEqual({ deleted: true, comment_id: 55 });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({}),
      async () => { throw new RunrunApiError(404, "Not Found", "/comments/999"); }
    );
    const tool = createTasksTools(client).find((t) => t.name === "tasks_comments_delete")!;
    const res = await tool.handler({ comment_id: 999 });
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

describe("tasks_get_description images", () => {
  const html = '<p>oi</p><p><img src="/api/documents/41105664/download"></p>';
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

  function clientWithImage() {
    return mockClient(
      async () => ({ id: 75014, description: html }),
      undefined,
      undefined,
      undefined,
      undefined,
      async (path) => {
        expect(path).toBe("/documents/41105664/download");
        return { data: png, contentType: "image/png" };
      }
    );
  }

  it("appends an image block for each inline image by default", async () => {
    const client = clientWithImage();
    const tool = createTasksTools(client).find((t) => t.name === "tasks_get_description")!;
    const res = await tool.handler({ id: 75014 });
    expect(res.content[0].type).toBe("text");
    expect(JSON.parse((res.content[0] as { text: string }).text)).toMatchObject({ id: 75014 });
    expect(res.content[1]).toEqual({ type: "image", data: png.toString("base64"), mimeType: "image/png" });
  });

  it("skips downloads when include_images is false", async () => {
    const client = clientWithImage();
    const tool = createTasksTools(client).find((t) => t.name === "tasks_get_description")!;
    const res = await tool.handler({ id: 75014, include_images: false });
    expect(res.content).toHaveLength(1);
    expect(client.getBinary).not.toHaveBeenCalled();
  });

  it("returns only the JSON when the description has no images", async () => {
    const client = mockClient(async () => ({ id: 1, description: "<p>sem imagem</p>" }));
    const tool = createTasksTools(client).find((t) => t.name === "tasks_get_description")!;
    const res = await tool.handler({ id: 1 });
    expect(res.content).toHaveLength(1);
    expect(client.getBinary).not.toHaveBeenCalled();
  });
});

describe("tasks_documents_list", () => {
  it("calls /tasks/:id/documents", async () => {
    const docs = [{ id: 41105664, file_name: "print.png", file_content_type: "image/png" }];
    const client = mockClient(async () => docs);
    const tool = createTasksTools(client).find((t) => t.name === "tasks_documents_list")!;
    const res = await tool.handler({ id: 75014 });
    expect(client.get).toHaveBeenCalledWith("/tasks/75014/documents");
    expect(JSON.parse((res.content[0] as { text: string }).text)).toEqual(docs);
  });

  it("returns isError on API error", async () => {
    const client = mockClient(async () => {
      throw new RunrunApiError(404, "Not Found", "/tasks/999/documents");
    });
    const tool = createTasksTools(client).find((t) => t.name === "tasks_documents_list")!;
    const res = await tool.handler({ id: 999 });
    expect(res.isError).toBe(true);
  });
});

describe("documents_download", () => {
  it("returns an image block for an image document", async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const client = mockClient(
      async () => ({}),
      undefined, undefined, undefined, undefined,
      async (path) => {
        expect(path).toBe("/documents/41105664/download");
        return { data: png, contentType: "image/png" };
      }
    );
    const tool = createTasksTools(client).find((t) => t.name === "documents_download")!;
    const res = await tool.handler({ id: 41105664 });
    expect(res.content).toEqual([{ type: "image", data: png.toString("base64"), mimeType: "image/png" }]);
  });

  it("returns a text note for a non-image document", async () => {
    const client = mockClient(
      async () => ({}),
      undefined, undefined, undefined, undefined,
      async () => ({ data: Buffer.from("%PDF"), contentType: "application/pdf" })
    );
    const tool = createTasksTools(client).find((t) => t.name === "documents_download")!;
    const res = await tool.handler({ id: 7 });
    expect(res.content[0].type).toBe("text");
    expect((res.content[0] as { text: string }).text).toContain("application/pdf");
  });

  it("returns isError when the download fails", async () => {
    const client = mockClient(
      async () => ({}),
      undefined, undefined, undefined, undefined,
      async () => { throw new RunrunApiError(404, "Not Found", "/documents/9/download"); }
    );
    const tool = createTasksTools(client).find((t) => t.name === "documents_download")!;
    const res = await tool.handler({ id: 9 });
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

describe("tasks_assign", () => {
  it("PATCHes /tasks/:id assigning the responsible_id", async () => {
    const patch = vi.fn(async () => ({ id: 55, responsible_id: "ana-silva" }));
    const client = mockClient(async () => ({}), undefined, patch);
    const tool = createTasksTools(client).find((t) => t.name === "tasks_assign")!;
    const res = await tool.handler({ id: 55, responsible_id: "ana-silva" });
    expect(patch).toHaveBeenCalledWith("/tasks/55", { task: { responsible_id: "ana-silva" } });
    expect(res.isError).toBeUndefined();
  });

  it("PATCHes with null responsible_id when omitted (unassign)", async () => {
    const patch = vi.fn(async () => ({ id: 55, responsible_id: null }));
    const client = mockClient(async () => ({}), undefined, patch);
    const tool = createTasksTools(client).find((t) => t.name === "tasks_assign")!;
    await tool.handler({ id: 55 });
    expect(patch).toHaveBeenCalledWith("/tasks/55", { task: { responsible_id: null } });
  });

  it("returns isError on API error", async () => {
    const patch = vi.fn(async () => {
      throw new RunrunApiError(422, "bad", "/tasks/55");
    });
    const client = mockClient(async () => ({}), undefined, patch);
    const tool = createTasksTools(client).find((t) => t.name === "tasks_assign")!;
    const res = await tool.handler({ id: 55, responsible_id: "x" });
    expect(res.isError).toBe(true);
  });
});
