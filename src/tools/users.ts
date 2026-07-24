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
    },
    {
      name: "users_search",
      config: {
        title: "Search Users",
        description:
          "Search users by name or email via search_term (partial, case-insensitive match). Returns a lean list (id, name, email, position, team_ids, on_vacation). The id is the user slug used as responsible_id in tasks_assign / tasks_create / tasks_update.",
        inputSchema: {
          search_term: z.string().min(1),
          ...paginationFields
        }
      },
      handler: async (input: { search_term: string; page?: number; limit?: number }) => {
        try {
          const { page, limit } = applyPaginationDefaults(input);
          const data = await client.get<Array<Record<string, unknown>>>("/users", {
            page,
            limit,
            search_term: input.search_term
          });
          const term = input.search_term.toLowerCase();
          const matches = (data ?? []).filter((u) => {
            const name = String(u.name ?? "").toLowerCase();
            const email = String(u.email ?? "").toLowerCase();
            return name.includes(term) || email.includes(term);
          });
          const lean = matches.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            position: u.position,
            team_ids: u.team_ids,
            on_vacation: u.on_vacation
          }));
          return successResponse(lean);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
