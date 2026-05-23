import type { Config } from "./config.js";
import { RunrunApiError } from "./errors.js";

export type QueryParams = Record<string, string | number | boolean | undefined>;

export class RunrunClient {
  constructor(private readonly config: Config) {}

  async get<T = unknown>(path: string, params: QueryParams = {}): Promise<T> {
    const url = this.buildUrl(path, params);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "App-Key": this.config.appKey,
        "User-Token": this.config.userToken,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      const body = await res.text();
      throw new RunrunApiError(res.status, body, path);
    }

    return (await res.json()) as T;
  }

  private buildUrl(path: string, params: QueryParams): string {
    const url = new URL(this.config.baseUrl.replace(/\/$/, "") + path);
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }
}
