import { vi } from "vitest";
import type { RunrunClient } from "../../src/client.js";

export function mockClient(
  getImpl: (...args: Parameters<RunrunClient["get"]>) => ReturnType<RunrunClient["get"]>,
  postImpl?: (path: string, body: Record<string, unknown>) => Promise<unknown>,
  patchImpl?: (path: string, body: Record<string, unknown>) => Promise<unknown>
): RunrunClient {
  return {
    get: vi.fn(getImpl),
    post: vi.fn(postImpl ?? (async () => ({}))),
    patch: vi.fn(patchImpl ?? (async () => ({})))
  } as unknown as RunrunClient;
}
