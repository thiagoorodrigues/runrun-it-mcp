# Custom Fields + Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 tools: list task fields, update custom fields, search tags, and update task tags.

**Architecture:** Add `put<T>` to `RunrunClient` (same pattern as `post`). Add 3 tools to `src/tools/tasks.ts`. Create new `src/tools/tags.ts` with `tags_search`. Wire tags into `src/tools/index.ts`.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, zod, vitest, native `fetch`.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `tests/helpers/mock-client.ts` | Modify | Add optional `putImpl` param |
| `tests/client.test.ts` | Modify | Add `put` test suite |
| `src/client.ts` | Modify | Add `put<T>` method |
| `src/tools/tasks.ts` | Modify | Add `tasks_list_fields`, `tasks_update_custom_fields`, `tasks_update_tags` |
| `tests/tools/tasks.test.ts` | Modify | Tests for the 3 new task tools |
| `src/tools/tags.ts` | Create | `tags_search` tool |
| `tests/tools/tags.test.ts` | Create | Tests for `tags_search` |
| `src/tools/index.ts` | Modify | Import and register tags tools |
| `README.md` | Modify | Update version, add 4 new tools |

---

## Task 1: Extend mockClient with putImpl

**Files:**
- Modify: `tests/helpers/mock-client.ts`

- [ ] **Step 1: Replace the file with extended version**

```typescript
import { vi } from "vitest";
import type { RunrunClient } from "../../src/client.js";

export function mockClient(
  getImpl: (...args: Parameters<RunrunClient["get"]>) => ReturnType<RunrunClient["get"]>,
  postImpl?: (path: string, body: Record<string, unknown>) => Promise<unknown>,
  patchImpl?: (path: string, body: Record<string, unknown>) => Promise<unknown>,
  deleteImpl?: (path: string) => Promise<unknown>,
  putImpl?: (path: string, body: Record<string, unknown>) => Promise<unknown>
): RunrunClient {
  return {
    get: vi.fn(getImpl),
    post: vi.fn(postImpl ?? (async () => ({}))),
    patch: vi.fn(patchImpl ?? (async () => ({}))),
    delete: vi.fn(deleteImpl ?? (async () => ({}))),
    put: vi.fn(putImpl ?? (async () => ({})))
  } as unknown as RunrunClient;
}
```

- [ ] **Step 2: Run existing tests to verify nothing broke**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && npm test
```

Expected: all 90 tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && git add tests/helpers/mock-client.ts && git commit -m "test(helpers): add putImpl to mockClient"
```

---

## Task 2: Add put to RunrunClient

**Files:**
- Modify: `src/client.ts`
- Modify: `tests/client.test.ts`

- [ ] **Step 1: Append failing tests to tests/client.test.ts**

```typescript
describe("RunrunClient.put", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("sends PUT with JSON body and auth headers", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 1 })
    });
    const client = new RunrunClient(baseConfig);
    await client.put("/tasks/1", { task: { custom_fields: { custom_67: "val" } } });
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("https://runrun.it/api/v1.0/tasks/1");
    expect(init.method).toBe("PUT");
    expect(init.headers["App-Key"]).toBe("app-key-xyz");
    expect(init.headers["User-Token"]).toBe("user-token-abc");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ task: { custom_fields: { custom_67: "val" } } });
  });

  it("returns parsed JSON on 2xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 42 })
    });
    const client = new RunrunClient(baseConfig);
    const data = await client.put("/tasks/1", {});
    expect(data).toEqual({ id: 42 });
  });

  it("throws RunrunApiError on 4xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "Unprocessable Entity"
    });
    const client = new RunrunClient(baseConfig);
    await expect(client.put("/tasks/1", {})).rejects.toBeInstanceOf(RunrunApiError);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && npm test -- tests/client.test.ts
```

Expected: FAIL — `client.put is not a function`.

- [ ] **Step 3: Add put method to src/client.ts**

Add after `delete` and before `private authHeaders()`:

```typescript
  async put<T = unknown>(path: string, body: BodyParams): Promise<T> {
    const url = this.buildUrl(path, {});
    const res = await fetch(url, {
      method: "PUT",
      headers: this.authHeaders(),
      body: JSON.stringify(body)
    });
    return this.parseResponse<T>(res, path);
  }
```

- [ ] **Step 4: Run all tests to confirm they pass**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && git add src/client.ts tests/client.test.ts && git commit -m "feat(client): add put method"
```

---

## Task 3: Add tasks_list_fields, tasks_update_custom_fields, tasks_update_tags

**Files:**
- Modify: `src/tools/tasks.ts`
- Modify: `tests/tools/tasks.test.ts`

- [ ] **Step 1: Append failing tests to tests/tools/tasks.test.ts**

```typescript
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && npm test -- tests/tools/tasks.test.ts
```

Expected: FAIL — tools not found.

- [ ] **Step 3: Add 3 tools to src/tools/tasks.ts**

Add inside the `return [...]` array, after the `tasks_pause` entry (before the closing `]`):

```typescript
    {
      name: "tasks_list_fields",
      config: {
        title: "List Task Fields",
        description: "List custom fields available for a task's board. Use this to discover field IDs (e.g. custom_67) before calling tasks_update_custom_fields.",
        inputSchema: {
          id: z.number().int().positive()
        }
      },
      handler: async (input: { id: number }) => {
        try {
          const data = await client.get(`/tasks/${input.id}/fields`);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "tasks_update_custom_fields",
      config: {
        title: "Update Task Custom Fields",
        description: "Update custom fields on a task. Use tasks_list_fields first to discover available field IDs. Pass a custom_fields object with field keys like custom_67, custom_73, etc.",
        inputSchema: {
          id: z.number().int().positive(),
          custom_fields: z.record(z.unknown())
        }
      },
      handler: async (input: { id: number; custom_fields: Record<string, unknown> }) => {
        try {
          const data = await client.put(`/tasks/${input.id}`, {
            task: { custom_fields: input.custom_fields }
          });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "tasks_update_tags",
      config: {
        title: "Update Task Tags",
        description: "Replace all tags on a task. Use tags_search to find existing tags. WARNING: this replaces all existing tags — include current tags if you only want to add one.",
        inputSchema: {
          id: z.number().int().positive(),
          tags: z.array(z.object({
            name: z.string().min(1),
            color: z.string().min(1)
          }))
        }
      },
      handler: async (input: { id: number; tags: Array<{ name: string; color: string }> }) => {
        try {
          const data = await client.put(`/tasks/${input.id}`, {
            task: { tags_data: input.tags }
          });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
```

- [ ] **Step 4: Run all tests to confirm they pass**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && npm test -- tests/tools/tasks.test.ts
```

Expected: all tasks tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && git add src/tools/tasks.ts tests/tools/tasks.test.ts && git commit -m "feat(tools): add tasks_list_fields, tasks_update_custom_fields, tasks_update_tags"
```

---

## Task 4: Create tags_search tool

**Files:**
- Create: `src/tools/tags.ts`
- Create: `tests/tools/tags.test.ts`

- [ ] **Step 1: Create tests/tools/tags.test.ts**

```typescript
import { describe, it, expect } from "vitest";
import { createTagsTools } from "../../src/tools/tags.js";
import { RunrunApiError } from "../../src/errors.js";
import { mockClient } from "../helpers/mock-client.js";

describe("tags_search", () => {
  it("calls /tags with search_term", async () => {
    const client = mockClient(async () => [{ name: "bug", color: "#FF0000" }]);
    const tool = createTagsTools(client).find((t) => t.name === "tags_search")!;
    const res = await tool.handler({ search_term: "bug" });
    expect(client.get).toHaveBeenCalledWith("/tags", { search_term: "bug" });
    expect(JSON.parse(res.content[0].text)).toMatchObject([{ name: "bug" }]);
  });

  it("returns isError on API error", async () => {
    const client = mockClient(async () => { throw new RunrunApiError(500, "Error", "/tags"); });
    const tool = createTagsTools(client).find((t) => t.name === "tags_search")!;
    const res = await tool.handler({ search_term: "x" });
    expect(res.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && npm test -- tests/tools/tags.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/tools/tags.ts**

```typescript
import { z } from "zod";
import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createTagsTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "tags_search",
      config: {
        title: "Search Tags",
        description: "Search existing tags by name. Returns tags that fully or partially match the search term. Use this before tasks_update_tags to find tag names and colors.",
        inputSchema: {
          search_term: z.string().min(1)
        }
      },
      handler: async (input: { search_term: string }) => {
        try {
          const data = await client.get("/tags", { search_term: input.search_term });
          return successResponse(data);
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
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && npm test -- tests/tools/tags.test.ts
```

Expected: both tags_search tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && git add src/tools/tags.ts tests/tools/tags.test.ts && git commit -m "feat(tools): add tags_search"
```

---

## Task 5: Wire tags into server and update README

**Files:**
- Modify: `src/tools/index.ts`
- Modify: `README.md`

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
import { createTagsTools } from "./tags.js";

export function registerAllTools(server: McpServer, client: RunrunClient): void {
  registerTools(server, [
    ...createUsersTools(client),
    ...createClientsTools(client),
    ...createTeamsTools(client),
    ...createBoardsTools(client),
    ...createPipelinesTools(client),
    ...createProjectsTools(client),
    ...createTasksTools(client),
    ...createManualWorkPeriodsTools(client),
    ...createTagsTools(client)
  ]);
}
```

- [ ] **Step 2: Update README.md**

**Change 1** — status line:

Find: `**Status:** v0.3.`
Replace with: `**Status:** v0.4.`

Find: `Exposes 26 tools`
Replace with: `Exposes 30 tools`

**Change 2** — add 4 new tools to the tools table, after `| \`manual_work_periods_delete\` | Delete a manual work period |`:

```markdown
| `tasks_list_fields` | List custom fields available for a task |
| `tasks_update_custom_fields` | Update custom fields on a task |
| `tasks_update_tags` | Replace all tags on a task |
| `tags_search` | Search existing tags by name |
```

**Change 3** — update roadmap:

Find: `- **v0.4** — custom fields, tags, attachments`
Replace with: `- **v0.4** ✅ — custom fields, tags (attachments deferred)`

- [ ] **Step 3: Run full test suite and build**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && npm test && npm run build
```

Expected: all tests pass, build succeeds.

- [ ] **Step 4: Commit, bump version, push and publish**

```bash
cd /Users/thiagorodrigues/Projetos/south/runrun-mcp && git add src/tools/index.ts README.md && git commit -m "feat: wire tags tools into server; update README for v0.4" && npm version minor && git push origin main && npm publish --access public
```

Expected: published as `runrun-it-mcp@0.3.0`.
