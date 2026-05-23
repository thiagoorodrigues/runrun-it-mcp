export type McpToolResponse = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export class RunrunApiError extends Error {
  constructor(
    public status: number,
    public body: string,
    public endpoint: string
  ) {
    super(`Runrun.it API error (${status}) on ${endpoint}: ${body}`);
    this.name = "RunrunApiError";
  }
}

export function successResponse(data: unknown): McpToolResponse {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
  };
}

export function apiErrorResponse(err: RunrunApiError): McpToolResponse {
  const rateLimitNote = err.status === 429 ? " (rate limit — retry later)" : "";
  return {
    content: [
      {
        type: "text",
        text: `Runrun.it API error (status ${err.status}) on ${err.endpoint}${rateLimitNote}: ${err.body}`
      }
    ],
    isError: true
  };
}

export function networkErrorResponse(err: Error): McpToolResponse {
  return {
    content: [{ type: "text", text: `Network error: ${err.message}` }],
    isError: true
  };
}

export function genericErrorResponse(err: unknown): McpToolResponse {
  if (err instanceof RunrunApiError) return apiErrorResponse(err);
  if (err instanceof Error) return networkErrorResponse(err);
  return networkErrorResponse(new Error(String(err)));
}
