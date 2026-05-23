import type { ZodRawShape } from "zod";
import type { McpToolResponse } from "../errors.js";

export interface ToolDefinition {
  name: string;
  config: {
    title: string;
    description: string;
    inputSchema?: ZodRawShape;
  };
  handler: (input: any) => Promise<McpToolResponse>;
}
