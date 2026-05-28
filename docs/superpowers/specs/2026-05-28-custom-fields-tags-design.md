# Design: Custom Fields + Tags (v0.4)

## Scope

Add 4 tools for custom fields and tags. Attachments are deferred to a future version.

## New Tools

### tasks_list_fields
- **Endpoint:** `GET /tasks/:id/fields`
- **Required:** `id` (integer)
- **Returns:** array of field definitions for the task's board (name, type, id prefix like `custom_67`)

### tasks_update_custom_fields
- **Endpoint:** `PUT /tasks/:id`
- **Required:** `id` (integer), `custom_fields` (object — key/value pairs like `{ "custom_67": "value", "custom_73": { "id": "..." } }`)
- **Body:** `{ "task": { "custom_fields": { ...fields } } }`
- **Returns:** updated task object

### tags_search
- **Endpoint:** `GET /tags?search_term=X`
- **Required:** `search_term` (string)
- **Returns:** array of matching tags (name, color)

### tasks_update_tags
- **Endpoint:** `PUT /tasks/:id`
- **Required:** `id` (integer), `tags` (array of `{ name: string, color: string }`)
- **Body:** `{ "task": { "tags_data": [...tags] } }`
- **Note:** This operation REPLACES all existing tags on the task. To add a tag, first read existing tags via `tasks_get`, then include them all in the update.
- **Returns:** updated task object

## Client Changes

`RunrunClient` gains:
```ts
put<T>(path: string, body: Record<string, unknown>): Promise<T>
```
Same pattern as `post` — sends `Content-Type: application/json`, includes auth headers, throws `RunrunApiError` on non-2xx.

## File Changes

| File | Action | What changes |
|---|---|---|
| `src/client.ts` | Modify | Add `put<T>` method |
| `tests/client.test.ts` | Modify | Add `put` test suite |
| `tests/helpers/mock-client.ts` | Modify | Add optional `putImpl` param |
| `src/tools/tasks.ts` | Modify | Add `tasks_list_fields`, `tasks_update_custom_fields`, `tasks_update_tags` |
| `tests/tools/tasks.test.ts` | Modify | Add tests for the 3 new task tools |
| `src/tools/tags.ts` | Create | `tags_search` tool |
| `tests/tools/tags.test.ts` | Create | Tests for `tags_search` |
| `src/tools/index.ts` | Modify | Import and register tags tools |
| `README.md` | Modify | Update version, add 4 new tools |

## Error Handling

Same pattern as existing tools: `successResponse` / `genericErrorResponse`.
