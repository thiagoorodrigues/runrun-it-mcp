import { z } from "zod";
import type { RunrunClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { successResponse, genericErrorResponse } from "../errors.js";

export function createTagsTools(client: RunrunClient): ToolDefinition[] {
  return [
    {
      name: "tags_search",
      config: {
        title: "Search Tags",
        description: "Search existing tags by name. Returns tags that fully or partially match the search term. Use this before tasks_update_tags to find tag names and colors.",
        inputSchema: {
          search_term: z.string().min(1)
        }
      },
      handler: async (input: { search_term: string }) => {
        try {
          const data = await client.get("/tags", { search_term: input.search_term });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
