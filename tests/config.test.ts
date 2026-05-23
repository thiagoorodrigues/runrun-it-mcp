import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.RUNRUNIT_APP_KEY;
    delete process.env.RUNRUNIT_USER_TOKEN;
    delete process.env.RUNRUNIT_BASE_URL;
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("loads valid config from env", () => {
    process.env.RUNRUNIT_APP_KEY = "app-key-xyz";
    process.env.RUNRUNIT_USER_TOKEN = "user-token-abc";
    const cfg = loadConfig();
    expect(cfg.appKey).toBe("app-key-xyz");
    expect(cfg.userToken).toBe("user-token-abc");
    expect(cfg.baseUrl).toBe("https://runrun.it/api/v1.0");
    expect(cfg.logLevel).toBe("info");
  });

  it("uses custom base URL when provided", () => {
    process.env.RUNRUNIT_APP_KEY = "k";
    process.env.RUNRUNIT_USER_TOKEN = "t";
    process.env.RUNRUNIT_BASE_URL = "https://staging.runrun.it/api/v1.0";
    expect(loadConfig().baseUrl).toBe("https://staging.runrun.it/api/v1.0");
  });

  it("throws when RUNRUNIT_APP_KEY is missing", () => {
    process.env.RUNRUNIT_USER_TOKEN = "t";
    expect(() => loadConfig()).toThrow(/RUNRUNIT_APP_KEY/);
  });

  it("throws when RUNRUNIT_USER_TOKEN is missing", () => {
    process.env.RUNRUNIT_APP_KEY = "k";
    expect(() => loadConfig()).toThrow(/RUNRUNIT_USER_TOKEN/);
  });

  it("accepts valid LOG_LEVEL values", () => {
    process.env.RUNRUNIT_APP_KEY = "k";
    process.env.RUNRUNIT_USER_TOKEN = "t";
    process.env.LOG_LEVEL = "debug";
    expect(loadConfig().logLevel).toBe("debug");
  });

  it("rejects invalid LOG_LEVEL", () => {
    process.env.RUNRUNIT_APP_KEY = "k";
    process.env.RUNRUNIT_USER_TOKEN = "t";
    process.env.LOG_LEVEL = "verbose";
    expect(() => loadConfig()).toThrow(/LOG_LEVEL/);
  });
});
