# Busca de usuários + alocação em demanda — Design

**Data:** 2026-07-24
**Status:** Aprovado para plano

## Objetivo

Permitir, via MCP, encontrar um usuário pelo nome/email e alocá-lo (ou desalocá-lo)
como responsável de uma tarefa ("demanda") no Runrun.it.

Hoje o servidor expõe `users_list` (só paginação, sem filtro) e permite definir o
`responsible_id` embutido no `tasks_update`/`tasks_create` genéricos. Faltam:

1. Uma forma direta de **buscar** um usuário por nome/email (para descobrir seu slug).
2. Uma tool **dedicada** para alocação, com intenção clara para o modelo.

## Fatos verificados

- O `id` do usuário no Runrun.it é um **slug string** (ex.: `"rodrigo-oliveira"`), e é
  exatamente o valor usado em `responsible_id` de tarefas.
- O objeto usuário retornado por `GET /users` inclui `name` e `email`, além de ~60 outros
  campos (turnos, preferências etc.), tornando o payload cru muito pesado em tokens.
- O padrão de busca server-side por `search_term` (partial match) já é usado em
  `/clients`, `/projects` e `/tags`. Presume-se que `/users` também aceite; um filtro
  client-side de segurança elimina o risco caso não aceite.
- A conta tem ordem de dezenas de usuários (cabe em uma página de até 100).

## Escopo

### Tool 1 — `users_search`

Buscar usuários por nome ou email.

- **Arquivo:** `src/tools/users.ts` (adicionar à lista existente)
- **Input:**
  - `search_term: z.string().min(1)` — obrigatório
  - `...paginationFields` — `page`, `limit` opcionais (defaults padrão)
- **Comportamento:**
  1. `GET /users` com `{ page, limit, search_term }` (busca server-side quando suportada).
  2. Filtro **client-side** de segurança: mantém apenas usuários cujo `name` ou `email`
     contenham `search_term` (case-insensitive). Garante resultado correto mesmo se a API
     ignorar `search_term`.
  3. **Projeta campos enxutos** de cada usuário, na ordem:
     `id`, `name`, `email`, `position`, `team_ids`, `on_vacation`.
- **Saída:** `successResponse(usuariosEnxutos)`.
- **Racional da projeção:** `id` é o slug pronto para `tasks_assign`; `name`/`email` para
  conferência; `position`/`team_ids`/`on_vacation` ajudam a escolher a pessoa certa.

### Tool 2 — `tasks_assign`

Alocar (ou desalocar) o responsável de uma tarefa.

- **Arquivo:** `src/tools/tasks.ts` (adicionar à lista existente)
- **Input:**
  - `id: z.number().int().positive()` — id da tarefa
  - `responsible_id: z.string().min(1).optional()` — slug do usuário
    (de `users_search`). **Ausente/omitido = desalocar.**
- **Comportamento:**
  - `PATCH /tasks/:id` com `{ task: { responsible_id: <slug> | null } }`.
  - Se `responsible_id` presente → aloca aquele usuário.
  - Se `responsible_id` ausente → envia `responsible_id: null` para remover o responsável.
- **Saída:** `successResponse(data)` (tarefa atualizada, payload cru — igual às demais).
- **Nota:** reaproveita o mesmo endpoint/verbo (`PATCH`) já usado por `tasks_update`;
  a tool apenas restringe a superfície e deixa a intenção explícita.

## Fora de escopo (YAGNI)

- Múltiplos assignees / co-responsáveis (`assignees_ids`) — Runrun.it modela a tarefa com
  um único responsável; não faz parte desta entrega.
- Alterar a `users_list` existente (permanece como está, retornando o objeto cru).
- Busca por outros campos além de nome/email.

## Tratamento de erros

Segue o padrão do projeto: cada handler em `try/catch`, sucesso via `successResponse`,
falha via `genericErrorResponse(e)`. Erros HTTP da API sobem como `RunrunApiError` e são
formatados pelo caminho de erro genérico.

## Testes

Seguindo o padrão de `tests/tools/*.test.ts` com o `mock-client`:

- **`users_search`:**
  - Envia `search_term` e paginação como query params ao `GET /users`.
  - Aplica o filtro client-side por `name` e por `email` (case-insensitive).
  - Projeta apenas os campos enxutos esperados, na ordem definida.
  - Propaga erro via `genericErrorResponse`.
- **`tasks_assign`:**
  - Com `responsible_id` → `PATCH /tasks/:id` com `{ task: { responsible_id: <slug> } }`.
  - Sem `responsible_id` → `PATCH` com `{ task: { responsible_id: null } }` (desaloca).
  - Propaga erro via `genericErrorResponse`.

## Documentação

- Adicionar as duas linhas na tabela de tools do `README.md`.
- Atualizar a contagem de tools mencionada no topo do README, se aplicável.
