import { vi } from "vitest";
import type { RunrunClient } from "../../src/client.js";

export function mockClient(
  getImpl: (...args: Parameters<RunrunClient["get"]>) => ReturnType<RunrunClient["get"]>,
  postImpl?: (path: string, body: Record<string, unknown>) => Promise<unknown>,
  patchImpl?: (path: string, body: Record<string, unknown>) => Promise<unknown>,
  deleteImpl?: (path: string) => Promise<unknown>,
  putImpl?: (path: string, body: Record<string, unknown>) => Promise<unknown>,
  getBinaryImpl?: (path: string) => Promise<{ data: Buffer; contentType: string }>
): RunrunClient {
  return {
    get: vi.fn(getImpl),
    post: vi.fn(postImpl ?? (async () => ({}))),
    patch: vi.fn(patchImpl ?? (async () => ({}))),
    delete: vi.fn(deleteImpl ?? (async () => ({}))),
    put: vi.fn(putImpl ?? (async () => ({}))),
    getBinary: vi.fn(
      getBinaryImpl ?? (async () => ({ data: Buffer.from([1]), contentType: "image/png" }))
    )
  } as unknown as RunrunClient;
}
