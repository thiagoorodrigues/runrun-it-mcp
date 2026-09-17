import { z } from "zod";
import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults, fetchAllPages, MAX_PAGE_SIZE } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";
import { extractDocumentIds, fetchImageBlocks, documentToBlock, documentDownloadPath } from "../documents.js";

export function createTasksTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "tasks_list",
      config: {
        title: "List Tasks",
        description:
          "List tasks. Filterable by board, project, client, responsible user (assignee), requester (task creator), task type, and closed status.",
        inputSchema: {
          ...paginationFields,
          board_id: z.number().int().positive().optional(),
          project_id: z.number().int().positive().optional(),
          client_id: z.number().int().positive().optional(),
          responsible_id: z.string().min(1).optional(),
          user_id: z.string().min(1).optional()
            .describe("Filter by the user who created/requested the task (the requester), not the assignee. String id/slug from users_list, e.g. \"john-doe\". Use responsible_id for the assignee."),
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
        responsible_id?: string;
        user_id?: string;
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
            user_id: input.user_id,
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
        description:
          "List comments on a task. Set all=true to fetch every page (starting at page, using limit as page size, default 100) and return the merged list.",
        inputSchema: {
          task_id: z.number().int().positive(),
          ...paginationFields,
          all: z.boolean().optional().describe("Fetch all pages and return the merged list (default false)")
        }
      },
      handler: async (input: { task_id: number; page?: number; limit?: number; all?: boolean }) => {
        try {
          const path = `/tasks/${input.task_id}/comments`;
          if (input.all) {
            const startPage = input.page ?? 1;
            const limit = input.limit ?? MAX_PAGE_SIZE;
            const data = await fetchAllPages((page, limit) => client.get(path, { page, limit }), startPage, limit);
            return successResponse(data);
          }
          const { page, limit } = applyPaginationDefaults(input);
          const data = await client.get(path, { page, limit });
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
        description: "List manual work periods (logged hours) for a task.",
        inputSchema: {
          task_id: z.number().int().positive(),
          ...paginationFields
        }
      },
      handler: async (input: { task_id: number; page?: number; limit?: number }) => {
        try {
          const { page, limit } = applyPaginationDefaults(input);
          const data = await client.get("/manual_work_periods", {
            task_id: input.task_id,
            page,
            limit
          });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "tasks_create",
      config: {
        title: "Create Task",
        description: "Create a new task. Requires title, project_id and type_id (type_id comes from task_types_list). Optionally set responsible_id, the user's string id/slug from users_list (e.g. \"john-doe\"). All other fields are optional.",
        inputSchema: {
          title: z.string().min(1),
          project_id: z.number().int().positive(),
          type_id: z.number().int().positive(),
          responsible_id: z.string().min(1).optional(),
          board_id: z.number().int().positive().optional(),
          due_date: z.string().optional(),
          description: z.string().optional(),
          estimated_work_hours: z.number().positive().optional()
        }
      },
      handler: async (input: {
        title: string;
        project_id: number;
        type_id: number;
        responsible_id?: string;
        board_id?: number;
        due_date?: string;
        description?: string;
        estimated_work_hours?: number;
      }) => {
        try {
          const task: Record<string, unknown> = {
            title: input.title,
            project_id: input.project_id,
            type_id: input.type_id
          };
          if (input.responsible_id !== undefined) task.responsible_id = input.responsible_id;
          if (input.board_id !== undefined) task.board_id = input.board_id;
          if (input.due_date !== undefined) task.due_date = input.due_date;
          if (input.description !== undefined) task.description = input.description;
          if (input.estimated_work_hours !== undefined) task.estimated_work_hours = input.estimated_work_hours;
          const data = await client.post("/tasks", { task });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "tasks_update",
      config: {
        title: "Update Task",
        description: "Update fields of an existing task. Only provided fields are changed.",
        inputSchema: {
          id: z.number().int().positive(),
          title: z.string().min(1).optional(),
          project_id: z.number().int().positive().optional(),
          responsible_id: z.string().min(1).optional(),
          board_id: z.number().int().positive().optional(),
          type_id: z.number().int().positive().optional(),
          due_date: z.string().optional(),
          description: z.string().optional(),
          estimated_work_hours: z.number().positive().optional()
        }
      },
      handler: async (input: {
        id: number;
        title?: string;
        project_id?: number;
        responsible_id?: string;
        board_id?: number;
        type_id?: number;
        due_date?: string;
        description?: string;
        estimated_work_hours?: number;
      }) => {
        try {
          const task: Record<string, unknown> = {};
          if (input.title !== undefined) task.title = input.title;
          if (input.project_id !== undefined) task.project_id = input.project_id;
          if (input.responsible_id !== undefined) task.responsible_id = input.responsible_id;
          if (input.board_id !== undefined) task.board_id = input.board_id;
          if (input.type_id !== undefined) task.type_id = input.type_id;
          if (input.due_date !== undefined) task.due_date = input.due_date;
          if (input.description !== undefined) task.description = input.description;
          if (input.estimated_work_hours !== undefined) task.estimated_work_hours = input.estimated_work_hours;
          const data = await client.patch(`/tasks/${input.id}`, { task });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
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
    {
      name: "tasks_update_status",
      config: {
        title: "Update Task Status",
        description: "Move a task to a different board stage (column). Use boards_list to get a board_id, then pipelines_list with that board_id to get valid board_stage_id values.",
        inputSchema: {
          id: z.number().int().positive(),
          board_stage_id: z.number().int().positive()
        }
      },
      handler: async (input: { id: number; board_stage_id: number }) => {
        try {
          const data = await client.post(`/tasks/${input.id}/change_status`, {
            task_status_id: input.board_stage_id
          });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "tasks_comments_create",
      config: {
        title: "Create Task Comment",
        description: "Add a comment to a task.",
        inputSchema: {
          task_id: z.number().int().positive(),
          text: z.string().min(1)
        }
      },
      handler: async (input: { task_id: number; text: string }) => {
        try {
          const data = await client.post(`/tasks/${input.task_id}/comments`, {
            comment: { text: input.text }
          });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "tasks_comments_update",
      config: {
        title: "Update Task Comment",
        description: "Edit the text of an existing comment. Get comment_id from tasks_comments_list.",
        inputSchema: {
          comment_id: z.number().int().positive(),
          text: z.string().min(1)
        }
      },
      handler: async (input: { comment_id: number; text: string }) => {
        try {
          const data = await client.put(`/comments/${input.comment_id}`, {
            comment: { text: input.text }
          });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "tasks_comments_delete",
      config: {
        title: "Delete Task Comment",
        description: "Delete a comment. Get comment_id from tasks_comments_list. This cannot be undone.",
        inputSchema: {
          comment_id: z.number().int().positive()
        }
      },
      handler: async (input: { comment_id: number }) => {
        try {
          await client.delete(`/comments/${input.comment_id}`);
          return successResponse({ deleted: true, comment_id: input.comment_id });
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "tasks_get_description",
      config: {
        title: "Get Task Description",
        description:
          "Get the full description (rich text HTML) of a task. The main tasks_get endpoint does not include the description field — use this tool to fetch it separately. By default, images embedded inline in the description (<img src=\"/api/documents/{id}/download\">) are downloaded and returned as image content blocks after the JSON, so they can be viewed directly. Images attached to the task but not embedded in the description are listed by tasks_documents_list.",
        inputSchema: {
          id: z.number().int().positive(),
          include_images: z
            .boolean()
            .optional()
            .describe("Download inline images and return them as image blocks (default true)")
        }
      },
      handler: async (input: { id: number; include_images?: boolean }) => {
        try {
          const data = await client.get<{ description?: string | null }>(`/tasks/${input.id}/description`);
          const response = successResponse(data);
          if (input.include_images === false) return response;
          const ids = extractDocumentIds(data?.description);
          if (ids.length === 0) return response;
          const images = await fetchImageBlocks(client, ids);
          return { content: [...response.content, ...images] };
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "tasks_documents_list",
      config: {
        title: "List Task Documents",
        description:
          "List documents (attachments) of a task: screenshots, images, PDFs and other files uploaded to the task, including files attached via request forms that do not appear inline in the description. Returns metadata only (id, file_name, file_content_type, file_size, uploader). Use documents_download with a document id to view an image.",
        inputSchema: {
          id: z.number().int().positive()
        }
      },
      handler: async (input: { id: number }) => {
        try {
          const data = await client.get(`/tasks/${input.id}/documents`);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "documents_download",
      config: {
        title: "Download Document",
        description:
          "Download a Runrun.it document by id and return it as an image content block so it can be viewed. Get ids from tasks_documents_list or from <img src=\"/api/documents/{id}/download\"> tags in a task description. Non-image files (PDF, DOCX, etc.) are not embedded; a text note with the MIME type and size is returned instead.",
        inputSchema: {
          id: z.number().int().positive()
        }
      },
      handler: async (input: { id: number }) => {
        try {
          const file = await client.getBinary(documentDownloadPath(input.id));
          return { content: [documentToBlock(input.id, file)] };
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "tasks_play",
      config: {
        title: "Play Task",
        description: "Start the timer on a task for the authenticated user. If the user is currently working on another task, that task will be paused automatically.",
        inputSchema: {
          id: z.number().int().positive()
        }
      },
      handler: async (input: { id: number }) => {
        try {
          const data = await client.post(`/tasks/${input.id}/play`, {});
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "tasks_pause",
      config: {
        title: "Pause Task",
        description: "Pause the timer on a task for the authenticated user.",
        inputSchema: {
          id: z.number().int().positive()
        }
      },
      handler: async (input: { id: number }) => {
        try {
          const data = await client.post(`/tasks/${input.id}/pause`, {});
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "tasks_list_fields",
      config: {
        title: "List Task Fields",
        description: "List custom fields available for a task's board. Use this to discover field IDs (e.g. custom_67) before calling tasks_update_custom_fields.",
        inputSchema: {
          id: z.number().int().positive()
        }
      },
      handler: async (input: { id: number }) => {
        try {
          const data = await client.get(`/tasks/${input.id}/fields`);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "tasks_update_custom_fields",
      config: {
        title: "Update Task Custom Fields",
        description: "Update custom fields on a task. Use tasks_list_fields first to discover available field IDs. Pass a custom_fields object with field keys like custom_67, custom_73, etc.",
        inputSchema: {
          id: z.number().int().positive(),
          custom_fields: z.record(z.unknown())
        }
      },
      handler: async (input: { id: number; custom_fields: Record<string, unknown> }) => {
        try {
          const data = await client.put(`/tasks/${input.id}`, {
            task: { custom_fields: input.custom_fields }
          });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "tasks_update_tags",
      config: {
        title: "Update Task Tags",
        description: "Replace all tags on a task. Use tags_search to find existing tags. WARNING: this replaces all existing tags — include current tags if you only want to add one.",
        inputSchema: {
          id: z.number().int().positive(),
          tags: z.array(z.object({
            name: z.string().min(1),
            color: z.string().min(1)
          }))
        }
      },
      handler: async (input: { id: number; tags: Array<{ name: string; color: string }> }) => {
        try {
          const data = await client.put(`/tasks/${input.id}`, {
            task: { tags_data: input.tags }
          });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
