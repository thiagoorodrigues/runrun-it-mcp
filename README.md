# runrun-it-mcp

MCP server for [Runrun.it](https://runrun.it) — exposes the Runrun.it REST API as tools usable by Claude and other MCP clients.

**Status:** v0.2. Exposes 18 tools for tasks, projects, clients, users, teams, boards, and pipelines. Includes read and write operations on tasks (create, update, status change, comment).

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
| `tasks_create` | Create a new task |
| `tasks_update` | Update fields of an existing task |
| `tasks_update_status` | Move a task to a different board stage |
| `tasks_comments_create` | Add a comment to a task |

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
