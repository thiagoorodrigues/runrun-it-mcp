# Design: Time Tracking (v0.3)

## Scope

Add 7 tools for time tracking and fix the broken `tasks_time_entries_list` tool.

## Fix

`tasks_time_entries_list` uses `/time_entries` which returns 404. Fix: change endpoint to `/manual_work_periods` and rename tool to `manual_work_periods_list`.

## New Tools

### tasks_play
- **Endpoint:** `POST /tasks/:id/play`
- **Required:** `id` (integer)
- **Behavior:** Starts the timer for the authenticated user on the given task. If user is already working on another task, the API pauses that task automatically.
- **Returns:** updated task object

### tasks_pause
- **Endpoint:** `POST /tasks/:id/pause`
- **Required:** `id` (integer)
- **Behavior:** Pauses the timer for the authenticated user on the given task.
- **Returns:** updated task object

### manual_work_periods_list
- **Endpoint:** `GET /manual_work_periods`
- **Optional:** `task_id` (integer), `user_id` (string), `from` (date string), `before` (date string), `page`, `limit`
- **Default period:** 1 month if `from`/`before` not specified
- **Returns:** array of manual work period objects

### manual_work_periods_get
- **Endpoint:** `GET /manual_work_periods/:id`
- **Required:** `id` (integer)
- **Returns:** manual work period object

### manual_work_periods_create
- **Endpoint:** `POST /manual_work_periods`
- **Required:** `task_id` (integer), `seconds` (integer)
- **Optional:** `board_stage_id` (integer), `date_to_apply` (date string — defaults to today if omitted)
- **Body wrapping:** `{ manual_work_period: { ... } }`
- **Returns:** created manual work period object

### manual_work_periods_update
- **Endpoint:** `PATCH /manual_work_periods/:id`
- **Required:** `id` (integer)
- **Optional:** `seconds` (integer), `board_stage_id` (integer), `date_to_apply` (date string)
- **Body wrapping:** `{ manual_work_period: { ...onlyProvidedFields } }`
- **Returns:** updated manual work period object

### manual_work_periods_delete
- **Endpoint:** `DELETE /manual_work_periods/:id`
- **Required:** `id` (integer)
- **Returns:** empty body (204) — respond with success message

## Client Changes

`RunrunClient` gains:
```ts
delete<T>(path: string): Promise<T>
```
Same auth header pattern as `get`. No request body. Returns parsed JSON on 2xx (or empty object on 204), throws `RunrunApiError` on non-2xx.

## File Changes

| File | Action | What changes |
|---|---|---|
| `src/client.ts` | Modify | Add `delete<T>` method |
| `tests/client.test.ts` | Modify | Add `delete` test suite |
| `tests/helpers/mock-client.ts` | Modify | Add optional `deleteImpl` param |
| `src/tools/tasks.ts` | Modify | Add `tasks_play`, `tasks_pause`; fix `tasks_time_entries_list` endpoint |
| `tests/tools/tasks.test.ts` | Modify | Add tests for play/pause; fix time_entries test |
| `src/tools/manual_work_periods.ts` | Create | 5 tools: list, get, create, update, delete |
| `tests/tools/manual_work_periods.test.ts` | Create | Tests for all 5 tools |
| `src/tools/register.ts` | Modify | Register manual_work_periods tools |
| `src/tools/index.ts` | Modify | Export createManualWorkPeriodsTools |
| `README.md` | Modify | Update to v0.3, add 7 new tools, fix tasks_time_entries_list note |

## Error Handling

Same pattern: `successResponse` / `genericErrorResponse`. For 204 (delete), return `successResponse({})`.
