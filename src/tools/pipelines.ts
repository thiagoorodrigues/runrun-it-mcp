import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createPipelinesTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "pipelines_list",
      config: {
        title: "List Pipelines",
        description: "List pipelines (workflow stages). Use this to understand task progression.",
        inputSchema: { ...paginationFields }
      },
      handler: async (input: { page?: number; limit?: number }) => {
        try {
          const params = applyPaginationDefaults(input);
          const data = await client.get("/pipelines", params);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
