# Design: Tasks Write Operations (v0.2)

## Scope

Add 4 write tools to the runrun-it-mcp server:
- `tasks_create` — create a new task
- `tasks_update` — update any field of an existing task
- `tasks_update_status` — move a task to a different board stage
- `tasks_comments_create` — add a comment to a task

## Tools

### tasks_create
- **Endpoint:** `POST /tasks`
- **Required fields:** `title` (string), `project_id` (integer)
- **Optional fields:** `responsible_id` (integer), `board_id` (integer), `type_id` (integer), `due_date` (string, ISO date), `description` (string), `estimated_work_hours` (number)
- **Returns:** created task object

### tasks_update
- **Endpoint:** `PATCH /tasks/:id`
- **Required fields:** `id` (integer)
- **Optional fields:** same as `tasks_create` — all optional, only provided fields are sent
- **Returns:** updated task object

### tasks_update_status
- **Endpoint:** `PATCH /tasks/:id`
- **Required fields:** `id` (integer), `current_board_stage_id` (integer)
- **Returns:** updated task object

### tasks_comments_create
- **Endpoint:** `POST /tasks/:id/comments`
- **Required fields:** `task_id` (integer), `text` (string)
- **Returns:** created comment object

## Client Changes

`RunrunClient` gains two new methods:

```ts
post<T>(path: string, body: Record<string, unknown>): Promise<T>
patch<T>(path: string, body: Record<string, unknown>): Promise<T>
```

Both methods send `Content-Type: application/json`, include the auth headers, and throw `RunrunApiError` on non-2xx responses — matching the existing `get` pattern.

## File Changes

- `src/client.ts` — add `post` and `patch` methods
- `src/tools/tasks.ts` — add 4 new `ToolDefinition` entries

No new files. All new tools follow the existing pattern in `tasks.ts`.

## Error Handling

Same as existing tools: `successResponse` on success, `genericErrorResponse` on any thrown error.
