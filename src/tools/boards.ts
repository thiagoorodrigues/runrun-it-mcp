import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createBoardsTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "boards_list",
      config: {
        title: "List Boards",
        description: "List boards. Use this to discover board IDs for filtering tasks.",
        inputSchema: { ...paginationFields }
      },
      handler: async (input: { page?: number; limit?: number }) => {
        try {
          const params = applyPaginationDefaults(input);
          const data = await client.get("/boards", params);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
