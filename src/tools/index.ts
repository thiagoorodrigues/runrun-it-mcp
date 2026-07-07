import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RunrunClient } from "../client.js";
import { registerTools } from "./register.js";
import { createUsersTools } from "./users.js";
import { createClientsTools } from "./clients.js";
import { createTeamsTools } from "./teams.js";
import { createBoardsTools } from "./boards.js";
import { createPipelinesTools } from "./pipelines.js";
import { createProjectsTools } from "./projects.js";
import { createTasksTools } from "./tasks.js";
import { createManualWorkPeriodsTools } from "./manual_work_periods.js";
import { createTagsTools } from "./tags.js";
import { createTaskTypesTools } from "./task_types.js";

export function registerAllTools(server: McpServer, client: RunrunClient): void {
  registerTools(server, [
    ...createUsersTools(client),
    ...createClientsTools(client),
    ...createTeamsTools(client),
    ...createBoardsTools(client),
    ...createPipelinesTools(client),
    ...createProjectsTools(client),
    ...createTasksTools(client),
    ...createManualWorkPeriodsTools(client),
    ...createTagsTools(client),
    ...createTaskTypesTools(client)
  ]);
}
