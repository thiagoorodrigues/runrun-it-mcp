# Tasks Write Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 write tools to the MCP server: `tasks_create`, `tasks_update`, `tasks_update_status`, and `tasks_comments_create`.

**Architecture:** Extend `RunrunClient` with `post` and `patch` methods (same auth header pattern as `get`). Add 4 new `ToolDefinition` entries to `src/tools/tasks.ts`. Extend `mockClient` test helper to mock the new methods.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, zod, vitest, native `fetch`.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `tests/helpers/mock-client.ts` | Modify | Accept optional `post` and `patch` impls |
| `tests/client.test.ts` | Modify | Add `post` and `patch` test suites |
| `src/client.ts` | Modify | Add `post<T>` and `patch<T>` methods |
| `tests/tools/tasks.test.ts` | Modify | Add tests for 4 new tools |
| `src/tools/tasks.ts` | Modify | Add 4 new `ToolDefinition` entries |
| `README.md` | Modify | Add 4 new tools to the tools table |

---

## Task 1: Extend mockClient to support post and patch

**Files:**
- Modify: `tests/helpers/mock-client.ts`

- [ ] **Step 1: Replace mock-client.ts with extended version**

```typescript
import { vi } from "vitest";
import type { RunrunClient } from "../../src/client.js";

export function mockClient(
  getImpl: (...args: Parameters<RunrunClient["get"]>) => ReturnType<RunrunClient["get"]>,
  postImpl?: (...args: Parameters<RunrunClient["post"]>) => ReturnType<RunrunClient["post"]>,
  patchImpl?: (...args: Parameters<RunrunClient["patch"]>) => ReturnType<RunrunClient["patch"]>
): RunrunClient {
  return {
    get: vi.fn(getImpl),
    post: vi.fn(postImpl ?? (async () => ({}))),
    patch: vi.fn(patchImpl ?? (async () => ({})))
  } as unknown as RunrunClient;
}
```

- [ ] **Step 2: Run existing tests to verify nothing broke**

```bash
npm test
```

Expected: all existing tests pass (mock-client change is backwards-compatible — existing callers pass only `getImpl`).

- [ ] **Step 3: Commit**

```bash
git add tests/helpers/mock-client.ts
git commit -m "test(helpers): extend mockClient to support post and patch"
```

---

## Task 2: Add post and patch to RunrunClient

**Files:**
- Modify: `src/client.ts`
- Modify: `tests/client.test.ts`

- [ ] **Step 1: Write failing tests for post**

Append to `tests/client.test.ts`:

```typescript
describe("RunrunClient.post", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("sends POST with JSON body and auth headers", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 1 })
    });
    const client = new RunrunClient(baseConfig);
    await client.post("/tasks", { task: { title: "Test" } });
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("https://runrun.it/api/v1.0/tasks");
    expect(init.method).toBe("POST");
    expect(init.headers["App-Key"]).toBe("app-key-xyz");
    expect(init.headers["User-Token"]).toBe("user-token-abc");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ task: { title: "Test" } });
  });

  it("returns parsed JSON on 2xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 99 })
    });
    const client = new RunrunClient(baseConfig);
    const data = await client.post("/tasks", { task: { title: "x" } });
    expect(data).toEqual({ id: 99 });
  });

  it("throws RunrunApiError on 4xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "Unprocessable Entity"
    });
    const client = new RunrunClient(baseConfig);
    await expect(client.post("/tasks", {})).rejects.toBeInstanceOf(RunrunApiError);
  });
});

describe("RunrunClient.patch", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("sends PATCH with JSON body and auth headers", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 5 })
    });
    const client = new RunrunClient(baseConfig);
    await client.patch("/tasks/5", { task: { title: "Updated" } });
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("https://runrun.it/api/v1.0/tasks/5");
    expect(init.method).toBe("PATCH");
    expect(init.headers["App-Key"]).toBe("app-key-xyz");
    expect(JSON.parse(init.body)).toEqual({ task: { title: "Updated" } });
  });

  it("throws RunrunApiError on 4xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "Not Found"
    });
    const client = new RunrunClient(baseConfig);
    await expect(client.patch("/tasks/999", {})).rejects.toBeInstanceOf(RunrunApiError);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- tests/client.test.ts
```

Expected: FAIL — `client.post is not a function` / `client.patch is not a function`.

- [ ] **Step 3: Implement post and patch in src/client.ts**

Replace the full file:

```typescript
import type { Config } from "./config.js";
import { RunrunApiError } from "./errors.js";

export type QueryParams = Record<string, string | number | boolean | undefined>;
export type BodyParams = Record<string, unknown>;

export class RunrunClient {
  constructor(private readonly config: Config) {}

  async get<T = unknown>(path: string, params: QueryParams = {}): Promise<T> {
    const url = this.buildUrl(path, params);
    const res = await fetch(url, {
      method: "GET",
      headers: this.authHeaders()
    });
    return this.parseResponse<T>(res, path);
  }

  async post<T = unknown>(path: string, body: BodyParams): Promise<T> {
    const url = this.buildUrl(path, {});
    const res = await fetch(url, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(body)
    });
    return this.parseResponse<T>(res, path);
  }

  async patch<T = unknown>(path: string, body: BodyParams): Promise<T> {
    const url = this.buildUrl(path, {});
    const res = await fetch(url, {
      method: "PATCH",
      headers: this.authHeaders(),
      body: JSON.stringify(body)
    });
    return this.parseResponse<T>(res, path);
  }

  private authHeaders() {
    return {
      "App-Key": this.config.appKey,
      "User-Token": this.config.userToken,
      "Content-Type": "application/json"
    };
  }

  private async parseResponse<T>(res: Response, path: string): Promise<T> {
    if (!res.ok) {
      const body = await res.text();
      throw new RunrunApiError(res.status, body, path);
    }
    return (await res.json()) as T;
  }

  private buildUrl(path: string, params: QueryParams): string {
    const url = new URL(this.config.baseUrl.replace(/\/$/, "") + path);
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/client.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client.ts tests/client.test.ts
git commit -m "feat(client): add post and patch methods"
```

---

## Task 3: Add tasks_create tool

**Files:**
- Modify: `tests/tools/tasks.test.ts`
- Modify: `src/tools/tasks.ts`

- [ ] **Step 1: Write failing test**

Append to `tests/tools/tasks.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/tools/tasks.test.ts
```

Expected: FAIL — `tasks_create` tool not found.

- [ ] **Step 3: Add tasks_create to src/tools/tasks.ts**

Add inside the `return [...]` array in `createTasksTools`, after the last existing tool:

```typescript
{
  name: "tasks_create",
  config: {
    title: "Create Task",
    description: "Create a new task. Requires title and project_id. All other fields are optional.",
    inputSchema: {
      title: z.string().min(1),
      project_id: z.number().int().positive(),
      responsible_id: z.number().int().positive().optional(),
      board_id: z.number().int().positive().optional(),
      type_id: z.number().int().positive().optional(),
      due_date: z.string().optional(),
      description: z.string().optional(),
      estimated_work_hours: z.number().positive().optional()
    }
  },
  handler: async (input: {
    title: string;
    project_id: number;
    responsible_id?: number;
    board_id?: number;
    type_id?: number;
    due_date?: string;
    description?: string;
    estimated_work_hours?: number;
  }) => {
    try {
      const task: Record<string, unknown> = {
        title: input.title,
        project_id: input.project_id
      };
      if (input.responsible_id !== undefined) task.responsible_id = input.responsible_id;
      if (input.board_id !== undefined) task.board_id = input.board_id;
      if (input.type_id !== undefined) task.type_id = input.type_id;
      if (input.due_date !== undefined) task.due_date = input.due_date;
      if (input.description !== undefined) task.description = input.description;
      if (input.estimated_work_hours !== undefined) task.estimated_work_hours = input.estimated_work_hours;
      const data = await client.post("/tasks", { task });
      return successResponse(data);
    } catch (e) {
      return genericErrorResponse(e);
    }
  }
},
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/tools/tasks.test.ts
```

Expected: all `tasks_create` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/tasks.ts tests/tools/tasks.test.ts
git commit -m "feat(tools): add tasks_create"
```

---

## Task 4: Add tasks_update tool

**Files:**
- Modify: `tests/tools/tasks.test.ts`
- Modify: `src/tools/tasks.ts`

- [ ] **Step 1: Write failing test**

Append to `tests/tools/tasks.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/tools/tasks.test.ts
```

Expected: FAIL — `tasks_update` tool not found.

- [ ] **Step 3: Add tasks_update to src/tools/tasks.ts**

Add inside the `return [...]` array, after `tasks_create`:

```typescript
{
  name: "tasks_update",
  config: {
    title: "Update Task",
    description: "Update fields of an existing task. Only provided fields are changed.",
    inputSchema: {
      id: z.number().int().positive(),
      title: z.string().min(1).optional(),
      project_id: z.number().int().positive().optional(),
      responsible_id: z.number().int().positive().optional(),
      board_id: z.number().int().positive().optional(),
      type_id: z.number().int().positive().optional(),
      due_date: z.string().optional(),
      description: z.string().optional(),
      estimated_work_hours: z.number().positive().optional()
    }
  },
  handler: async (input: {
    id: number;
    title?: string;
    project_id?: number;
    responsible_id?: number;
    board_id?: number;
    type_id?: number;
    due_date?: string;
    description?: string;
    estimated_work_hours?: number;
  }) => {
    try {
      const task: Record<string, unknown> = {};
      if (input.title !== undefined) task.title = input.title;
      if (input.project_id !== undefined) task.project_id = input.project_id;
      if (input.responsible_id !== undefined) task.responsible_id = input.responsible_id;
      if (input.board_id !== undefined) task.board_id = input.board_id;
      if (input.type_id !== undefined) task.type_id = input.type_id;
      if (input.due_date !== undefined) task.due_date = input.due_date;
      if (input.description !== undefined) task.description = input.description;
      if (input.estimated_work_hours !== undefined) task.estimated_work_hours = input.estimated_work_hours;
      const data = await client.patch(`/tasks/${input.id}`, { task });
      return successResponse(data);
    } catch (e) {
      return genericErrorResponse(e);
    }
  }
},
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/tools/tasks.test.ts
```

Expected: all `tasks_update` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/tasks.ts tests/tools/tasks.test.ts
git commit -m "feat(tools): add tasks_update"
```

---

## Task 5: Add tasks_update_status tool

**Files:**
- Modify: `tests/tools/tasks.test.ts`
- Modify: `src/tools/tasks.ts`

- [ ] **Step 1: Write failing test**

Append to `tests/tools/tasks.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/tools/tasks.test.ts
```

Expected: FAIL — `tasks_update_status` tool not found.

- [ ] **Step 3: Add tasks_update_status to src/tools/tasks.ts**

Add inside the `return [...]` array, after `tasks_update`:

```typescript
{
  name: "tasks_update_status",
  config: {
    title: "Update Task Status",
    description: "Move a task to a different board stage (status). Use boards_list then pipelines_list to find valid stage IDs.",
    inputSchema: {
      id: z.number().int().positive(),
      current_board_stage_id: z.number().int().positive()
    }
  },
  handler: async (input: { id: number; current_board_stage_id: number }) => {
    try {
      const data = await client.patch(`/tasks/${input.id}`, {
        task: { current_board_stage_id: input.current_board_stage_id }
      });
      return successResponse(data);
    } catch (e) {
      return genericErrorResponse(e);
    }
  }
},
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/tools/tasks.test.ts
```

Expected: all `tasks_update_status` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/tasks.ts tests/tools/tasks.test.ts
git commit -m "feat(tools): add tasks_update_status"
```

---

## Task 6: Add tasks_comments_create tool

**Files:**
- Modify: `tests/tools/tasks.test.ts`
- Modify: `src/tools/tasks.ts`

- [ ] **Step 1: Write failing test**

Append to `tests/tools/tasks.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/tools/tasks.test.ts
```

Expected: FAIL — `tasks_comments_create` tool not found.

- [ ] **Step 3: Add tasks_comments_create to src/tools/tasks.ts**

Add inside the `return [...]` array, after `tasks_update_status`:

```typescript
{
  name: "tasks_comments_create",
  config: {
    title: "Create Task Comment",
    description: "Add a comment to a task.",
    inputSchema: {
      task_id: z.number().int().positive(),
      text: z.string().min(1)
    }
  },
  handler: async (input: { task_id: number; text: string }) => {
    try {
      const data = await client.post(`/tasks/${input.task_id}/comments`, {
        comment: { text: input.text }
      });
      return successResponse(data);
    } catch (e) {
      return genericErrorResponse(e);
    }
  }
},
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/tools/tasks.test.ts
```

Expected: all `tasks_comments_create` tests PASS. Full suite also passes:

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/tools/tasks.ts tests/tools/tasks.test.ts
git commit -m "feat(tools): add tasks_comments_create"
```

---

## Task 7: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add 4 new tools to the tools table**

In `README.md`, find the tools table and add after `tasks_time_entries_list`:

```markdown
| `tasks_create` | Create a new task |
| `tasks_update` | Update fields of an existing task |
| `tasks_update_status` | Move a task to a different board stage |
| `tasks_comments_create` | Add a comment to a task |
```

Also update the status line near the top from:

```
**Status:** v0.1 (read-only). Exposes 14 tools for tasks, projects, clients, users, teams, boards, and pipelines. Write operations (create/update tasks, log time, etc.) will follow in future versions.
```

To:

```
**Status:** v0.2. Exposes 18 tools for tasks, projects, clients, users, teams, boards, and pipelines. Includes read and write operations on tasks (create, update, status change, comment).
```

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

Expected: compiles to `dist/` with no errors.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README for v0.2 write tools"
```
