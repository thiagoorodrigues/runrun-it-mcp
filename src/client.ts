import type { Config } from "./config.js";
import { RunrunApiError } from "./errors.js";

export type QueryParams = Record<string, string | number | boolean | undefined>;
export type BodyParams = Record<string, unknown>;

export class RunrunClient {
  constructor(private readonly config: Config) {}

  async get<T = unknown>(path: string, params: QueryParams = {}): Promise<T> {
    const url = this.buildUrl(path, params);
    const res = await fetch(url, {
      method: "GET",
      headers: this.authHeaders()
    });
    return this.parseResponse<T>(res, path);
  }

  async post<T = unknown>(path: string, body: BodyParams): Promise<T> {
    const url = this.buildUrl(path, {});
    const res = await fetch(url, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(body)
    });
    return this.parseResponse<T>(res, path);
  }

  async patch<T = unknown>(path: string, body: BodyParams): Promise<T> {
    const url = this.buildUrl(path, {});
    const res = await fetch(url, {
      method: "PATCH",
      headers: this.authHeaders(),
      body: JSON.stringify(body)
    });
    return this.parseResponse<T>(res, path);
  }

  async delete<T = unknown>(path: string): Promise<T> {
    const url = this.buildUrl(path, {});
    const res = await fetch(url, {
      method: "DELETE",
      headers: this.authHeaders()
    });
    return this.parseResponse<T>(res, path);
  }

  private authHeaders() {
    return {
      "App-Key": this.config.appKey,
      "User-Token": this.config.userToken,
      "Content-Type": "application/json"
    };
  }

  private async parseResponse<T>(res: Response, path: string): Promise<T> {
    if (!res.ok) {
      const body = await res.text();
      throw new RunrunApiError(res.status, body, path);
    }
    if (res.status === 204) {
      return {} as T;
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
