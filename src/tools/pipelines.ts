import { z } from "zod";
import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createPipelinesTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "pipelines_list",
      config: {
        title: "List Board Stages",
        description: "List board stages (the columns/steps inside a board). Use boards_list to get a board_id, then call this to get the stage IDs needed for tasks_update_status.",
        inputSchema: {
          ...paginationFields,
          board_id: z.number().int().positive().optional()
        }
      },
      handler: async (input: { page?: number; limit?: number; board_id?: number }) => {
        try {
          const params: Record<string, string | number | boolean | undefined> = applyPaginationDefaults(input);
          if (input.board_id !== undefined) params.board_id = input.board_id;
          const data = await client.get("/board_stages", params);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
