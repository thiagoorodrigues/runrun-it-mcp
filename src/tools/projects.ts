import { z } from "zod";
import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createProjectsTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "projects_list",
      config: {
        title: "List Projects",
        description: "List projects. Filterable by client and closed status, and searchable by name via search_term (partial match).",
        inputSchema: {
          ...paginationFields,
          client_id: z.number().int().positive().optional(),
          is_closed: z.boolean().optional(),
          search_term: z.string().min(1).optional()
        }
      },
      handler: async (input: {
        page?: number;
        limit?: number;
        client_id?: number;
        is_closed?: boolean;
        search_term?: string;
      }) => {
        try {
          const { page, limit } = applyPaginationDefaults(input);
          const data = await client.get("/projects", {
            page,
            limit,
            client_id: input.client_id,
            is_closed: input.is_closed,
            search_term: input.search_term
          });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "projects_get",
      config: {
        title: "Get Project",
        description: "Get a single project by ID.",
        inputSchema: { id: z.number().int().positive() }
      },
      handler: async (input: { id: number }) => {
        try {
          const data = await client.get(`/projects/${input.id}`);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
