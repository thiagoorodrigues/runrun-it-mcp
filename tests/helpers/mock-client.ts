import { vi } from "vitest";
import type { RunrunClient } from "../../src/client.js";

/**
 * Shared test helper that produces a fake `RunrunClient` whose `get` method
 * delegates to the provided implementation. Used across tool unit tests so the
 * mock shape stays consistent.
 */
export function mockClient(
  getImpl: (...args: Parameters<RunrunClient["get"]>) => ReturnType<RunrunClient["get"]>
): RunrunClient {
  return { get: vi.fn(getImpl) } as unknown as RunrunClient;
}
