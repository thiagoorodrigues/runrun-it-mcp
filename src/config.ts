import { z } from "zod";

const ConfigSchema = z.object({
  appKey: z.string().min(1, "RUNRUNIT_APP_KEY must not be empty"),
  userToken: z.string().min(1, "RUNRUNIT_USER_TOKEN must not be empty"),
  baseUrl: z.string().url(),
  logLevel: z.enum(["debug", "info", "warn", "error"])
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const appKey = process.env.RUNRUNIT_APP_KEY;
  const userToken = process.env.RUNRUNIT_USER_TOKEN;

  if (!appKey) {
    throw new Error("Missing required environment variable: RUNRUNIT_APP_KEY");
  }
  if (!userToken) {
    throw new Error("Missing required environment variable: RUNRUNIT_USER_TOKEN");
  }

  const raw = {
    appKey,
    userToken,
    baseUrl: process.env.RUNRUNIT_BASE_URL ?? "https://runrun.it/api/v1.0",
    logLevel: process.env.LOG_LEVEL ?? "info"
  };

  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const pathKey = issue.path.join(".");
    const envVarMap: Record<string, string> = {
      appKey: "RUNRUNIT_APP_KEY",
      userToken: "RUNRUNIT_USER_TOKEN",
      baseUrl: "RUNRUNIT_BASE_URL",
      logLevel: "LOG_LEVEL"
    };
    const envVar = envVarMap[pathKey] ?? pathKey;
    throw new Error(`Invalid config (${envVar}): ${issue.message}`);
  }
  return result.data;
}
