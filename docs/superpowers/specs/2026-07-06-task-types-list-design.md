# Design: `task_types_list`

**Data:** 2026-07-06

## Problema

As ferramentas `tasks_list`, `tasks_create` e `tasks_update` aceitam um parâmetro
`type_id` (tipo de tarefa), mas o servidor MCP não expõe nenhuma forma de
**descobrir** quais tipos existem. O usuário precisa saber os `type_id` disponíveis
para poder filtrar e criar tarefas por tipo.

## Solução

Adicionar uma ferramenta de listagem `task_types_list`, seguindo exatamente o
padrão de `teams_list` (listagem simples com paginação).

### Novo arquivo: `src/tools/task_types.ts`

- Função `createTaskTypesTools(client): ToolDefinition[]`
- Uma tool:
  - **name:** `task_types_list`
  - **title:** "List Task Types"
  - **description:** "List task types. Use this to discover the `type_id` values accepted by tasks_list, tasks_create and tasks_update. Supports pagination."
  - **inputSchema:** `{ ...paginationFields }`
  - **handler:** `client.get("/task_types", applyPaginationDefaults(input))` →
    `successResponse` / `genericErrorResponse` no catch

### Registro: `src/tools/index.ts`

- Importar `createTaskTypesTools`
- Adicionar `...createTaskTypesTools(client)` ao `registerTools`

### Teste: `tests/tools/task_types.test.ts`

- Espelha `tests/tools/teams.test.ts`:
  - chama `/task_types` com defaults de paginação (`{ page: 1, limit: 50 }`)
  - repassa paginação custom

### Doc: `README.md`

- Adicionar `task_types_list` na lista de ferramentas.

## Escopo (decidido)

- **Apenas paginação** (`page`, `limit`). Sem `search_term`.
- Endpoint: `GET /task_types`.
- Somente leitura, consistente com as demais listagens.

## Fora de escopo

- Filtro por nome / busca.
- CRUD de tipos de tarefa.
