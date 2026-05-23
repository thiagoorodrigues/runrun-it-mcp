import { describe, it, expect, vi } from "vitest";
import { registerTools } from "../../src/tools/register.js";
import type { ToolDefinition } from "../../src/tools/types.js";
import { z } from "zod";

describe("registerTools", () => {
  it("calls server.registerTool for each tool", () => {
    const server = { registerTool: vi.fn() };
    const tools: ToolDefinition[] = [
      {
        name: "a_tool",
        config: { title: "A", description: "desc", inputSchema: { x: z.string() } },
        handler: async () => ({ content: [{ type: "text", text: "ok" }] })
      },
      {
        name: "b_tool",
        config: { title: "B", description: "desc", inputSchema: {} },
        handler: async () => ({ content: [{ type: "text", text: "ok" }] })
      }
    ];
    registerTools(server as any, tools);
    expect(server.registerTool).toHaveBeenCalledTimes(2);
    expect(server.registerTool.mock.calls[0][0]).toBe("a_tool");
    expect(server.registerTool.mock.calls[1][0]).toBe("b_tool");
  });
});
