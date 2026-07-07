import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createTaskTypesTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "task_types_list",
      config: {
        title: "List Task Types",
        description:
          "List task types. Use this to discover the type_id values accepted by tasks_list, tasks_create and tasks_update. Supports pagination.",
        inputSchema: { ...paginationFields }
      },
      handler: async (input: { page?: number; limit?: number }) => {
        try {
          const params = applyPaginationDefaults(input);
          const data = await client.get("/task_types", params);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
