import { z } from "zod";
import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createManualWorkPeriodsTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "manual_work_periods_list",
      config: {
        title: "List Manual Work Periods",
        description: "List manual work periods (logged hours). Filter by task, user, or date range. Default period is 1 month if from/before not specified.",
        inputSchema: {
          ...paginationFields,
          task_id: z.number().int().positive().optional(),
          user_id: z.string().optional(),
          from: z.string().optional(),
          before: z.string().optional()
        }
      },
      handler: async (input: {
        page?: number;
        limit?: number;
        task_id?: number;
        user_id?: string;
        from?: string;
        before?: string;
      }) => {
        try {
          const { page, limit } = applyPaginationDefaults(input);
          const data = await client.get("/manual_work_periods", {
            page,
            limit,
            task_id: input.task_id,
            user_id: input.user_id,
            from: input.from,
            before: input.before
          });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "manual_work_periods_get",
      config: {
        title: "Get Manual Work Period",
        description: "Get a single manual work period by ID.",
        inputSchema: {
          id: z.number().int().positive()
        }
      },
      handler: async (input: { id: number }) => {
        try {
          const data = await client.get(`/manual_work_periods/${input.id}`);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "manual_work_periods_create",
      config: {
        title: "Create Manual Work Period",
        description: "Log hours manually on a task. Provide seconds worked, task ID, and optionally the date and board stage.",
        inputSchema: {
          task_id: z.number().int().positive(),
          seconds: z.number().int().positive(),
          board_stage_id: z.number().int().positive().optional(),
          date_to_apply: z.string().optional()
        }
      },
      handler: async (input: {
        task_id: number;
        seconds: number;
        board_stage_id?: number;
        date_to_apply?: string;
      }) => {
        try {
          const period: Record<string, unknown> = {
            task_id: input.task_id,
            seconds: input.seconds
          };
          if (input.board_stage_id !== undefined) period.board_stage_id = input.board_stage_id;
          if (input.date_to_apply !== undefined) period.date_to_apply = input.date_to_apply;
          const data = await client.post("/manual_work_periods", { manual_work_period: period });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "manual_work_periods_update",
      config: {
        title: "Update Manual Work Period",
        description: "Update a manual work period. Only provided fields are changed.",
        inputSchema: {
          id: z.number().int().positive(),
          seconds: z.number().int().positive().optional(),
          board_stage_id: z.number().int().positive().optional(),
          date_to_apply: z.string().optional()
        }
      },
      handler: async (input: {
        id: number;
        seconds?: number;
        board_stage_id?: number;
        date_to_apply?: string;
      }) => {
        try {
          const period: Record<string, unknown> = {};
          if (input.seconds !== undefined) period.seconds = input.seconds;
          if (input.board_stage_id !== undefined) period.board_stage_id = input.board_stage_id;
          if (input.date_to_apply !== undefined) period.date_to_apply = input.date_to_apply;
          const data = await client.patch(`/manual_work_periods/${input.id}`, { manual_work_period: period });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "manual_work_periods_delete",
      config: {
        title: "Delete Manual Work Period",
        description: "Delete a manual work period. Only your own work periods can be deleted.",
        inputSchema: {
          id: z.number().int().positive()
        }
      },
      handler: async (input: { id: number }) => {
        try {
          await client.delete(`/manual_work_periods/${input.id}`);
          return successResponse({});
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
