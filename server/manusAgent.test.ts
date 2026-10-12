import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./services/credentials", () => ({
  getIntegration: vi.fn(),
  saveIntegration: vi.fn(),
}));
vi.mock("./db", () => ({ getDb: vi.fn() }));

import { getIntegration } from "./services/credentials";
import {
  inspectManusAgent,
  startManusAgent,
  type StartManusAgentInput,
} from "./services/manusAgent";

const integration = {
  config: { apiKey: "tenant-key" },
  row: { displayName: "manus-user-1" },
};

const config = {
  icpId: 1,
  source: "manus",
  researchProvider: "manus",
  dailyLimit: 1,
  intervalMinutes: 240,
  timezone: "UTC",
  weekdaysOnly: true,
  startHour: 9,
  endHour: 17,
  discover: true,
  qualify: true,
  pages: false,
  outreach: false,
  channel: "email",
  instructions: "Use public sources only.",
  gojiberryTool: "",
  gojiberryArgs: {},
  gojiberryLimitField: "",
  manusProjectId: "",
  manusConnectorIds: ["connector-selected"],
} as StartManusAgentInput["config"];

const input = {
  stage: "discover",
  config,
  company: {
    id: 1,
    name: "Proof",
    website: "https://reqproof.com",
    brand: {
      offer: "Evidence-led software assurance.",
      approvedClaims: "Connects engineering intent and evidence.",
    },
  },
  icp: {
    id: 1,
    companyId: 1,
    criteria: {
      name: "Engineering teams",
      industries: "Developer tools",
      geography: "North America",
      companySize: "20-500",
      roles: "CTO",
      keywords: "coding agents",
      signals: "Public AI engineering signal",
      exclusions: "Solo projects",
      minScore: 70,
    },
  },
} as unknown as StartManusAgentInput;

function ok(payload: Record<string, unknown>) {
  return new Response(JSON.stringify({ ok: true, ...payload }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function fail(status = 400) {
  return new Response(JSON.stringify({ ok: false, error: { message: "provider detail" } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function detail(status: string, background?: boolean) {
  return ok({
    task: {
      id: "task-existing",
      status,
      ...(background === undefined ? {} : { has_running_background_jobs: background }),
      task_url: "https://manus.im/app/task-existing",
    },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Manus task safety adapter", () => {
  it("creates instead of sending when a previous task is running", async () => {
    vi.mocked(getIntegration).mockResolvedValue(integration as never);
    const request = vi
      .fn()
      .mockResolvedValueOnce(detail("running", true))
      .mockResolvedValueOnce(ok({ task_id: "task-new", task_url: "https://manus.im/app/task-new" }));
    vi.stubGlobal("fetch", request);

    const result = await startManusAgent(1, { ...input, previousTaskId: "task-existing" });

    expect(result.taskId).toBe("task-new");
    expect(request.mock.calls.map(call => String(call[0]))).toEqual([
      "https://api.manus.ai/v2/task.detail?task_id=task-existing",
      "https://api.manus.ai/v2/task.create",
    ]);
    expect(request.mock.calls.some(call => String(call[0]).includes("task.sendMessage"))).toBe(false);
  });

  it("does not continue when reading the previous timeline fails", async () => {
    vi.mocked(getIntegration).mockResolvedValue(integration as never);
    const request = vi
      .fn()
      .mockResolvedValueOnce(detail("stopped", false))
      .mockResolvedValueOnce(fail())
      .mockResolvedValueOnce(ok({ task_id: "task-new" }));
    vi.stubGlobal("fetch", request);

    const result = await startManusAgent(1, { ...input, previousTaskId: "task-existing" });

    expect(result.taskId).toBe("task-new");
    expect(request.mock.calls.some(call => String(call[0]).includes("task.sendMessage"))).toBe(false);
  });

  it("never creates a replacement after an uncertain follow-up send", async () => {
    vi.mocked(getIntegration).mockResolvedValue(integration as never);
    const request = vi
      .fn()
      .mockResolvedValueOnce(detail("stopped", false))
      .mockResolvedValueOnce(ok({ messages: [{ id: "old-event", type: "status_update" }] }))
      .mockRejectedValueOnce(new Error("transport closed after acceptance"));
    vi.stubGlobal("fetch", request);

    await expect(
      startManusAgent(1, { ...input, previousTaskId: "task-existing" })
    ).rejects.toThrow("Manus message send failed");
    expect(request).toHaveBeenCalledTimes(3);
    expect(request.mock.calls.some(call => String(call[0]).includes("task.create"))).toBe(false);
  });

  it("holds the event cursor when extraction appears before background work is done", async () => {
    vi.mocked(getIntegration).mockResolvedValue(integration as never);
    const request = vi
      .fn()
      .mockResolvedValueOnce(detail("stopped", true))
      .mockResolvedValueOnce(
        ok({
          messages: [
            { id: "old-event", type: "status_update", status_update: { agent_status: "running" } },
            {
              id: "result-event",
              type: "structured_output_result",
              structured_output_result: {
                success: true,
                value: { candidates: [], summary: "No verified candidate yet." },
              },
            },
          ],
        })
      );
    vi.stubGlobal("fetch", request);

    const result = await inspectManusAgent(1, {
      taskId: "task-existing",
      eventCursor: "event:old-event",
      stage: "discover",
    });

    expect(result.state).toBe("running");
    expect(result.eventCursor).toBe("event:old-event");
    expect(result.result).toBeUndefined();
  });

  it("uses the latest status update rather than an earlier waiting event", async () => {
    vi.mocked(getIntegration).mockResolvedValue(integration as never);
    const request = vi
      .fn()
      .mockResolvedValueOnce(detail("stopped", false))
      .mockResolvedValueOnce(
        ok({
          messages: [
            {
              id: "waiting",
              type: "status_update",
              status_update: {
                agent_status: "waiting",
                status_detail: { waiting_description: "Choose a browser" },
              },
            },
            { id: "stopped", type: "status_update", status_update: { agent_status: "stopped" } },
            {
              id: "result",
              type: "structured_output_result",
              structured_output_result: {
                success: true,
                value: { candidates: [], summary: "No verified candidate yet." },
              },
            },
          ],
        })
      );
    vi.stubGlobal("fetch", request);

    const result = await inspectManusAgent(1, {
      taskId: "task-existing",
      stage: "discover",
    });

    expect(result.state).toBe("completed");
    expect(result.waiting).toBeUndefined();
    expect(result.result).toEqual({ candidates: [], summary: "No verified candidate yet." });
  });

  it("returns the pagination cursor when the ten-page bound is reached", async () => {
    vi.mocked(getIntegration).mockResolvedValue(integration as never);
    const request = vi.fn().mockResolvedValueOnce(detail("running", false));
    for (let i = 1; i <= 10; i += 1) {
      request.mockResolvedValueOnce(
        ok({
          messages: [{ id: `event-${i}`, type: "status_update", status_update: { agent_status: "running" } }],
          has_more: true,
          next_cursor: `cursor-${i}`,
        })
      );
    }
    vi.stubGlobal("fetch", request);

    const result = await inspectManusAgent(1, { taskId: "task-existing", stage: "discover" });

    expect(result.state).toBe("running");
    expect(result.eventCursor).toBe("page:cursor-10");
    expect(request).toHaveBeenCalledTimes(11);
  });

  it("keeps a task unknown when task detail transport fails", async () => {
    vi.mocked(getIntegration).mockResolvedValue(integration as never);
    const request = vi.fn().mockResolvedValueOnce(fail(503));
    vi.stubGlobal("fetch", request);

    const result = await inspectManusAgent(1, { taskId: "task-existing", stage: "discover" });

    expect(result.state).toBe("unknown");
    expect(result.error).toContain("Unable to inspect");
  });

  it("keeps a running task unknown when timeline transport fails, but preserves confirmed errors", async () => {
    vi.mocked(getIntegration).mockResolvedValue(integration as never);
    const runningRequest = vi
      .fn()
      .mockResolvedValueOnce(detail("running", false))
      .mockResolvedValueOnce(fail(503));
    vi.stubGlobal("fetch", runningRequest);

    const running = await inspectManusAgent(1, { taskId: "task-existing", stage: "discover" });
    expect(running.state).toBe("unknown");

    const errorRequest = vi.fn().mockResolvedValueOnce(detail("error", false));
    vi.stubGlobal("fetch", errorRequest);
    const failed = await inspectManusAgent(1, { taskId: "task-existing", stage: "discover" });
    expect(failed.state).toBe("error");
    expect(failed.error).toBe("Manus task failed.");
    expect(errorRequest).toHaveBeenCalledTimes(1);
  });
});
