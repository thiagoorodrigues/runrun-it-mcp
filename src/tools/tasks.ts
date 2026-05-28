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
        description: "List time entries (logged hours) for a task.",
        inputSchema: {
          task_id: z.number().int().positive(),
          ...paginationFields
        }
      },
      handler: async (input: { task_id: number; page?: number; limit?: number }) => {
        try {
          const { page, limit } = applyPaginationDefaults(input);
          const data = await client.get("/time_entries", {
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
    }
  ];
}
