import type { Config } from "./config.js";
import { RunrunApiError } from "./errors.js";

export type QueryParams = Record<string, string | number | boolean | undefined>;
export type BodyParams = Record<string, unknown>;
export type BinaryResponse = { data: Buffer; contentType: string };

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

  async put<T = unknown>(path: string, body: BodyParams): Promise<T> {
    const url = this.buildUrl(path, {});
    const res = await fetch(url, {
      method: "PUT",
      headers: this.authHeaders(),
      body: JSON.stringify(body)
    });
    return this.parseResponse<T>(res, path);
  }

  /**
   * Download a binary resource (e.g. /documents/:id/download). Follows the
   * redirect Runrun.it issues to its file storage and returns the raw bytes
   * plus the MIME type without parameters (e.g. "image/png").
   */
  async getBinary(path: string): Promise<BinaryResponse> {
    const url = this.buildUrl(path, {});
    const res = await fetch(url, {
      method: "GET",
      headers: this.authHeaders(),
      redirect: "follow"
    });
    if (!res.ok) {
      const body = await res.text();
      throw new RunrunApiError(res.status, body, path);
    }
    const rawType = res.headers.get("content-type") ?? "application/octet-stream";
    const contentType = rawType.split(";")[0].trim().toLowerCase();
    const data = Buffer.from(await res.arrayBuffer());
    return { data, contentType };
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
