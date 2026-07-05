import { z } from "zod";
import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createClientsTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "clients_list",
      config: {
        title: "List Clients",
        description: "List clients. Supports pagination and search by name via search_term (partial match).",
        inputSchema: {
          ...paginationFields,
          search_term: z.string().min(1).optional()
        }
      },
      handler: async (input: {
        page?: number;
        limit?: number;
        search_term?: string;
      }) => {
        try {
          const { page, limit } = applyPaginationDefaults(input);
          const data = await client.get("/clients", {
            page,
            limit,
            search_term: input.search_term
          });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "clients_get",
      config: {
        title: "Get Client",
        description: "Get a single client by ID.",
        inputSchema: { id: z.number().int().positive() }
      },
      handler: async (input: { id: number }) => {
        try {
          const data = await client.get(`/clients/${input.id}`);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
