import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createTeamsTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "teams_list",
      config: {
        title: "List Teams",
        description: "List teams. Supports pagination.",
        inputSchema: { ...paginationFields }
      },
      handler: async (input: { page?: number; limit?: number }) => {
        try {
          const params = applyPaginationDefaults(input);
          const data = await client.get("/teams", params);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
