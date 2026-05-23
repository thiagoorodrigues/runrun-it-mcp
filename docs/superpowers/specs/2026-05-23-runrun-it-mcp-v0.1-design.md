# Design — `runrun-it-mcp` v0.1 (Core leitura)

**Data:** 2026-05-23
**Status:** Aprovado (brainstorming)
**Próximo passo:** Plano de implementação

---

## 1. Contexto e objetivo

Construir um servidor MCP (Model Context Protocol) que exponha a API do Runrun.it ao Claude e outros clientes MCP. O caso de uso primário é um agente que auxilia em:

- Criação de demandas (tasks)
- Análise (status, gargalos, lead time)
- Relatórios

Este spec cobre apenas a **v0.1**, que entrega leitura dos recursos centrais da API. Versões futuras (v0.2 escrita, v0.3 time tracking, v0.4 metadata, v0.5 avançado) terão specs próprios.

## 2. Decisões arquiteturais

| Decisão | Escolha | Justificativa |
|---|---|---|
| Linguagem | TypeScript (estrito) | SDK MCP oficial é TS; ecossistema maduro |
| Transport | STDIO | Uso local por agente; sem necessidade de hospedagem |
| Distribuição | npm + GitHub público | Usuários instalam com `npx -y runrun-it-mcp` |
| Granularidade | MCP único modular | Auth compartilhada, agente cruza categorias, 1 install |
| HTTP client | `fetch` nativo (Node 18+) | Sem dependência externa |
| Validação | `zod` | Padrão de fato em MCPs TS |
| Testes | `vitest` + mock de `fetch` | Sem integration tests contra API real na v0.1 |
| Build | `tsc` simples | Sem bundler complexo |
| Licença | MIT | Padrão pra MCPs públicos |

## 3. Tools expostas (14)

Todas são read-only. Inputs validados via zod. Output é JSON serializado em texto MCP.

### 3.1 Tasks

**`tasks_list`** — Lista tasks com filtros.
- Inputs (todos opcionais): `board_id`, `project_id`, `client_id`, `responsible_id`, `type_id`, `is_closed` (bool), `page` (default 1), `limit` (default 50, max 100)
- Endpoint: `GET /tasks?...`

**`tasks_get`** — Detalhe de uma task.
- Input: `id` (number, obrigatório)
- Endpoint: `GET /tasks/:id`

**`tasks_comments_list`** — Comentários de uma task.
- Inputs: `task_id` (obrigatório), `page`, `limit`
- Endpoint: `GET /tasks/:task_id/comments`

**`tasks_time_entries_list`** — Apontamentos de uma task.
- Inputs: `task_id` (obrigatório), `page`, `limit`
- Endpoint: `GET /time_entries?task_id=...`

### 3.2 Projects

**`projects_list`** — Lista projetos.
- Inputs (opcionais): `client_id`, `is_closed`, `page`, `limit`
- Endpoint: `GET /projects`

**`projects_get`** — Detalhe de um projeto.
- Input: `id` (obrigatório)
- Endpoint: `GET /projects/:id`

### 3.3 Clients

**`clients_list`** — Lista clientes.
- Inputs (opcionais): `page`, `limit`
- Endpoint: `GET /clients`

**`clients_get`** — Detalhe de um cliente.
- Input: `id` (obrigatório)
- Endpoint: `GET /clients/:id`

### 3.4 Users

**`users_list`** — Lista usuários.
- Inputs (opcionais): `page`, `limit`
- Endpoint: `GET /users`

**`users_get`** — Detalhe de um usuário.
- Input: `id` (obrigatório)
- Endpoint: `GET /users/:id`

**`users_me`** — Usuário do token atual.
- Sem inputs.
- Endpoint: `GET /users/me`

### 3.5 Teams

**`teams_list`** — Lista times.
- Inputs (opcionais): `page`, `limit`
- Endpoint: `GET /teams`

### 3.6 Boards

**`boards_list`** — Lista boards (necessário pra filtrar tasks).
- Inputs (opcionais): `page`, `limit`
- Endpoint: `GET /boards`

### 3.7 Pipelines

**`pipelines_list`** — Lista pipelines (necessário pra filtrar tasks).
- Inputs (opcionais): `page`, `limit`
- Endpoint: `GET /pipelines`

## 4. Autenticação

- Variáveis de ambiente obrigatórias: `RUNRUNIT_APP_KEY`, `RUNRUNIT_USER_TOKEN`
- Variável opcional: `RUNRUNIT_BASE_URL` (default `https://runrun.it/api/v1.0`)
- Variável opcional: `LOG_LEVEL` (default `info`, valores: `debug`/`info`/`warn`/`error`)
- Validação na inicialização (`src/config.ts`). Se faltar, processo encerra com mensagem clara em stderr e exit code 1.
- Headers em toda request: `App-Key: <APP_KEY>`, `User-Token: <USER_TOKEN>`, `Content-Type: application/json`.

## 5. Paginação

- Cada tool de listagem aceita `page` (default 1) e `limit` (default 50, max 100)
- Sem auto-pagination — o agente decide se quer próxima página
- Resposta inclui metadados de paginação retornados pela API (quando disponíveis) para o agente saber se há mais
- Limite máximo validado por zod (`z.number().int().min(1).max(100)`)

## 6. Tratamento de erros

| Tipo | Comportamento |
|---|---|
| Validação de input (zod) | Erro retornado como tool error MCP com mensagem do campo |
| 4xx do Runrun.it | Resposta MCP `isError: true`, texto: `"Runrun.it API error (status N): <body>"` |
| 5xx do Runrun.it | Idem |
| 429 (rate limit) | Idem, com mensagem destacando que é rate limit; sem retry automático na v0.1 |
| Erro de rede (timeout, DNS, etc.) | Resposta MCP `isError: true`, texto: `"Network error: <message>"` |
| Erros não esperados | Capturados, logados em stderr, retornados como erro genérico |

Todos os erros são **retornados** como resposta MCP — nunca lançados pra fora do tool handler (manteria o servidor estável).

## 7. Logging

- Toda saída de log vai pra **stderr** (stdout reservado pro protocolo MCP STDIO)
- Nível controlado por `LOG_LEVEL`
- Formato: `[YYYY-MM-DDTHH:mm:ssZ] [level] message`
- Logs incluem: startup (versão, base URL), cada chamada de tool (nome + duração), erros

## 8. Estrutura de pastas

```
runrun-it-mcp/
├── src/
│   ├── index.ts                    # entrypoint: cria server, registra tools, conecta STDIO
│   ├── client.ts                   # cliente HTTP do Runrun.it (request helper)
│   ├── config.ts                   # carrega/valida env vars
│   ├── logger.ts                   # logger pra stderr
│   ├── pagination.ts               # schemas zod compartilhados pra page/limit
│   ├── errors.ts                   # helpers pra formatar erros como respostas MCP
│   ├── tools/
│   │   ├── tasks.ts                # tasks_list, tasks_get, tasks_comments_list, tasks_time_entries_list
│   │   ├── projects.ts             # projects_list, projects_get
│   │   ├── clients.ts              # clients_list, clients_get
│   │   ├── users.ts                # users_list, users_get, users_me
│   │   ├── teams.ts                # teams_list
│   │   ├── boards.ts               # boards_list
│   │   ├── pipelines.ts            # pipelines_list
│   │   └── index.ts                # agrega e exporta registerTools(server)
│   └── types.ts                    # tipos compartilhados (opcional)
├── tests/
│   ├── client.test.ts
│   ├── config.test.ts
│   └── tools/
│       ├── tasks.test.ts
│       ├── projects.test.ts
│       ├── clients.test.ts
│       ├── users.test.ts
│       ├── teams.test.ts
│       ├── boards.test.ts
│       └── pipelines.test.ts
├── .env.example
├── .gitignore
├── LICENSE                          # MIT
├── README.md
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 9. Boundaries e unidades

Cada arquivo tem responsabilidade única:

- **`config.ts`** — só carrega/valida env. Não conhece MCP nem HTTP.
- **`client.ts`** — só faz HTTP (auth, base URL, error wrap). Não conhece MCP. Recebe `config` injetado.
- **`logger.ts`** — só loga em stderr. Não conhece nada de domínio.
- **`tools/<resource>.ts`** — só registra tools de um recurso. Recebe `client` injetado. Não fala HTTP direto, não lê env.
- **`index.ts`** — orquestra: lê config → cria client → cria server → registra tools → conecta transport.

Essa separação habilita testes unitários (mockando `client`) e prepara as próximas fases (v0.2 escrita reusa o mesmo `client.ts` adicionando POST/PATCH).

## 10. Fluxo de dados

```
Cliente MCP (Claude)
   ↓ STDIO JSON-RPC
src/index.ts (Server + StdioServerTransport)
   ↓ tool call
src/tools/<resource>.ts (handler do tool)
   ↓ chama
src/client.ts (HTTP request com headers de auth)
   ↓ HTTP
Runrun.it API
   ↓ JSON
[volta pelo mesmo caminho, serializado em text content MCP]
```

## 11. Testes

- **Cobertura alvo v0.1:** 80%+ em `src/`
- **Stack:** vitest + mock de `fetch` global
- **Por tool:** 1 happy path + 1 erro 4xx + 1 erro de validação de input
- **Por módulo:** unit tests pra `config.ts` (falha de env), `client.ts` (auth headers, error wrap), `errors.ts` (formatação)
- **Sem integration tests** contra Runrun.it real na v0.1 (precisaria credenciais em CI — adiar)

## 12. Distribuição

**npm:**
- Nome: `runrun-it-mcp`
- `bin` apontando pra `dist/index.js` (pra `npx` funcionar)
- `files` whitelist: `dist/`, `README.md`, `LICENSE`
- Publicação manual na v0.1 (`npm publish`); GitHub Actions só nas próximas versões

**GitHub:**
- Repo público
- README com: instalação, configuração no Claude Desktop / Claude Code, lista de tools, exemplos de uso, troubleshooting
- `.env.example` com placeholders
- LICENSE MIT

**Config de exemplo (no README):**
```json
{
  "mcpServers": {
    "runrun-it": {
      "command": "npx",
      "args": ["-y", "runrun-it-mcp"],
      "env": {
        "RUNRUNIT_APP_KEY": "sua-app-key",
        "RUNRUNIT_USER_TOKEN": "seu-user-token"
      }
    }
  }
}
```

## 13. Fora de escopo da v0.1

Itens deliberadamente excluídos (cada um vira spec próprio depois):

- Operações de escrita (criar/editar tasks, comentar, mudar status) → v0.2
- Time tracking ativo (timer start/stop, lançamento manual) → v0.3
- Custom fields, tags, anexos → v0.4
- Webhooks, reports agregados → v0.5
- Retry automático em rate limit / 5xx → v0.2+
- Auto-pagination → v0.2+ se demanda surgir
- Resources e prompts MCP (só tools na v0.1)
- Integration tests contra API real
- GitHub Actions de release automático

## 14. Critérios de aceite (v0.1)

- [ ] Servidor sobe via `npx runrun-it-mcp` quando as 2 env vars estão presentes
- [ ] Servidor falha com mensagem clara em stderr e exit 1 se env var faltar
- [ ] 14 tools listadas aparecem quando cliente MCP faz `tools/list`
- [ ] Cada tool retorna resposta válida pro happy path mockado
- [ ] Cada tool retorna erro estruturado pro 4xx mockado
- [ ] Cada tool valida input com zod (testado)
- [ ] Logs vão pra stderr, nunca stdout
- [ ] README permite outra pessoa instalar e configurar em <10 min
- [ ] Publicado no npm como `runrun-it-mcp@0.1.0`
- [ ] Repo público no GitHub com LICENSE MIT
