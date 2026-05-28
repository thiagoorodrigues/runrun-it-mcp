import { describe, it, expect } from "vitest";
import { createManualWorkPeriodsTools } from "../../src/tools/manual_work_periods.js";
import { RunrunApiError } from "../../src/errors.js";
import { mockClient } from "../helpers/mock-client.js";

describe("manual_work_periods_list", () => {
  it("calls /manual_work_periods with pagination defaults", async () => {
    const client = mockClient(async () => []);
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_list")!;
    await tool.handler({});
    expect(client.get).toHaveBeenCalledWith("/manual_work_periods", {
      page: 1,
      limit: 50,
      task_id: undefined,
      user_id: undefined,
      from: undefined,
      before: undefined
    });
  });

  it("forwards filters", async () => {
    const client = mockClient(async () => []);
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_list")!;
    await tool.handler({ task_id: 10, user_id: "thiago", from: "2026-05-01", before: "2026-05-31" });
    expect(client.get).toHaveBeenCalledWith("/manual_work_periods", {
      page: 1,
      limit: 50,
      task_id: 10,
      user_id: "thiago",
      from: "2026-05-01",
      before: "2026-05-31"
    });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(async () => { throw new RunrunApiError(500, "Error", "/manual_work_periods"); });
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_list")!;
    const res = await tool.handler({});
    expect(res.isError).toBe(true);
  });
});

describe("manual_work_periods_get", () => {
  it("calls /manual_work_periods/:id", async () => {
    const client = mockClient(async () => ({ id: 7, seconds: 3600 }));
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_get")!;
    const res = await tool.handler({ id: 7 });
    expect(client.get).toHaveBeenCalledWith("/manual_work_periods/7");
    expect(JSON.parse(res.content[0].text)).toMatchObject({ id: 7 });
  });
});

describe("manual_work_periods_create", () => {
  it("calls POST /manual_work_periods with required fields", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({ id: 1, task_id: 10, seconds: 3600 })
    );
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_create")!;
    const res = await tool.handler({ task_id: 10, seconds: 3600 });
    expect(client.post).toHaveBeenCalledWith("/manual_work_periods", {
      manual_work_period: { task_id: 10, seconds: 3600 }
    });
    expect(JSON.parse(res.content[0].text)).toMatchObject({ id: 1 });
  });

  it("includes optional fields when provided", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({ id: 2 })
    );
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_create")!;
    await tool.handler({ task_id: 10, seconds: 7200, board_stage_id: 42, date_to_apply: "2026-05-20" });
    expect(client.post).toHaveBeenCalledWith("/manual_work_periods", {
      manual_work_period: { task_id: 10, seconds: 7200, board_stage_id: 42, date_to_apply: "2026-05-20" }
    });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(
      async () => ({}),
      async () => { throw new RunrunApiError(422, "Invalid", "/manual_work_periods"); }
    );
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_create")!;
    const res = await tool.handler({ task_id: 10, seconds: 3600 });
    expect(res.isError).toBe(true);
  });
});

describe("manual_work_periods_update", () => {
  it("calls PATCH /manual_work_periods/:id with provided fields only", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({ id: 5, seconds: 1800 })
    );
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_update")!;
    const res = await tool.handler({ id: 5, seconds: 1800 });
    expect(client.patch).toHaveBeenCalledWith("/manual_work_periods/5", {
      manual_work_period: { seconds: 1800 }
    });
    expect(JSON.parse(res.content[0].text)).toMatchObject({ id: 5 });
  });

  it("sends only fields provided", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({ id: 3 })
    );
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_update")!;
    await tool.handler({ id: 3, date_to_apply: "2026-05-15" });
    expect(client.patch).toHaveBeenCalledWith("/manual_work_periods/3", {
      manual_work_period: { date_to_apply: "2026-05-15" }
    });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => { throw new RunrunApiError(404, "Not Found", "/manual_work_periods/999"); }
    );
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_update")!;
    const res = await tool.handler({ id: 999, seconds: 100 });
    expect(res.isError).toBe(true);
  });
});

describe("manual_work_periods_delete", () => {
  it("calls DELETE /manual_work_periods/:id", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({}),
      async () => ({})
    );
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_delete")!;
    const res = await tool.handler({ id: 5 });
    expect(client.delete).toHaveBeenCalledWith("/manual_work_periods/5");
    expect(res.isError).toBeUndefined();
  });

  it("returns isError on API error", async () => {
    const client = mockClient(
      async () => ({}),
      async () => ({}),
      async () => ({}),
      async () => { throw new RunrunApiError(404, "Not Found", "/manual_work_periods/999"); }
    );
    const tool = createManualWorkPeriodsTools(client).find((t) => t.name === "manual_work_periods_delete")!;
    const res = await tool.handler({ id: 999 });
    expect(res.isError).toBe(true);
  });
});
