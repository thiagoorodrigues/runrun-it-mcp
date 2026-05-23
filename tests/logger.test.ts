import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger } from "../src/logger.js";

describe("createLogger", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  it("logs info messages to stderr", () => {
    const logger = createLogger("info");
    logger.info("hello");
    expect(stderrSpy).toHaveBeenCalled();
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it("does not log debug when level is info", () => {
    const logger = createLogger("info");
    logger.debug("noise");
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("logs debug when level is debug", () => {
    const logger = createLogger("debug");
    logger.debug("loud");
    expect(stderrSpy).toHaveBeenCalled();
  });

  it("logs error at all levels", () => {
    const logger = createLogger("error");
    logger.error("oops");
    expect(stderrSpy).toHaveBeenCalled();
  });

  it("formats with timestamp and level", () => {
    const logger = createLogger("info");
    logger.info("ping");
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
    expect(output).toMatch(/\[info\]/);
    expect(output).toMatch(/ping/);
  });
});
