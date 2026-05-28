# Time Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 7 time tracking tools (play/pause timer, manual work period CRUD) and fix the broken `tasks_time_entries_list` tool.

**Architecture:** Extend `RunrunClient` with a `delete` method. Add `tasks_play` and `tasks_pause` to `src/tools/tasks.ts`. Create a new `src/tools/manual_work_periods.ts` with 5 tools. Wire everything through `src/tools/index.ts`. Fix `tasks_time_entries_list` to use the correct `/manual_work_periods` endpoint.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, zod, vitest, native `fetch`.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `tests/helpers/mock-client.ts` | Modify | Add optional `deleteImpl` param |
| `tests/client.test.ts` | Modify | Add `delete` test suite |
| `src/client.ts` | Modify | Add `delete<T>` method |
| `src/tools/tasks.ts` | Modify | Add `tasks_play`, `tasks_pause`; fix `tasks_time_entries_list` endpoint |
| `tests/tools/tasks.test.ts` | Modify | Add play/pause tests; fix time_entries_list test |
| `src/tools/manual_work_periods.ts` | Create | 5 tools: list, get, create, update, delete |
| `tests/tools/manual_work_periods.test.ts` | Create | Tests for all 5 tools |
| `src/tools/index.ts` | Modify | Import and register manual_work_periods tools |
| `README.md` | Modify | Update version, add 7 new tools, fix time_entries note |

---

## Task 1: Extend mockClient with deleteImpl

**Files:**
- Modify: `tests/helpers/mock-client.ts`

Current file:
```typescript
import { vi } from "vitest";
import type { RunrunClient } from "../../src/client.js";

export function mockClient(
  getImpl: (...args: Parameters<RunrunClient["get"]>) => ReturnType<RunrunClient["get"]>,
  postImpl?: (path: string, body: Record<string, unknown>) => Promise<unknown>,
  patchImpl?: (path: string, body: Record<string, unknown>) => Promise<unknown>
): RunrunClient {
  return {
    get: vi.fn(getImpl),
    post: vi.fn(postImpl ?? (async () => ({}))),
    patch: vi.fn(patchImpl ?? (async () => ({})))
  } as unknown as RunrunClient;
}
```

- [ ] **Step 1: Replace mock-client.ts with extended version**

```typescript
import { vi } from "vitest";
import type { RunrunClient } from "../../src/client.js";

export function mockClient(
  getImpl: (...args: Parameters<RunrunClient["get"]>) => ReturnType<RunrunClient["get"]>,
  postImpl?: (path: string, body: Record<string, unknown>) => Promise<unknown>,
  patchImpl?: (path: string, body: Record<string, unknown>) => Promise<unknown>,
  deleteImpl?: (path: string) => Promise<unknown>
): RunrunClient {
  return {
    get: vi.fn(getImpl),
    post: vi.fn(postImpl ?? (async () => ({}))),
    patch: vi.fn(patchImpl ?? (async () => ({}))),
    delete: vi.fn(deleteImpl ?? (async () => ({})))
  } as unknown as RunrunClient;
}
```

- [ ] **Step 2: Run existing tests to verify nothing broke**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && npm test
```

Expected: all 71 tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && git add tests/helpers/mock-client.ts && git commit -m "test(helpers): add deleteImpl to mockClient"
```

---

## Task 2: Add delete to RunrunClient

**Files:**
- Modify: `src/client.ts`
- Modify: `tests/client.test.ts`

- [ ] **Step 1: Write failing tests — append to tests/client.test.ts**

```typescript
describe("RunrunClient.delete", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("sends DELETE with auth headers and no body", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({})
    });
    const client = new RunrunClient(baseConfig);
    await client.delete("/manual_work_periods/5");
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("https://runrun.it/api/v1.0/manual_work_periods/5");
    expect(init.method).toBe("DELETE");
    expect(init.headers["App-Key"]).toBe("app-key-xyz");
    expect(init.headers["User-Token"]).toBe("user-token-abc");
    expect(init.body).toBeUndefined();
  });

  it("returns parsed JSON on 2xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 5 })
    });
    const client = new RunrunClient(baseConfig);
    const data = await client.delete("/manual_work_periods/5");
    expect(data).toEqual({ id: 5 });
  });

  it("throws RunrunApiError on 4xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "Not Found"
    });
    const client = new RunrunClient(baseConfig);
    await expect(client.delete("/manual_work_periods/999")).rejects.toBeInstanceOf(RunrunApiError);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && npm test -- tests/client.test.ts
```

Expected: FAIL — `client.delete is not a function`.

- [ ] **Step 3: Add delete method to src/client.ts**

Add after the `patch` method (before `private authHeaders()`):

```typescript
  async delete<T = unknown>(path: string): Promise<T> {
    const url = this.buildUrl(path, {});
    const res = await fetch(url, {
      method: "DELETE",
      headers: this.authHeaders()
    });
    return this.parseResponse<T>(res, path);
  }
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && npm test -- tests/client.test.ts
```

Expected: all client tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && git add src/client.ts tests/client.test.ts && git commit -m "feat(client): add delete method"
```

---

## Task 3: Fix tasks_time_entries_list and add tasks_play + tasks_pause

**Files:**
- Modify: `src/tools/tasks.ts`
- Modify: `tests/tools/tasks.test.ts`

- [ ] **Step 1: Fix the existing test for tasks_time_entries_list**

In `tests/tools/tasks.test.ts`, find:

```typescript
    expect(client.get).toHaveBeenCalledWith("/time_entries", {
      task_id: 200,
      page: 1,
      limit: 50
    });
```

Replace with:

```typescript
    expect(client.get).toHaveBeenCalledWith("/manual_work_periods", {
      task_id: 200,
      page: 1,
      limit: 50
    });
```

- [ ] **Step 2: Append play/pause failing tests to tests/tools/tasks.test.ts**

```typescript
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
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && npm test -- tests/tools/tasks.test.ts
```

Expected: `tasks_time_entries_list` test fails (wrong endpoint), play/pause tools not found.

- [ ] **Step 4: Fix tasks_time_entries_list in src/tools/tasks.ts**

Find:
```typescript
          const data = await client.get("/time_entries", {
```

Replace with:
```typescript
          const data = await client.get("/manual_work_periods", {
```

Also update the tool's description from:
```typescript
        description: "List time entries (logged hours) for a task.",
```
To:
```typescript
        description: "List manual work periods (logged hours) for a task.",
```

- [ ] **Step 5: Add tasks_play and tasks_pause to src/tools/tasks.ts**

Add inside the `return [...]` array, after `tasks_get_description`:

```typescript
    {
      name: "tasks_play",
      config: {
        title: "Play Task",
        description: "Start the timer on a task for the authenticated user. If the user is currently working on another task, that task will be paused automatically.",
        inputSchema: {
          id: z.number().int().positive()
        }
      },
      handler: async (input: { id: number }) => {
        try {
          const data = await client.post(`/tasks/${input.id}/play`, {});
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "tasks_pause",
      config: {
        title: "Pause Task",
        description: "Pause the timer on a task for the authenticated user.",
        inputSchema: {
          id: z.number().int().positive()
        }
      },
      handler: async (input: { id: number }) => {
        try {
          const data = await client.post(`/tasks/${input.id}/pause`, {});
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
```

- [ ] **Step 6: Run all tests to confirm they pass**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && npm test -- tests/tools/tasks.test.ts
```

Expected: all tasks tests pass (including fixed time_entries_list and new play/pause).

- [ ] **Step 7: Commit**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && git add src/tools/tasks.ts tests/tools/tasks.test.ts && git commit -m "feat(tools): add tasks_play, tasks_pause; fix tasks_time_entries_list endpoint"
```

---

## Task 4: Create manual_work_periods tools

**Files:**
- Create: `src/tools/manual_work_periods.ts`
- Create: `tests/tools/manual_work_periods.test.ts`

- [ ] **Step 1: Write failing tests — create tests/tools/manual_work_periods.test.ts**

```typescript
import { describe, it, expect } from "vitest";
import { createManualWorkPeriodsTools } from "../../src/tools/manual_work_periods.js";
import { RunrunApiError } from "../../src/errors.js";
import { mockClient } from "../helpers/mock-client.js";

describe("manual_work_periods_list", () => {
  it("calls /manual_work_periods with pagination defaults", async () => {
    const client = mockClient(async () => []);
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_list")!;
    await tool.handler({});
    expect(client.get).toHaveBeenCalledWith("/manual_work_periods", {
      page: 1,
      limit: 50,
      task_id: undefined,
      user_id: undefined,
      from: undefined,
      before: undefined
    });
  });

  it("forwards filters", async () => {
    const client = mockClient(async () => []);
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_list")!;
    await tool.handler({ task_id: 10, user_id: "thiago", from: "2026-05-01", before: "2026-05-31" });
    expect(client.get).toHaveBeenCalledWith("/manual_work_periods", {
      page: 1,
      limit: 50,
      task_id: 10,
      user_id: "thiago",
      from: "2026-05-01",
      before: "2026-05-31"
    });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(async () => { throw new RunrunApiError(500, "Error", "/manual_work_periods"); });
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_list")!;
    const res = await tool.handler({});
    expect(res.isError).toBe(true);
  });
});

describe("manual_work_periods_get", () => {
  it("calls /manual_work_periods/:id", async () => {
    const client = mockClient(async () => ({ id: 7, seconds: 3600 }));
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_get")!;
    const res = await tool.handler({ id: 7 });
    expect(client.get).toHaveBeenCalledWith("/manual_work_periods/7");
    expect(JSON.parse(res.content[0].text)).toMatchObject({ id: 7 });
  });
});

describe("manual_work_periods_create", () => {
  it("calls POST /manual_work_periods with required fields", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({ id: 1, task_id: 10, seconds: 3600 })
    );
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_create")!;
    const res = await tool.handler({ task_id: 10, seconds: 3600 });
    expect(client.post).toHaveBeenCalledWith("/manual_work_periods", {
      manual_work_period: { task_id: 10, seconds: 3600 }
    });
    expect(JSON.parse(res.content[0].text)).toMatchObject({ id: 1 });
  });

  it("includes optional fields when provided", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({ id: 2 })
    );
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_create")!;
    await tool.handler({ task_id: 10, seconds: 7200, board_stage_id: 42, date_to_apply: "2026-05-20" });
    expect(client.post).toHaveBeenCalledWith("/manual_work_periods", {
      manual_work_period: { task_id: 10, seconds: 7200, board_stage_id: 42, date_to_apply: "2026-05-20" }
    });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(
      async () => ({}),
      async () => { throw new RunrunApiError(422, "Invalid", "/manual_work_periods"); }
    );
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_create")!;
    const res = await tool.handler({ task_id: 10, seconds: 3600 });
    expect(res.isError).toBe(true);
  });
});

describe("manual_work_periods_update", () => {
  it("calls PATCH /manual_work_periods/:id with provided fields only", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({ id: 5, seconds: 1800 })
    );
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_update")!;
    const res = await tool.handler({ id: 5, seconds: 1800 });
    expect(client.patch).toHaveBeenCalledWith("/manual_work_periods/5", {
      manual_work_period: { seconds: 1800 }
    });
    expect(JSON.parse(res.content[0].text)).toMatchObject({ id: 5 });
  });

  it("sends only fields provided", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({ id: 3 })
    );
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_update")!;
    await tool.handler({ id: 3, date_to_apply: "2026-05-15" });
    expect(client.patch).toHaveBeenCalledWith("/manual_work_periods/3", {
      manual_work_period: { date_to_apply: "2026-05-15" }
    });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => { throw new RunrunApiError(404, "Not Found", "/manual_work_periods/999"); }
    );
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_update")!;
    const res = await tool.handler({ id: 999, seconds: 100 });
    expect(res.isError).toBe(true);
  });
});

describe("manual_work_periods_delete", () => {
  it("calls DELETE /manual_work_periods/:id", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({}),
      async () => ({})
    );
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_delete")!;
    const res = await tool.handler({ id: 5 });
    expect(client.delete).toHaveBeenCalledWith("/manual_work_periods/5");
    expect(res.isError).toBeUndefined();
  });

  it("returns isError on API error", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({}),
      async () => { throw new RunrunApiError(404, "Not Found", "/manual_work_periods/999"); }
    );
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_delete")!;
    const res = await tool.handler({ id: 999 });
    expect(res.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && npm test -- tests/tools/manual_work_periods.test.ts
```

Expected: FAIL — module `manual_work_periods.js` not found.

- [ ] **Step 3: Create src/tools/manual_work_periods.ts**

```typescript
import { z } from "zod";
import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createManualWorkPeriodsTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "manual_work_periods_list",
      config: {
        title: "List Manual Work Periods",
        description: "List manual work periods (logged hours). Filter by task, user, or date range. Default period is 1 month if from/before not specified.",
        inputSchema: {
          ...paginationFields,
          task_id: z.number().int().positive().optional(),
          user_id: z.string().optional(),
          from: z.string().optional(),
          before: z.string().optional()
        }
      },
      handler: async (input: {
        page?: number;
        limit?: number;
        task_id?: number;
        user_id?: string;
        from?: string;
        before?: string;
      }) => {
        try {
          const { page, limit } = applyPaginationDefaults(input);
          const data = await client.get("/manual_work_periods", {
            page,
            limit,
            task_id: input.task_id,
            user_id: input.user_id,
            from: input.from,
            before: input.before
          });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "manual_work_periods_get",
      config: {
        title: "Get Manual Work Period",
        description: "Get a single manual work period by ID.",
        inputSchema: {
          id: z.number().int().positive()
        }
      },
      handler: async (input: { id: number }) => {
        try {
          const data = await client.get(`/manual_work_periods/${input.id}`);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "manual_work_periods_create",
      config: {
        title: "Create Manual Work Period",
        description: "Log hours manually on a task. Provide seconds worked, task ID, and optionally the date and board stage.",
        inputSchema: {
          task_id: z.number().int().positive(),
          seconds: z.number().int().positive(),
          board_stage_id: z.number().int().positive().optional(),
          date_to_apply: z.string().optional()
        }
      },
      handler: async (input: {
        task_id: number;
        seconds: number;
        board_stage_id?: number;
        date_to_apply?: string;
      }) => {
        try {
          const period: Record<string, unknown> = {
            task_id: input.task_id,
            seconds: input.seconds
          };
          if (input.board_stage_id !== undefined) period.board_stage_id = input.board_stage_id;
          if (input.date_to_apply !== undefined) period.date_to_apply = input.date_to_apply;
          const data = await client.post("/manual_work_periods", { manual_work_period: period });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "manual_work_periods_update",
      config: {
        title: "Update Manual Work Period",
        description: "Update a manual work period. Only provided fields are changed.",
        inputSchema: {
          id: z.number().int().positive(),
          seconds: z.number().int().positive().optional(),
          board_stage_id: z.number().int().positive().optional(),
          date_to_apply: z.string().optional()
        }
      },
      handler: async (input: {
        id: number;
        seconds?: number;
        board_stage_id?: number;
        date_to_apply?: string;
      }) => {
        try {
          const period: Record<string, unknown> = {};
          if (input.seconds !== undefined) period.seconds = input.seconds;
          if (input.board_stage_id !== undefined) period.board_stage_id = input.board_stage_id;
          if (input.date_to_apply !== undefined) period.date_to_apply = input.date_to_apply;
          const data = await client.patch(`/manual_work_periods/${input.id}`, { manual_work_period: period });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "manual_work_periods_delete",
      config: {
        title: "Delete Manual Work Period",
        description: "Delete a manual work period. Only your own work periods can be deleted.",
        inputSchema: {
          id: z.number().int().positive()
        }
      },
      handler: async (input: { id: number }) => {
        try {
          await client.delete(`/manual_work_periods/${input.id}`);
          return successResponse({});
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && npm test -- tests/tools/manual_work_periods.test.ts
```

Expected: all 10 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && git add src/tools/manual_work_periods.ts tests/tools/manual_work_periods.test.ts && git commit -m "feat(tools): add manual_work_periods CRUD tools"
```

---

## Task 5: Wire manual_work_periods into the server

**Files:**
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Update src/tools/index.ts**

Replace the full file:

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RunrunClient } from "../client.js";
import { registerTools } from "./register.js";
import { createUsersTools } from "./users.js";
import { createClientsTools } from "./clients.js";
import { createTeamsTools } from "./teams.js";
import { createBoardsTools } from "./boards.js";
import { createPipelinesTools } from "./pipelines.js";
import { createProjectsTools } from "./projects.js";
import { createTasksTools } from "./tasks.js";
import { createManualWorkPeriodsTools } from "./manual_work_periods.js";

export function registerAllTools(server: McpServer, client: RunrunClient): void {
  registerTools(server, [
    ...createUsersTools(client),
    ...createClientsTools(client),
    ...createTeamsTools(client),
    ...createBoardsTools(client),
    ...createPipelinesTools(client),
    ...createProjectsTools(client),
    ...createTasksTools(client),
    ...createManualWorkPeriodsTools(client)
  ]);
}
```

- [ ] **Step 2: Run full test suite and build**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && npm test && npm run build
```

Expected: all tests pass, build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && git add src/tools/index.ts && git commit -m "feat: wire manual_work_periods tools into server"
```

---

## Task 6: Update README and publish

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update status line**

Find:
```
**Status:** v0.2.1. Exposes 19 tools
```

Replace with:
```
**Status:** v0.3. Exposes 26 tools for tasks, projects, clients, users, teams, boards, pipelines, and time tracking. Includes read/write for tasks and manual work periods, plus timer control.
```

- [ ] **Step 2: Add new tools to the tools table**

After `| \`tasks_get_description\` | Get the full description of a task (separate endpoint) |`, add:

```markdown
| `tasks_play` | Start the timer on a task |
| `tasks_pause` | Pause the timer on a task |
| `manual_work_periods_list` | List manual work periods (logged hours) |
| `manual_work_periods_get` | Get a single manual work period |
| `manual_work_periods_create` | Log hours manually on a task |
| `manual_work_periods_update` | Update a manual work period |
| `manual_work_periods_delete` | Delete a manual work period |
```

Also update the note on `tasks_time_entries_list`:

Find:
```
| `tasks_time_entries_list` | List time entries logged to a task |
```

Replace with:
```
| `tasks_time_entries_list` | List manual work periods for a task (alias for manual_work_periods_list filtered by task) |
```

- [ ] **Step 3: Update roadmap**

Find:
```
- **v0.2** ✅ — write operations on tasks (create/update/comment/status change)
- **v0.3** — time tracking (timer, manual entries)
```

Replace with:
```
- **v0.2** ✅ — write operations on tasks (create/update/comment/status change)
- **v0.3** ✅ — time tracking (timer play/pause, manual work period CRUD)
```

- [ ] **Step 4: Bump version and publish**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && git add README.md && git commit -m "docs: update README for v0.3 time tracking" && npm version minor && git push origin main && npm publish --access public
```

Expected: published as `runrun-it-mcp@0.2.0`.
