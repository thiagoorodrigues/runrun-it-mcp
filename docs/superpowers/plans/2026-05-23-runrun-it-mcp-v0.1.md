# runrun-it-mcp v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public Node/TS MCP server that exposes 14 read-only tools wrapping Runrun.it's core resources (tasks, projects, clients, users, teams, boards, pipelines), distributed via npm and runnable with `npx`.

**Architecture:** Single npm package, modular structure (`src/tools/<resource>.ts`), STDIO transport, env-var auth, manual pagination, structured error responses. Each tool module exports an array of tool definitions; an aggregator registers them on the MCP server. HTTP client is injected so handlers are unit-testable with `fetch` mocked.

**Tech Stack:** TypeScript (strict), `@modelcontextprotocol/sdk`, `zod`, native `fetch` (Node 18+), `vitest`, `tsc`.

**Spec:** `docs/superpowers/specs/2026-05-23-runrun-it-mcp-v0.1-design.md`

---

## Task 1: Project scaffolding (npm + TS + vitest)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/index.ts` (placeholder)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "runrun-it-mcp",
  "version": "0.1.0",
  "description": "MCP server for Runrun.it API (read-only, v0.1).",
  "license": "MIT",
  "type": "module",
  "bin": {
    "runrun-it-mcp": "dist/index.js"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build && npm test"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": false,
    "sourceMap": false,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"]
    }
  }
});
```

- [ ] **Step 4: Create placeholder `src/index.ts`**

```ts
#!/usr/bin/env node
// Entrypoint — populated in Task 16.
console.error("runrun-it-mcp: not yet implemented");
process.exit(1);
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 6: Verify build works**

Run: `npm run build && ls dist/`
Expected: `dist/index.js` exists.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts src/index.ts
git commit -m "chore: scaffold project (npm, ts, vitest)"
```

---

## Task 2: Config module (env var loading)

**Files:**
- Create: `src/config.ts`
- Create: `tests/config.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/config.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.RUNRUNIT_APP_KEY;
    delete process.env.RUNRUNIT_USER_TOKEN;
    delete process.env.RUNRUNIT_BASE_URL;
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("loads valid config from env", () => {
    process.env.RUNRUNIT_APP_KEY = "app-key-xyz";
    process.env.RUNRUNIT_USER_TOKEN = "user-token-abc";
    const cfg = loadConfig();
    expect(cfg.appKey).toBe("app-key-xyz");
    expect(cfg.userToken).toBe("user-token-abc");
    expect(cfg.baseUrl).toBe("https://runrun.it/api/v1.0");
    expect(cfg.logLevel).toBe("info");
  });

  it("uses custom base URL when provided", () => {
    process.env.RUNRUNIT_APP_KEY = "k";
    process.env.RUNRUNIT_USER_TOKEN = "t";
    process.env.RUNRUNIT_BASE_URL = "https://staging.runrun.it/api/v1.0";
    expect(loadConfig().baseUrl).toBe("https://staging.runrun.it/api/v1.0");
  });

  it("throws when RUNRUNIT_APP_KEY is missing", () => {
    process.env.RUNRUNIT_USER_TOKEN = "t";
    expect(() => loadConfig()).toThrow(/RUNRUNIT_APP_KEY/);
  });

  it("throws when RUNRUNIT_USER_TOKEN is missing", () => {
    process.env.RUNRUNIT_APP_KEY = "k";
    expect(() => loadConfig()).toThrow(/RUNRUNIT_USER_TOKEN/);
  });

  it("accepts valid LOG_LEVEL values", () => {
    process.env.RUNRUNIT_APP_KEY = "k";
    process.env.RUNRUNIT_USER_TOKEN = "t";
    process.env.LOG_LEVEL = "debug";
    expect(loadConfig().logLevel).toBe("debug");
  });

  it("rejects invalid LOG_LEVEL", () => {
    process.env.RUNRUNIT_APP_KEY = "k";
    process.env.RUNRUNIT_USER_TOKEN = "t";
    process.env.LOG_LEVEL = "verbose";
    expect(() => loadConfig()).toThrow(/LOG_LEVEL/);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- tests/config.test.ts`
Expected: All tests fail (module not found / function not defined).

- [ ] **Step 3: Implement `src/config.ts`**

```ts
import { z } from "zod";

const ConfigSchema = z.object({
  appKey: z.string().min(1, "RUNRUNIT_APP_KEY must not be empty"),
  userToken: z.string().min(1, "RUNRUNIT_USER_TOKEN must not be empty"),
  baseUrl: z.string().url(),
  logLevel: z.enum(["debug", "info", "warn", "error"])
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const appKey = process.env.RUNRUNIT_APP_KEY;
  const userToken = process.env.RUNRUNIT_USER_TOKEN;

  if (!appKey) {
    throw new Error("Missing required environment variable: RUNRUNIT_APP_KEY");
  }
  if (!userToken) {
    throw new Error("Missing required environment variable: RUNRUNIT_USER_TOKEN");
  }

  const raw = {
    appKey,
    userToken,
    baseUrl: process.env.RUNRUNIT_BASE_URL ?? "https://runrun.it/api/v1.0",
    logLevel: process.env.LOG_LEVEL ?? "info"
  };

  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`Invalid config (${issue.path.join(".")}): ${issue.message}`);
  }
  return result.data;
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- tests/config.test.ts`
Expected: All 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/config.ts tests/config.test.ts
git commit -m "feat(config): load and validate env vars"
```

---

## Task 3: Logger module (stderr only)

**Files:**
- Create: `src/logger.ts`
- Create: `tests/logger.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/logger.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger } from "../src/logger.js";

describe("createLogger", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  it("logs info messages to stderr", () => {
    const logger = createLogger("info");
    logger.info("hello");
    expect(stderrSpy).toHaveBeenCalled();
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it("does not log debug when level is info", () => {
    const logger = createLogger("info");
    logger.debug("noise");
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("logs debug when level is debug", () => {
    const logger = createLogger("debug");
    logger.debug("loud");
    expect(stderrSpy).toHaveBeenCalled();
  });

  it("logs error at all levels", () => {
    const logger = createLogger("error");
    logger.error("oops");
    expect(stderrSpy).toHaveBeenCalled();
  });

  it("formats with timestamp and level", () => {
    const logger = createLogger("info");
    logger.info("ping");
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
    expect(output).toMatch(/\[info\]/);
    expect(output).toMatch(/ping/);
  });
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test -- tests/logger.test.ts`
Expected: All fail (module not found).

- [ ] **Step 3: Implement `src/logger.ts`**

```ts
export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

export interface Logger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export function createLogger(level: LogLevel): Logger {
  const threshold = LEVEL_ORDER[level];

  const log = (lvl: LogLevel, msg: string) => {
    if (LEVEL_ORDER[lvl] < threshold) return;
    const ts = new Date().toISOString();
    process.stderr.write(`[${ts}] [${lvl}] ${msg}\n`);
  };

  return {
    debug: (m) => log("debug", m),
    info: (m) => log("info", m),
    warn: (m) => log("warn", m),
    error: (m) => log("error", m)
  };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- tests/logger.test.ts`
Expected: All 5 pass.

- [ ] **Step 5: Commit**

```bash
git add src/logger.ts tests/logger.test.ts
git commit -m "feat(logger): stderr logger with level filtering"
```

---

## Task 4: Errors module (MCP response formatters)

**Files:**
- Create: `src/errors.ts`
- Create: `tests/errors.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/errors.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { successResponse, apiErrorResponse, networkErrorResponse, RunrunApiError } from "../src/errors.js";

describe("successResponse", () => {
  it("wraps data as MCP text content", () => {
    const r = successResponse({ id: 1, name: "x" });
    expect(r.isError).toBeUndefined();
    expect(r.content).toHaveLength(1);
    expect(r.content[0].type).toBe("text");
    expect(JSON.parse(r.content[0].text)).toEqual({ id: 1, name: "x" });
  });
});

describe("apiErrorResponse", () => {
  it("formats 4xx as MCP error", () => {
    const err = new RunrunApiError(404, "Not Found", "tasks/999");
    const r = apiErrorResponse(err);
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("404");
    expect(r.content[0].text).toContain("Not Found");
  });

  it("flags 429 as rate limit", () => {
    const err = new RunrunApiError(429, "Too Many Requests", "tasks");
    const r = apiErrorResponse(err);
    expect(r.content[0].text).toContain("rate limit");
  });
});

describe("networkErrorResponse", () => {
  it("formats network errors", () => {
    const r = networkErrorResponse(new Error("ECONNREFUSED"));
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("Network error");
    expect(r.content[0].text).toContain("ECONNREFUSED");
  });
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test -- tests/errors.test.ts`
Expected: All fail (module not found).

- [ ] **Step 3: Implement `src/errors.ts`**

```ts
export type McpToolResponse = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export class RunrunApiError extends Error {
  constructor(
    public status: number,
    public body: string,
    public endpoint: string
  ) {
    super(`Runrun.it API error (${status}) on ${endpoint}: ${body}`);
    this.name = "RunrunApiError";
  }
}

export function successResponse(data: unknown): McpToolResponse {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
  };
}

export function apiErrorResponse(err: RunrunApiError): McpToolResponse {
  const rateLimitNote = err.status === 429 ? " (rate limit — retry later)" : "";
  return {
    content: [
      {
        type: "text",
        text: `Runrun.it API error (status ${err.status}) on ${err.endpoint}${rateLimitNote}: ${err.body}`
      }
    ],
    isError: true
  };
}

export function networkErrorResponse(err: Error): McpToolResponse {
  return {
    content: [{ type: "text", text: `Network error: ${err.message}` }],
    isError: true
  };
}

export function genericErrorResponse(err: unknown): McpToolResponse {
  if (err instanceof RunrunApiError) return apiErrorResponse(err);
  if (err instanceof Error) return networkErrorResponse(err);
  return networkErrorResponse(new Error(String(err)));
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- tests/errors.test.ts`
Expected: All 4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/errors.ts tests/errors.test.ts
git commit -m "feat(errors): MCP response formatters for success/api/network"
```

---

## Task 5: Pagination module (shared schemas)

**Files:**
- Create: `src/pagination.ts`
- Create: `tests/pagination.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/pagination.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { paginationFields, applyPaginationDefaults } from "../src/pagination.js";
import { z } from "zod";

describe("paginationFields", () => {
  it("accepts valid page and limit", () => {
    const schema = z.object(paginationFields);
    expect(schema.safeParse({ page: 2, limit: 50 }).success).toBe(true);
  });

  it("accepts empty (both optional)", () => {
    const schema = z.object(paginationFields);
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("rejects limit > 100", () => {
    const schema = z.object(paginationFields);
    expect(schema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it("rejects page < 1", () => {
    const schema = z.object(paginationFields);
    expect(schema.safeParse({ page: 0 }).success).toBe(false);
  });
});

describe("applyPaginationDefaults", () => {
  it("fills missing values with defaults", () => {
    expect(applyPaginationDefaults({})).toEqual({ page: 1, limit: 50 });
  });

  it("respects provided values", () => {
    expect(applyPaginationDefaults({ page: 3, limit: 10 })).toEqual({ page: 3, limit: 10 });
  });
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test -- tests/pagination.test.ts`
Expected: All fail (module not found).

- [ ] **Step 3: Implement `src/pagination.ts`**

```ts
import { z } from "zod";

export const paginationFields = {
  page: z.number().int().min(1).optional().describe("Page number (default 1)"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Items per page (default 50, max 100)")
};

export type PaginationInput = {
  page?: number;
  limit?: number;
};

export function applyPaginationDefaults(input: PaginationInput): {
  page: number;
  limit: number;
} {
  return {
    page: input.page ?? 1,
    limit: input.limit ?? 50
  };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- tests/pagination.test.ts`
Expected: All 6 pass.

- [ ] **Step 5: Commit**

```bash
git add src/pagination.ts tests/pagination.test.ts
git commit -m "feat(pagination): shared schemas and defaults"
```

---

## Task 6: HTTP client (auth + error wrap)

**Files:**
- Create: `src/client.ts`
- Create: `tests/client.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/client.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RunrunClient } from "../src/client.js";
import { RunrunApiError } from "../src/errors.js";

const baseConfig = {
  appKey: "app-key-xyz",
  userToken: "user-token-abc",
  baseUrl: "https://runrun.it/api/v1.0",
  logLevel: "error" as const
};

describe("RunrunClient.get", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("sends auth headers", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true })
    });
    const client = new RunrunClient(baseConfig);
    await client.get("/users/me");
    const call = (global.fetch as any).mock.calls[0];
    expect(call[0]).toBe("https://runrun.it/api/v1.0/users/me");
    expect(call[1].headers["App-Key"]).toBe("app-key-xyz");
    expect(call[1].headers["User-Token"]).toBe("user-token-abc");
  });

  it("serializes query params", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([])
    });
    const client = new RunrunClient(baseConfig);
    await client.get("/tasks", { board_id: 5, page: 2, limit: 25 });
    const url = (global.fetch as any).mock.calls[0][0];
    expect(url).toContain("board_id=5");
    expect(url).toContain("page=2");
    expect(url).toContain("limit=25");
  });

  it("omits undefined params", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([])
    });
    const client = new RunrunClient(baseConfig);
    await client.get("/tasks", { board_id: undefined, page: 1 });
    const url = (global.fetch as any).mock.calls[0][0];
    expect(url).not.toContain("board_id");
    expect(url).toContain("page=1");
  });

  it("returns parsed JSON on 2xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 42 })
    });
    const client = new RunrunClient(baseConfig);
    const data = await client.get("/users/42");
    expect(data).toEqual({ id: 42 });
  });

  it("throws RunrunApiError on 4xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "Not Found"
    });
    const client = new RunrunClient(baseConfig);
    await expect(client.get("/tasks/999")).rejects.toBeInstanceOf(RunrunApiError);
  });

  it("throws RunrunApiError on 5xx", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error"
    });
    const client = new RunrunClient(baseConfig);
    await expect(client.get("/tasks")).rejects.toMatchObject({
      status: 500,
      endpoint: "/tasks"
    });
  });

  it("propagates fetch network errors", async () => {
    (global.fetch as any).mockRejectedValue(new Error("ECONNREFUSED"));
    const client = new RunrunClient(baseConfig);
    await expect(client.get("/users")).rejects.toThrow("ECONNREFUSED");
  });
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test -- tests/client.test.ts`
Expected: All fail (module not found).

- [ ] **Step 3: Implement `src/client.ts`**

```ts
import type { Config } from "./config.js";
import { RunrunApiError } from "./errors.js";

export type QueryParams = Record<string, string | number | boolean | undefined>;

export class RunrunClient {
  constructor(private readonly config: Config) {}

  async get<T = unknown>(path: string, params: QueryParams = {}): Promise<T> {
    const url = this.buildUrl(path, params);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "App-Key": this.config.appKey,
        "User-Token": this.config.userToken,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      const body = await res.text();
      throw new RunrunApiError(res.status, body, path);
    }

    return (await res.json()) as T;
  }

  private buildUrl(path: string, params: QueryParams): string {
    const url = new URL(this.config.baseUrl + path);
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- tests/client.test.ts`
Expected: All 7 pass.

- [ ] **Step 5: Commit**

```bash
git add src/client.ts tests/client.test.ts
git commit -m "feat(client): http client with auth headers and error wrap"
```

---

## Task 7: Tool definition shape + registration helper

**Files:**
- Create: `src/tools/types.ts`
- Create: `src/tools/register.ts`
- Create: `tests/tools/register.test.ts`

This defines the shared "shape" all tool modules will conform to, plus a helper that registers them on an MCP server. Doing this once means every subsequent tool module is trivial to add.

- [ ] **Step 1: Write failing tests**

Create `tests/tools/register.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { registerTools } from "../../src/tools/register.js";
import type { ToolDefinition } from "../../src/tools/types.js";
import { z } from "zod";

describe("registerTools", () => {
  it("calls server.registerTool for each tool", () => {
    const server = { registerTool: vi.fn() };
    const tools: ToolDefinition[] = [
      {
        name: "a_tool",
        config: { title: "A", description: "desc", inputSchema: { x: z.string() } },
        handler: async () => ({ content: [{ type: "text", text: "ok" }] })
      },
      {
        name: "b_tool",
        config: { title: "B", description: "desc", inputSchema: {} },
        handler: async () => ({ content: [{ type: "text", text: "ok" }] })
      }
    ];
    registerTools(server as any, tools);
    expect(server.registerTool).toHaveBeenCalledTimes(2);
    expect(server.registerTool.mock.calls[0][0]).toBe("a_tool");
    expect(server.registerTool.mock.calls[1][0]).toBe("b_tool");
  });
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test -- tests/tools/register.test.ts`
Expected: Fail (modules not found).

- [ ] **Step 3: Implement `src/tools/types.ts`**

```ts
import type { ZodRawShape } from "zod";
import type { McpToolResponse } from "../errors.js";

export interface ToolDefinition {
  name: string;
  config: {
    title: string;
    description: string;
    inputSchema: ZodRawShape;
  };
  handler: (input: any) => Promise<McpToolResponse>;
}
```

- [ ] **Step 4: Implement `src/tools/register.ts`**

```ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolDefinition } from "./types.js";

export function registerTools(server: McpServer, tools: ToolDefinition[]): void {
  for (const tool of tools) {
    server.registerTool(tool.name, tool.config, tool.handler);
  }
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm test -- tests/tools/register.test.ts`
Expected: 1 test passes.

- [ ] **Step 6: Commit**

```bash
git add src/tools/types.ts src/tools/register.ts tests/tools/register.test.ts
git commit -m "feat(tools): shared tool definition shape and registration helper"
```

---

## Task 8: Users tools (users_list, users_get, users_me)

**Files:**
- Create: `src/tools/users.ts`
- Create: `tests/tools/users.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/tools/users.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createUsersTools } from "../../src/tools/users.js";
import { RunrunApiError } from "../../src/errors.js";

function mockClient(getImpl: any) {
  return { get: vi.fn(getImpl) } as any;
}

describe("users_list", () => {
  it("calls /users with pagination defaults and returns success", async () => {
    const client = mockClient(async () => [{ id: 1 }]);
    const tools = createUsersTools(client);
    const tool = tools.find((t) => t.name === "users_list")!;
    const res = await tool.handler({});
    expect(client.get).toHaveBeenCalledWith("/users", { page: 1, limit: 50 });
    expect(res.isError).toBeUndefined();
    expect(JSON.parse(res.content[0].text)).toEqual([{ id: 1 }]);
  });

  it("forwards custom page/limit", async () => {
    const client = mockClient(async () => []);
    const tool = createUsersTools(client).find((t) => t.name === "users_list")!;
    await tool.handler({ page: 3, limit: 10 });
    expect(client.get).toHaveBeenCalledWith("/users", { page: 3, limit: 10 });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(async () => {
      throw new RunrunApiError(500, "boom", "/users");
    });
    const tool = createUsersTools(client).find((t) => t.name === "users_list")!;
    const res = await tool.handler({});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("500");
  });
});

describe("users_get", () => {
  it("calls /users/:id", async () => {
    const client = mockClient(async () => ({ id: 42 }));
    const tool = createUsersTools(client).find((t) => t.name === "users_get")!;
    const res = await tool.handler({ id: 42 });
    expect(client.get).toHaveBeenCalledWith("/users/42");
    expect(JSON.parse(res.content[0].text)).toEqual({ id: 42 });
  });
});

describe("users_me", () => {
  it("calls /users/me", async () => {
    const client = mockClient(async () => ({ id: 1, name: "me" }));
    const tool = createUsersTools(client).find((t) => t.name === "users_me")!;
    const res = await tool.handler({});
    expect(client.get).toHaveBeenCalledWith("/users/me");
    expect(JSON.parse(res.content[0].text)).toEqual({ id: 1, name: "me" });
  });
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test -- tests/tools/users.test.ts`
Expected: All fail.

- [ ] **Step 3: Implement `src/tools/users.ts`**

```ts
import { z } from "zod";
import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createUsersTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "users_list",
      config: {
        title: "List Users",
        description: "List users in the Runrun.it account. Supports pagination.",
        inputSchema: { ...paginationFields }
      },
      handler: async (input: { page?: number; limit?: number }) => {
        try {
          const params = applyPaginationDefaults(input);
          const data = await client.get("/users", params);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "users_get",
      config: {
        title: "Get User",
        description: "Get a single user by ID.",
        inputSchema: { id: z.number().int().positive() }
      },
      handler: async (input: { id: number }) => {
        try {
          const data = await client.get(`/users/${input.id}`);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "users_me",
      config: {
        title: "Current User",
        description: "Get the user associated with the configured User-Token.",
        inputSchema: {}
      },
      handler: async () => {
        try {
          const data = await client.get("/users/me");
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- tests/tools/users.test.ts`
Expected: All 5 pass.

- [ ] **Step 5: Commit**

```bash
git add src/tools/users.ts tests/tools/users.test.ts
git commit -m "feat(tools): users_list, users_get, users_me"
```

---

## Task 9: Clients tools (clients_list, clients_get)

**Files:**
- Create: `src/tools/clients.ts`
- Create: `tests/tools/clients.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/tools/clients.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createClientsTools } from "../../src/tools/clients.js";
import { RunrunApiError } from "../../src/errors.js";

function mockClient(getImpl: any) {
  return { get: vi.fn(getImpl) } as any;
}

describe("clients_list", () => {
  it("calls /clients with pagination defaults", async () => {
    const client = mockClient(async () => []);
    const tool = createClientsTools(client).find((t) => t.name === "clients_list")!;
    await tool.handler({});
    expect(client.get).toHaveBeenCalledWith("/clients", { page: 1, limit: 50 });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(async () => {
      throw new RunrunApiError(404, "Not Found", "/clients");
    });
    const tool = createClientsTools(client).find((t) => t.name === "clients_list")!;
    const res = await tool.handler({});
    expect(res.isError).toBe(true);
  });
});

describe("clients_get", () => {
  it("calls /clients/:id", async () => {
    const client = mockClient(async () => ({ id: 7 }));
    const tool = createClientsTools(client).find((t) => t.name === "clients_get")!;
    const res = await tool.handler({ id: 7 });
    expect(client.get).toHaveBeenCalledWith("/clients/7");
    expect(JSON.parse(res.content[0].text)).toEqual({ id: 7 });
  });
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test -- tests/tools/clients.test.ts`
Expected: All fail.

- [ ] **Step 3: Implement `src/tools/clients.ts`**

```ts
import { z } from "zod";
import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createClientsTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "clients_list",
      config: {
        title: "List Clients",
        description: "List clients. Supports pagination.",
        inputSchema: { ...paginationFields }
      },
      handler: async (input: { page?: number; limit?: number }) => {
        try {
          const params = applyPaginationDefaults(input);
          const data = await client.get("/clients", params);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "clients_get",
      config: {
        title: "Get Client",
        description: "Get a single client by ID.",
        inputSchema: { id: z.number().int().positive() }
      },
      handler: async (input: { id: number }) => {
        try {
          const data = await client.get(`/clients/${input.id}`);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- tests/tools/clients.test.ts`
Expected: All 3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/tools/clients.ts tests/tools/clients.test.ts
git commit -m "feat(tools): clients_list, clients_get"
```

---

## Task 10: Teams tool (teams_list)

**Files:**
- Create: `src/tools/teams.ts`
- Create: `tests/tools/teams.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/tools/teams.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createTeamsTools } from "../../src/tools/teams.js";

function mockClient(getImpl: any) {
  return { get: vi.fn(getImpl) } as any;
}

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
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test -- tests/tools/teams.test.ts`
Expected: All fail.

- [ ] **Step 3: Implement `src/tools/teams.ts`**

```ts
import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createTeamsTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "teams_list",
      config: {
        title: "List Teams",
        description: "List teams. Supports pagination.",
        inputSchema: { ...paginationFields }
      },
      handler: async (input: { page?: number; limit?: number }) => {
        try {
          const params = applyPaginationDefaults(input);
          const data = await client.get("/teams", params);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- tests/tools/teams.test.ts`
Expected: All 2 pass.

- [ ] **Step 5: Commit**

```bash
git add src/tools/teams.ts tests/tools/teams.test.ts
git commit -m "feat(tools): teams_list"
```

---

## Task 11: Boards tool (boards_list)

**Files:**
- Create: `src/tools/boards.ts`
- Create: `tests/tools/boards.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/tools/boards.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createBoardsTools } from "../../src/tools/boards.js";

function mockClient(getImpl: any) {
  return { get: vi.fn(getImpl) } as any;
}

describe("boards_list", () => {
  it("calls /boards with pagination defaults", async () => {
    const client = mockClient(async () => []);
    const tool = createBoardsTools(client).find((t) => t.name === "boards_list")!;
    await tool.handler({});
    expect(client.get).toHaveBeenCalledWith("/boards", { page: 1, limit: 50 });
  });
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test -- tests/tools/boards.test.ts`
Expected: Fail.

- [ ] **Step 3: Implement `src/tools/boards.ts`**

```ts
import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createBoardsTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "boards_list",
      config: {
        title: "List Boards",
        description: "List boards. Use this to discover board IDs for filtering tasks.",
        inputSchema: { ...paginationFields }
      },
      handler: async (input: { page?: number; limit?: number }) => {
        try {
          const params = applyPaginationDefaults(input);
          const data = await client.get("/boards", params);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- tests/tools/boards.test.ts`
Expected: Pass.

- [ ] **Step 5: Commit**

```bash
git add src/tools/boards.ts tests/tools/boards.test.ts
git commit -m "feat(tools): boards_list"
```

---

## Task 12: Pipelines tool (pipelines_list)

**Files:**
- Create: `src/tools/pipelines.ts`
- Create: `tests/tools/pipelines.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/tools/pipelines.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createPipelinesTools } from "../../src/tools/pipelines.js";

function mockClient(getImpl: any) {
  return { get: vi.fn(getImpl) } as any;
}

describe("pipelines_list", () => {
  it("calls /pipelines with pagination defaults", async () => {
    const client = mockClient(async () => []);
    const tool = createPipelinesTools(client).find((t) => t.name === "pipelines_list")!;
    await tool.handler({});
    expect(client.get).toHaveBeenCalledWith("/pipelines", { page: 1, limit: 50 });
  });
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test -- tests/tools/pipelines.test.ts`
Expected: Fail.

- [ ] **Step 3: Implement `src/tools/pipelines.ts`**

```ts
import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createPipelinesTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "pipelines_list",
      config: {
        title: "List Pipelines",
        description: "List pipelines (workflow stages). Use this to understand task progression.",
        inputSchema: { ...paginationFields }
      },
      handler: async (input: { page?: number; limit?: number }) => {
        try {
          const params = applyPaginationDefaults(input);
          const data = await client.get("/pipelines", params);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- tests/tools/pipelines.test.ts`
Expected: Pass.

- [ ] **Step 5: Commit**

```bash
git add src/tools/pipelines.ts tests/tools/pipelines.test.ts
git commit -m "feat(tools): pipelines_list"
```

---

## Task 13: Projects tools (projects_list, projects_get)

**Files:**
- Create: `src/tools/projects.ts`
- Create: `tests/tools/projects.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/tools/projects.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createProjectsTools } from "../../src/tools/projects.js";

function mockClient(getImpl: any) {
  return { get: vi.fn(getImpl) } as any;
}

describe("projects_list", () => {
  it("calls /projects with pagination defaults", async () => {
    const client = mockClient(async () => []);
    const tool = createProjectsTools(client).find((t) => t.name === "projects_list")!;
    await tool.handler({});
    expect(client.get).toHaveBeenCalledWith("/projects", {
      page: 1,
      limit: 50,
      client_id: undefined,
      is_closed: undefined
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
      is_closed: false
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
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test -- tests/tools/projects.test.ts`
Expected: All fail.

- [ ] **Step 3: Implement `src/tools/projects.ts`**

```ts
import { z } from "zod";
import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createProjectsTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "projects_list",
      config: {
        title: "List Projects",
        description: "List projects. Filterable by client and closed status.",
        inputSchema: {
          ...paginationFields,
          client_id: z.number().int().positive().optional(),
          is_closed: z.boolean().optional()
        }
      },
      handler: async (input: {
        page?: number;
        limit?: number;
        client_id?: number;
        is_closed?: boolean;
      }) => {
        try {
          const { page, limit } = applyPaginationDefaults(input);
          const data = await client.get("/projects", {
            page,
            limit,
            client_id: input.client_id,
            is_closed: input.is_closed
          });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "projects_get",
      config: {
        title: "Get Project",
        description: "Get a single project by ID.",
        inputSchema: { id: z.number().int().positive() }
      },
      handler: async (input: { id: number }) => {
        try {
          const data = await client.get(`/projects/${input.id}`);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- tests/tools/projects.test.ts`
Expected: All 3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/tools/projects.ts tests/tools/projects.test.ts
git commit -m "feat(tools): projects_list, projects_get"
```

---

## Task 14: Tasks tools (tasks_list, tasks_get, tasks_comments_list, tasks_time_entries_list)

**Files:**
- Create: `src/tools/tasks.ts`
- Create: `tests/tools/tasks.test.ts`

This is the largest tool module — 4 tools and the richest filter set on `tasks_list`.

- [ ] **Step 1: Write failing tests**

Create `tests/tools/tasks.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createTasksTools } from "../../src/tools/tasks.js";
import { RunrunApiError } from "../../src/errors.js";

function mockClient(getImpl: any) {
  return { get: vi.fn(getImpl) } as any;
}

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
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test -- tests/tools/tasks.test.ts`
Expected: All fail.

- [ ] **Step 3: Implement `src/tools/tasks.ts`**

```ts
import { z } from "zod";
import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createTasksTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "tasks_list",
      config: {
        title: "List Tasks",
        description:
          "List tasks. Filterable by board, project, client, responsible user, task type, and closed status.",
        inputSchema: {
          ...paginationFields,
          board_id: z.number().int().positive().optional(),
          project_id: z.number().int().positive().optional(),
          client_id: z.number().int().positive().optional(),
          responsible_id: z.number().int().positive().optional(),
          type_id: z.number().int().positive().optional(),
          is_closed: z.boolean().optional()
        }
      },
      handler: async (input: {
        page?: number;
        limit?: number;
        board_id?: number;
        project_id?: number;
        client_id?: number;
        responsible_id?: number;
        type_id?: number;
        is_closed?: boolean;
      }) => {
        try {
          const { page, limit } = applyPaginationDefaults(input);
          const data = await client.get("/tasks", {
            page,
            limit,
            board_id: input.board_id,
            project_id: input.project_id,
            client_id: input.client_id,
            responsible_id: input.responsible_id,
            type_id: input.type_id,
            is_closed: input.is_closed
          });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "tasks_get",
      config: {
        title: "Get Task",
        description: "Get a single task by ID.",
        inputSchema: { id: z.number().int().positive() }
      },
      handler: async (input: { id: number }) => {
        try {
          const data = await client.get(`/tasks/${input.id}`);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "tasks_comments_list",
      config: {
        title: "List Task Comments",
        description: "List comments on a task.",
        inputSchema: {
          task_id: z.number().int().positive(),
          ...paginationFields
        }
      },
      handler: async (input: { task_id: number; page?: number; limit?: number }) => {
        try {
          const { page, limit } = applyPaginationDefaults(input);
          const data = await client.get(`/tasks/${input.task_id}/comments`, { page, limit });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "tasks_time_entries_list",
      config: {
        title: "List Task Time Entries",
        description: "List time entries (logged hours) for a task.",
        inputSchema: {
          task_id: z.number().int().positive(),
          ...paginationFields
        }
      },
      handler: async (input: { task_id: number; page?: number; limit?: number }) => {
        try {
          const { page, limit } = applyPaginationDefaults(input);
          const data = await client.get("/time_entries", {
            task_id: input.task_id,
            page,
            limit
          });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- tests/tools/tasks.test.ts`
Expected: All 6 pass.

- [ ] **Step 5: Commit**

```bash
git add src/tools/tasks.ts tests/tools/tasks.test.ts
git commit -m "feat(tools): tasks_list, tasks_get, tasks_comments_list, tasks_time_entries_list"
```

---

## Task 15: Tools aggregator (`src/tools/index.ts`)

**Files:**
- Create: `src/tools/index.ts`

This is a thin assembler. No tests — covered indirectly by Task 16's smoke test.

- [ ] **Step 1: Create `src/tools/index.ts`**

```ts
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

export function registerAllTools(server: McpServer, client: RunrunClient): void {
  registerTools(server, [
    ...createUsersTools(client),
    ...createClientsTools(client),
    ...createTeamsTools(client),
    ...createBoardsTools(client),
    ...createPipelinesTools(client),
    ...createProjectsTools(client),
    ...createTasksTools(client)
  ]);
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No TS errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/index.ts
git commit -m "feat(tools): aggregate all tool modules into registerAllTools"
```

---

## Task 16: Entrypoint (`src/index.ts`)

**Files:**
- Modify: `src/index.ts` (replace placeholder from Task 1)

- [ ] **Step 1: Replace `src/index.ts` with the real entrypoint**

```ts
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { RunrunClient } from "./client.js";
import { registerAllTools } from "./tools/index.js";

async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (e) {
    process.stderr.write(
      `runrun-it-mcp: configuration error: ${(e as Error).message}\n`
    );
    process.exit(1);
  }

  const logger = createLogger(config.logLevel);
  logger.info(`runrun-it-mcp starting (baseUrl=${config.baseUrl})`);

  const client = new RunrunClient(config);
  const server = new McpServer({
    name: "runrun-it-mcp",
    version: "0.1.0"
  });

  registerAllTools(server, client);
  logger.info("Registered all tools");

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Connected to STDIO transport, ready");
}

main().catch((e) => {
  process.stderr.write(`runrun-it-mcp: fatal error: ${(e as Error).message}\n`);
  process.exit(1);
});
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: No errors. `dist/index.js` exists.

- [ ] **Step 3: Smoke test — env var validation**

Run: `node dist/index.js`
Expected: Exits with code 1 and stderr message: `configuration error: Missing required environment variable: RUNRUNIT_APP_KEY`.

- [ ] **Step 4: Smoke test — tools/list via STDIO**

Create a temporary script `/tmp/mcp-smoke-test.sh`:

```bash
#!/bin/bash
RUNRUNIT_APP_KEY=fake RUNRUNIT_USER_TOKEN=fake LOG_LEVEL=error \
  node dist/index.js <<EOF
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
EOF
```

Run: `chmod +x /tmp/mcp-smoke-test.sh && /tmp/mcp-smoke-test.sh`
Expected: stdout contains JSON-RPC responses including a `tools/list` response listing all 14 tool names: `users_list`, `users_get`, `users_me`, `clients_list`, `clients_get`, `teams_list`, `boards_list`, `pipelines_list`, `projects_list`, `projects_get`, `tasks_list`, `tasks_get`, `tasks_comments_list`, `tasks_time_entries_list`.

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts
git commit -m "feat: wire entrypoint with config, client, server, transport"
```

---

## Task 17: Distribution files (.env.example, LICENSE, README)

**Files:**
- Create: `.env.example`
- Create: `LICENSE`
- Create: `README.md`

- [ ] **Step 1: Create `.env.example`**

```
# Required — get from your Runrun.it account: Settings → App
RUNRUNIT_APP_KEY=
RUNRUNIT_USER_TOKEN=

# Optional — defaults shown
# RUNRUNIT_BASE_URL=https://runrun.it/api/v1.0
# LOG_LEVEL=info
```

- [ ] **Step 2: Create `LICENSE` (MIT)**

```
MIT License

Copyright (c) 2026 South TI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 3: Create `README.md`**

````markdown
# runrun-it-mcp

MCP server for [Runrun.it](https://runrun.it) — exposes the Runrun.it REST API as tools usable by Claude and other MCP clients.

**Status:** v0.1 (read-only). Exposes 14 tools for tasks, projects, clients, users, teams, boards, and pipelines. Write operations (create/update tasks, log time, etc.) will follow in future versions.

## Installation

You don't install it directly — your MCP client launches it via `npx`. Just add it to your client's config.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "runrun-it": {
      "command": "npx",
      "args": ["-y", "runrun-it-mcp"],
      "env": {
        "RUNRUNIT_APP_KEY": "your-app-key",
        "RUNRUNIT_USER_TOKEN": "your-user-token"
      }
    }
  }
}
```

### Claude Code

Add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "runrun-it": {
      "command": "npx",
      "args": ["-y", "runrun-it-mcp"],
      "env": {
        "RUNRUNIT_APP_KEY": "your-app-key",
        "RUNRUNIT_USER_TOKEN": "your-user-token"
      }
    }
  }
}
```

## Getting your credentials

In Runrun.it: **Settings → Integrations → App** to get the App-Key, and your personal User-Token from your profile.

## Tools

| Tool | Description |
|---|---|
| `users_me` | Get the user behind the current token |
| `users_list` | List users |
| `users_get` | Get a user by ID |
| `clients_list` | List clients |
| `clients_get` | Get a client by ID |
| `teams_list` | List teams |
| `boards_list` | List boards |
| `pipelines_list` | List pipelines |
| `projects_list` | List projects (filter by client, closed status) |
| `projects_get` | Get a project by ID |
| `tasks_list` | List tasks (filter by board, project, client, responsible, type, closed status) |
| `tasks_get` | Get a task by ID |
| `tasks_comments_list` | List comments on a task |
| `tasks_time_entries_list` | List time entries logged to a task |

All list tools support `page` (default 1) and `limit` (default 50, max 100).

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `RUNRUNIT_APP_KEY` | yes | — | Runrun.it App-Key |
| `RUNRUNIT_USER_TOKEN` | yes | — | Runrun.it User-Token |
| `RUNRUNIT_BASE_URL` | no | `https://runrun.it/api/v1.0` | API base URL |
| `LOG_LEVEL` | no | `info` | `debug` / `info` / `warn` / `error` |

## Development

```bash
git clone https://github.com/<your-org>/runrun-it-mcp
cd runrun-it-mcp
npm install
npm test          # unit tests
npm run build     # compiles to dist/
```

To test against a real Runrun.it account locally:

```bash
cp .env.example .env
# fill in the values
RUNRUNIT_APP_KEY=... RUNRUNIT_USER_TOKEN=... node dist/index.js
```

## Roadmap

- **v0.1** (this release) — read-only core
- **v0.2** — write operations on tasks (create/update/comment/status change)
- **v0.3** — time tracking (timer, manual entries)
- **v0.4** — custom fields, tags, attachments
- **v0.5** — webhooks, reports

## License

MIT
````

- [ ] **Step 4: Commit**

```bash
git add .env.example LICENSE README.md
git commit -m "docs: README, LICENSE (MIT), .env.example"
```

---

## Task 18: Final verification and publish

**Files:** none

- [ ] **Step 1: Full clean build and test**

Run: `rm -rf dist/ node_modules/ && npm install && npm run build && npm test`
Expected: Clean install + build + all tests pass.

- [ ] **Step 2: Verify `npm pack` contents**

Run: `npm pack --dry-run`
Expected: Output lists `dist/`, `README.md`, `LICENSE`, `package.json`. **Does NOT** list `src/`, `tests/`, `.env`, or `node_modules/`.

- [ ] **Step 3: Verify `bin` works locally**

Run: `RUNRUNIT_APP_KEY=fake RUNRUNIT_USER_TOKEN=fake node dist/index.js < /dev/null`
Expected: Process starts, logs "ready" to stderr, then exits when stdin closes. No errors.

- [ ] **Step 4: Tag the version**

```bash
git tag v0.1.0
```

- [ ] **Step 5 (manual): Publish to npm**

Run: `npm login` (if not already logged in), then `npm publish --access public`
Expected: Package published as `runrun-it-mcp@0.1.0`.

- [ ] **Step 6 (manual): Push to GitHub**

```bash
git remote add origin git@github.com:<your-org>/runrun-it-mcp.git
git push -u origin main
git push origin v0.1.0
```

- [ ] **Step 7: Smoke test the published package**

In a different directory:
```bash
RUNRUNIT_APP_KEY=fake RUNRUNIT_USER_TOKEN=fake npx -y runrun-it-mcp@0.1.0 < /dev/null
```
Expected: Downloads the package, starts the server, exits cleanly.

---

## Spec coverage map

Quick check that every spec section has at least one task implementing it:

| Spec section | Implementing task(s) |
|---|---|
| §2 Decisões arquiteturais | Task 1 (scaffold), Task 17 (LICENSE) |
| §3.1 Tasks tools | Task 14 |
| §3.2 Projects tools | Task 13 |
| §3.3 Clients tools | Task 9 |
| §3.4 Users tools | Task 8 |
| §3.5 Teams tool | Task 10 |
| §3.6 Boards tool | Task 11 |
| §3.7 Pipelines tool | Task 12 |
| §4 Autenticação | Task 2 (config), Task 6 (client headers) |
| §5 Paginação | Task 5, applied in Tasks 8-14 |
| §6 Tratamento de erros | Task 4 (formatters), Task 6 (client throws), Tasks 8-14 (handlers catch) |
| §7 Logging | Task 3 (logger), Task 16 (use in entrypoint) |
| §8 Estrutura de pastas | Tasks 1-16 |
| §9 Boundaries | Whole structure (each module has narrow purpose) |
| §10 Fluxo de dados | Task 16 wires it end-to-end |
| §11 Testes | Tasks 2-14 (each has tests) |
| §12 Distribuição | Tasks 17 + 18 |
| §13 Fora de escopo | Respected throughout |
| §14 Critérios de aceite | Task 18 verifies them |
