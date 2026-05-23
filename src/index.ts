#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { RunrunClient } from "./client.js";
import { registerAllTools } from "./tools/index.js";

async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (e) {
    process.stderr.write(
      `runrun-it-mcp: configuration error: ${(e as Error).message}\n`
    );
    process.exit(1);
  }

  const logger = createLogger(config.logLevel);
  logger.info(`runrun-it-mcp starting (baseUrl=${config.baseUrl})`);

  const client = new RunrunClient(config);
  const server = new McpServer({
    name: "runrun-it-mcp",
    version: "0.1.0"
  });

  registerAllTools(server, client);
  logger.info("Registered all tools");

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Connected to STDIO transport, ready");
}

main().catch((e) => {
  process.stderr.write(`runrun-it-mcp: fatal error: ${(e as Error).message}\n`);
  process.exit(1);
});
