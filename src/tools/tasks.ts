import { z } from "zod";
import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createTasksTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "tasks_list",
      config: {
        title: "List Tasks",
        description:
          "List tasks. Filterable by board, project, client, responsible user, task type, and closed status.",
        inputSchema: {
          ...paginationFields,
          board_id: z.number().int().positive().optional(),
          project_id: z.number().int().positive().optional(),
          client_id: z.number().int().positive().optional(),
          responsible_id: z.number().int().positive().optional(),
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
        responsible_id?: number;
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
        description: "List comments on a task.",
        inputSchema: {
          task_id: z.number().int().positive(),
          ...paginationFields
        }
      },
      handler: async (input: { task_id: number; page?: number; limit?: number }) => {
        try {
          const { page, limit } = applyPaginationDefaults(input);
          const data = await client.get(`/tasks/${input.task_id}/comments`, { page, limit });
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
        description: "Create a new task. Requires title and project_id. All other fields are optional.",
        inputSchema: {
          title: z.string().min(1),
          project_id: z.number().int().positive(),
          responsible_id: z.number().int().positive().optional(),
          board_id: z.number().int().positive().optional(),
          type_id: z.number().int().positive().optional(),
          due_date: z.string().optional(),
          description: z.string().optional(),
          estimated_work_hours: z.number().positive().optional()
        }
      },
      handler: async (input: {
        title: string;
        project_id: number;
        responsible_id?: number;
        board_id?: number;
        type_id?: number;
        due_date?: string;
        description?: string;
        estimated_work_hours?: number;
      }) => {
        try {
          const task: Record<string, unknown> = {
            title: input.title,
            project_id: input.project_id
          };
          if (input.responsible_id !== undefined) task.responsible_id = input.responsible_id;
          if (input.board_id !== undefined) task.board_id = input.board_id;
          if (input.type_id !== undefined) task.type_id = input.type_id;
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
          responsible_id: z.number().int().positive().optional(),
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
        responsible_id?: number;
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
      name: "tasks_get_description",
      config: {
        title: "Get Task Description",
        description: "Get the full description (rich text) of a task. The main tasks_get endpoint does not include the description field — use this tool to fetch it separately.",
        inputSchema: {
          id: z.number().int().positive()
        }
      },
      handler: async (input: { id: number }) => {
        try {
          const data = await client.get(`/tasks/${input.id}/description`);
          return successResponse(data);
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
