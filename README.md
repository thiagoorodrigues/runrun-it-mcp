# runrun-it-mcp

MCP server for [Runrun.it](https://runrun.it) — exposes the Runrun.it REST API as tools usable by Claude and other MCP clients.

**Status:** v0.9. Exposes 35 tools for tasks, projects, clients, users, teams, boards, pipelines, task types, custom fields, tags, and time tracking. Includes read/write for tasks and manual work periods, timer control, user search, and task assignment.

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- Runrun.it credentials (see [Getting your credentials](#getting-your-credentials))

## Installation

You don't install it directly — your MCP client launches it via `npx`. Choose your client below.

---

### Claude Code (CLI)

Run once in the terminal to register globally:

```bash
claude mcp add --scope user runrun-it npx -- -y runrun-it-mcp \
  -e RUNRUNIT_APP_KEY=your-app-key \
  -e RUNRUNIT_USER_TOKEN=your-user-token
```

Restart Claude Code. Run `/mcp` to confirm `runrun-it` appears in the list.

---

### Claude Desktop

**macOS:** edit `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** edit `%APPDATA%\Claude\claude_desktop_config.json`

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

Restart Claude Desktop.

---

### VS Code (Claude extension)

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **Claude: Open MCP Settings**
2. Add the following to the JSON that opens:

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

3. Save the file and reload the window (`Ctrl+Shift+P` → **Developer: Reload Window**).

Alternatively, add it directly to your `.vscode/mcp.json` in the project root.

---

## Updating

Because the server runs via `npx`, updates are automatic — `npx` always fetches the latest published version when it starts. No action needed.

To pin a specific version, change `-y runrun-it-mcp` to `-y runrun-it-mcp@x.y.z` in your config.

To check the latest published version: `npm show runrun-it-mcp version`

---

## Getting your credentials

In Runrun.it: **Configurações → Integrações → App** to get the `App-Key`, and your personal `User-Token` from your profile page.

## Tools

| Tool | Description |
|---|---|
| `users_me` | Get the user behind the current token |
| `users_list` | List users |
| `users_get` | Get a user by ID |
| `users_search` | Search users by name or email (lean output) |
| `clients_list` | List clients (search by name) |
| `clients_get` | Get a client by ID |
| `teams_list` | List teams |
| `boards_list` | List boards |
| `pipelines_list` | List pipelines |
| `projects_list` | List projects (filter by client, closed status; search by name) |
| `projects_get` | Get a project by ID |
| `tasks_list` | List tasks (filter by board, project, client, responsible/assignee, requester via `user_id`, type, closed status) |
| `task_types_list` | List task types (discover the `type_id` values used by tasks) |
| `tasks_get` | Get a task by ID |
| `tasks_comments_list` | List comments on a task (`all: true` fetches every page) |
| `tasks_time_entries_list` | List manual work periods for a task |
| `tasks_create` | Create a new task (requires title, project_id, type_id) |
| `tasks_update` | Update fields of an existing task |
| `tasks_assign` | Assign a task to a responsible user, or unassign it |
| `tasks_update_status` | Move a task to a different board stage |
| `tasks_comments_create` | Add a comment to a task |
| `tasks_comments_update` | Edit the text of an existing comment |
| `tasks_comments_delete` | Delete a comment |
| `tasks_get_description` | Get the full description of a task; inline images are downloaded and returned as image blocks (`include_images: false` to skip) |
| `tasks_documents_list` | List documents (attachments) of a task: screenshots, files sent via request forms, etc. |
| `documents_download` | Download a document by id and return it as an image block (non-images return a text note) |
| `tasks_play` | Start the timer on a task |
| `tasks_pause` | Pause the timer on a task |
| `manual_work_periods_list` | List manual work periods (logged hours) |
| `manual_work_periods_get` | Get a single manual work period |
| `manual_work_periods_create` | Log hours manually on a task |
| `manual_work_periods_update` | Update a manual work period |
| `manual_work_periods_delete` | Delete a manual work period |
| `tasks_list_fields` | List custom fields available for a task |
| `tasks_update_custom_fields` | Update custom fields on a task |
| `tasks_update_tags` | Replace all tags on a task |
| `tags_search` | Search existing tags by name |

All list tools support `page` (default 1) and `limit` (default 50, max 100). `tasks_comments_list` also accepts `all: true` to walk every page and return the merged list.

## Examples

The examples below show natural-language prompts and the responses Claude gives when using this MCP server.

### Managing tasks

**User:** What are the open tasks in the "Website Redesign" project?

**Claude:** Here are the open tasks in Website Redesign:
- **#1234** Create homepage layout — *In progress* · Ana Silva
- **#1235** Review landing page copy — *To do* · João Lima
- **#1236** Integrate contact form — *To do* · unassigned
- **#1237** Responsiveness testing — *Blocked* · Pedro Costa

---

**User:** Create a task "Write release notes for v0.4" in the Backend project, assign it to me, due next Friday.

**Claude:** Done! Task **#1301 Write release notes for v0.4** created in Backend, assigned to you, due 2026-06-06.

---

**User:** Move task #1234 to "Done".

**Claude:** Task **#1234 Create homepage layout** has been moved to **Done**.

---

**User:** Add a comment to task #1235 saying the copy was approved by the client.

**Claude:** Comment added to **#1235 Review landing page copy**: "Copy approved by the client."

---

### Time tracking

**User:** Start the timer on task #1236.

**Claude:** Timer started on **#1236 Integrate contact form**. The clock is running.

---

**User:** Pause the timer.

**Claude:** Timer paused on **#1236 Integrate contact form**. You worked for **1h 23m** in this session.

---

**User:** Log 2 hours on task #1235 for yesterday.

**Claude:** Logged **2h** on **#1235 Review landing page copy** for 2026-05-29.

---

### Images and attachments

**User:** Read the description of task #75014 and tell me what the error in the screenshot says.

**Claude:** The description reports a blocked approval in the Portal Gestão module. The embedded screenshot shows the banner: *"Erro! Patrimônios não vinculados a esta venda Estoque: 6-PAG28629, PAG32646, ..."* with support code 120097992.

> `tasks_get_description` returns the HTML description followed by one image block per inline `<img src="/api/documents/{id}/download">`, so Claude can look at the screenshot directly. Pass `include_images: false` to get only the JSON.

---

**User:** The request form on task #75016 mentions an attached image. Show me what it is.

**Claude:** The task has one attachment, **imagem (7).png** (139 KB). It is a screenshot of the "Detalhes da Solicitação" modal on the provider onboarding screen, showing the read-only "Observação" field the requester wants to make editable.

> Files attached to a task without being embedded in the description are listed by `tasks_documents_list`; `documents_download` returns any of them as an image block. Non-image files come back as a text note with the MIME type and size. Images are capped at 4 MB each and 10 per call.

---

### Custom fields and tags

**User:** Add the tags "frontend" and "urgent" to task #1237.

**Claude:** Tags updated on **#1237 Responsiveness testing**: **frontend**, **urgent**.

---

**User:** Set the "Complexity" field on task #1234 to "High".

**Claude:** Custom field **Complexity** set to **High** on **#1234 Create homepage layout**.

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

- **v0.1** ✅ — read-only core: users, clients, teams, boards, pipelines, projects, tasks, comments, time entries
- **v0.2** ✅ — write operations on tasks (create/update/comment/status change); `tasks_get_description`
- **v0.3** ✅ — time tracking (timer play/pause, manual work period CRUD)
- **v0.4** ✅ — custom fields, tags; README usage examples; fixed `tasks_update_status` and `pipelines_list` endpoints
- **v0.5** ✅ — search by name (`search_term`) in `clients_list` and `projects_list`
- **v0.6** ✅ — `task_types_list` to discover `type_id` values
- **v0.7** ✅ — `tasks_create` hardening: `type_id` required, `responsible_id` accepts the user slug (string) and is optional
- **v0.8** ✅ — `users_search` (lean output), `tasks_assign` (assign/unassign responsible), `user_id` filter (requester) in `tasks_list`
- **v0.9** ✅ — comments: `tasks_comments_update`, `tasks_comments_delete`, `all` option in `tasks_comments_list`
- **v0.10** ✅ — images: `tasks_get_description` embeds inline images as image blocks; `tasks_documents_list` and `documents_download` for task attachments
- **Next** — webhooks, reports

## License

MIT
