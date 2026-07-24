# Busca de usuários + alocação em demanda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar duas MCP tools ao runrun-it-mcp — `users_search` (buscar usuário por nome/email, saída enxuta) e `tasks_assign` (alocar/desalocar o responsável de uma tarefa).

**Architecture:** Cada tool é um `ToolDefinition` adicionado às factories existentes (`createUsersTools` em `src/tools/users.ts`, `createTasksTools` em `src/tools/tasks.ts`). Reutilizam o `RunrunClient` (`get`/`patch`), os helpers de paginação e os helpers de resposta (`successResponse`/`genericErrorResponse`). Nenhum registro manual é necessário: `register.ts` já itera sobre as factories, então toda tool retornada é registrada automaticamente.

**Tech Stack:** TypeScript (ESM, imports com sufixo `.js`), Zod para input schema, Vitest para testes.

## Global Constraints

- Imports internos usam sufixo `.js` (ESM), ex.: `import { ... } from "../pagination.js"`.
- Todo handler é `async`, envolve a lógica em `try/catch`, retorna `successResponse(data)` no sucesso e `genericErrorResponse(e)` no erro.
- `page` default 1, `limit` default 50 (max 100) — via `paginationFields` e `applyPaginationDefaults`.
- O `id` de usuário no Runrun.it é um slug string (ex.: `"rodrigo-oliveira"`), usado como `responsible_id`.
- Testes usam `mockClient` de `tests/helpers/mock-client.js` e as factories `createUsersTools`/`createTasksTools`.
- Rodar a suíte inteira: `npm test`. Build: `npm run build`.

---

## File Structure

- **Modify** `src/tools/users.ts` — adicionar a tool `users_search` ao array retornado por `createUsersTools`.
- **Modify** `src/tools/tasks.ts` — adicionar a tool `tasks_assign` ao array retornado por `createTasksTools`.
- **Modify** `tests/tools/users.test.ts` — testes de `users_search`.
- **Modify** `tests/tools/tasks.test.ts` — testes de `tasks_assign`.
- **Modify** `README.md` — duas linhas novas na tabela de tools + contagem de tools.

Sem arquivos novos: as duas tools são pequenas e pertencem às factories/arquivos de teste já existentes por responsabilidade (usuários / tarefas).

---

### Task 1: Tool `users_search`

**Files:**
- Modify: `src/tools/users.ts` (adicionar objeto ao array de `createUsersTools`)
- Test: `tests/tools/users.test.ts`

**Interfaces:**
- Consumes: `paginationFields`, `applyPaginationDefaults` (`../pagination.js`); `successResponse`, `genericErrorResponse` (`../errors.js`); `RunrunClient.get(path, params)`.
- Produces: tool `users_search`, input `{ search_term: string; page?: number; limit?: number }`. Retorna via `successResponse` um array de objetos enxutos com as chaves, nesta ordem: `id`, `name`, `email`, `position`, `team_ids`, `on_vacation`.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao final de `tests/tools/users.test.ts`:

```typescript
describe("users_search", () => {
  const raw = [
    { id: "ana-silva", name: "Ana Silva", email: "ana@x.com", position: "Dev", team_ids: [1], on_vacation: false, cost_hour: 99, shifts: [] },
    { id: "joao-lima", name: "João Lima", email: "joao@x.com", position: null, team_ids: [2], on_vacation: true, cost_hour: 50, shifts: [] }
  ];

  it("forwards search_term and pagination to /users", async () => {
    const client = mockClient(async () => raw);
    const tool = createUsersTools(client).find((t) => t.name === "users_search")!;
    await tool.handler({ search_term: "ana" });
    expect(client.get).toHaveBeenCalledWith("/users", { page: 1, limit: 50, search_term: "ana" });
  });

  it("filters client-side by name (case-insensitive) and projects lean fields", async () => {
    const client = mockClient(async () => raw);
    const tool = createUsersTools(client).find((t) => t.name === "users_search")!;
    const res = await tool.handler({ search_term: "ANA" });
    expect(JSON.parse(res.content[0].text)).toEqual([
      { id: "ana-silva", name: "Ana Silva", email: "ana@x.com", position: "Dev", team_ids: [1], on_vacation: false }
    ]);
  });

  it("filters client-side by email", async () => {
    const client = mockClient(async () => raw);
    const tool = createUsersTools(client).find((t) => t.name === "users_search")!;
    const res = await tool.handler({ search_term: "joao@x" });
    const out = JSON.parse(res.content[0].text);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("joao-lima");
  });

  it("returns isError on API error", async () => {
    const client = mockClient(async () => {
      throw new RunrunApiError(500, "boom", "/users");
    });
    const tool = createUsersTools(client).find((t) => t.name === "users_search")!;
    const res = await tool.handler({ search_term: "x" });
    expect(res.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- users`
Expected: FAIL — `users_search` não existe (`find(...)` retorna `undefined`, `.handler` lança).

- [ ] **Step 3: Implementar a tool**

Em `src/tools/users.ts`, adicionar este objeto ao array retornado por `createUsersTools` (depois de `users_get`, antes de `users_me` ou em qualquer posição do array):

```typescript
    {
      name: "users_search",
      config: {
        title: "Search Users",
        description:
          "Search users by name or email via search_term (partial, case-insensitive match). Returns a lean list (id, name, email, position, team_ids, on_vacation). The id is the user slug used as responsible_id in tasks_assign / tasks_create / tasks_update.",
        inputSchema: {
          search_term: z.string().min(1),
          ...paginationFields
        }
      },
      handler: async (input: { search_term: string; page?: number; limit?: number }) => {
        try {
          const { page, limit } = applyPaginationDefaults(input);
          const data = await client.get<Array<Record<string, unknown>>>("/users", {
            page,
            limit,
            search_term: input.search_term
          });
          const term = input.search_term.toLowerCase();
          const matches = (data ?? []).filter((u) => {
            const name = String(u.name ?? "").toLowerCase();
            const email = String(u.email ?? "").toLowerCase();
            return name.includes(term) || email.includes(term);
          });
          const lean = matches.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            position: u.position,
            team_ids: u.team_ids,
            on_vacation: u.on_vacation
          }));
          return successResponse(lean);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- users`
Expected: PASS (todos os testes de `users`, incluindo os novos de `users_search`).

- [ ] **Step 5: Commit**

```bash
git add src/tools/users.ts tests/tools/users.test.ts
git commit -m "feat(users): tool users_search (busca por nome/email, saida enxuta)"
```

---

### Task 2: Tool `tasks_assign`

**Files:**
- Modify: `src/tools/tasks.ts` (adicionar objeto ao array de `createTasksTools`)
- Test: `tests/tools/tasks.test.ts`

**Interfaces:**
- Consumes: `successResponse`, `genericErrorResponse` (`../errors.js`); `RunrunClient.patch(path, body)`.
- Produces: tool `tasks_assign`, input `{ id: number; responsible_id?: string }`. Faz `PATCH /tasks/:id` com body `{ task: { responsible_id: <slug> | null } }`. `responsible_id` ausente ⇒ envia `null` (desaloca).

- [ ] **Step 1: Escrever o teste que falha**

Adicionar a `tests/tools/tasks.test.ts` (usa `createTasksTools` e `mockClient`, já importados no arquivo; o 3º argumento de `mockClient` é o `patchImpl`):

```typescript
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
```

Verificar no topo de `tests/tools/tasks.test.ts` que `vi` está importado de `vitest` (ex.: `import { describe, it, expect, vi } from "vitest";`). Se `vi` não estiver na lista de imports, adicioná-lo.

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- tasks`
Expected: FAIL — `tasks_assign` não existe.

- [ ] **Step 3: Implementar a tool**

Em `src/tools/tasks.ts`, adicionar este objeto ao array retornado por `createTasksTools` (sugestão: logo após `tasks_update`):

```typescript
    {
      name: "tasks_assign",
      config: {
        title: "Assign Task",
        description:
          "Assign a task to a responsible user, or unassign it. Pass responsible_id (the user slug from users_search, e.g. \"ana-silva\") to allocate. Omit responsible_id to remove the current responsible (unassign).",
        inputSchema: {
          id: z.number().int().positive(),
          responsible_id: z.string().min(1).optional()
        }
      },
      handler: async (input: { id: number; responsible_id?: string }) => {
        try {
          const data = await client.patch(`/tasks/${input.id}`, {
            task: { responsible_id: input.responsible_id ?? null }
          });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- tasks`
Expected: PASS (todos os testes de `tasks`, incluindo os novos de `tasks_assign`).

- [ ] **Step 5: Commit**

```bash
git add src/tools/tasks.ts tests/tools/tasks.test.ts
git commit -m "feat(tasks): tool tasks_assign (alocar/desalocar responsavel)"
```

---

### Task 3: Documentação + verificação final

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: as duas tools das Tasks 1 e 2 (`users_search`, `tasks_assign`).
- Produces: nada de código — apenas docs e a verificação de build/testes.

- [ ] **Step 1: Atualizar a tabela de tools no README**

Em `README.md`, na tabela de tools:

Após a linha `| \`users_get\` | Get a user by ID |`, adicionar:

```markdown
| `users_search` | Search users by name or email (lean output) |
```

Após a linha do `tasks_update` (`| \`tasks_update\` | Update fields of an existing task |`), adicionar:

```markdown
| `tasks_assign` | Assign a task to a responsible user, or unassign it |
```

- [ ] **Step 2: Atualizar a contagem de tools no README**

No topo do README, a frase de status diz "Exposes 30 tools". Com duas tools novas, passa a 32. Substituir "Exposes 30 tools" por "Exposes 32 tools".

- [ ] **Step 3: Rodar a suíte completa e o build**

Run: `npm test && npm run build`
Expected: todos os testes PASS e o build (`tsc`) conclui sem erros.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: users_search e tasks_assign na tabela de tools"
```

---

## Self-Review

**Spec coverage:**
- `users_search` (search_term server-side + filtro client-side + saída enxuta) → Task 1. ✅
- `tasks_assign` (PATCH responsible_id, desalocar com null) → Task 2. ✅
- README (tabela + contagem) → Task 3. ✅
- Fora de escopo (assignees múltiplos, alterar users_list, outros campos) → não há tasks, correto. ✅
- Padrão de erros (try/catch + genericErrorResponse) → coberto em cada handler e testado. ✅

**Placeholder scan:** sem TBD/TODO; todo passo com código ou comando concreto e output esperado. ✅

**Type consistency:** `users_search` produz `{ id, name, email, position, team_ids, on_vacation }` — mesma ordem/chaves no teste (Task 1) e na implementação (Task 1). `tasks_assign` usa `responsible_id?: string`, body `{ task: { responsible_id: <slug|null> } }` — consistente entre teste e implementação (Task 2). ✅
