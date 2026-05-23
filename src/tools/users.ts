import { z } from "zod";
import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, applyPaginationDefaults } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createUsersTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "users_list",
      config: {
        title: "List Users",
        description: "List users in the Runrun.it account. Supports pagination.",
        inputSchema: { ...paginationFields }
      },
      handler: async (input: { page?: number; limit?: number }) => {
        try {
          const params = applyPaginationDefaults(input);
          const data = await client.get("/users", params);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "users_get",
      config: {
        title: "Get User",
        description: "Get a single user by ID.",
        inputSchema: { id: z.number().int().positive() }
      },
      handler: async (input: { id: number }) => {
        try {
          const data = await client.get(`/users/${input.id}`);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "users_me",
      config: {
        title: "Current User",
        description: "Get the user associated with the configured User-Token.",
        inputSchema: {}
      },
      handler: async () => {
        try {
          const data = await client.get("/users/me");
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
