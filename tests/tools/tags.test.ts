import { describe, it, expect } from "vitest";
import { createTagsTools } from "../../src/tools/tags.js";
import { RunrunApiError } from "../../src/errors.js";
import { mockClient } from "../helpers/mock-client.js";

describe("tags_search", () => {
  it("calls /tags with search_term", async () => {
    const client = mockClient(async () => [{ name: "bug", color: "#FF0000" }]);
    const tool = createTagsTools(client).find((t) => t.name === "tags_search")!;
    const res = await tool.handler({ search_term: "bug" });
    expect(client.get).toHaveBeenCalledWith("/tags", { search_term: "bug" });
    expect(JSON.parse(res.content[0].text)).toMatchObject([{ name: "bug" }]);
  });

  it("returns isError on API error", async () => {
    const client = mockClient(async () => {
      throw new RunrunApiError(500, "Error", "/tags");
    });
    const tool = createTagsTools(client).find((t) => t.name === "tags_search")!;
    const res = await tool.handler({ search_term: "x" });
    expect(res.isError).toBe(true);
  });
});
