import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ tick: vi.fn(), select: vi.fn() }));
vi.mock("./services/tenant", () => ({
  db: async () => ({
    select: () => {
      const q: any = {
        from: () => q,
        where: () => q,
        orderBy: () => q,
        limit: () => mocks.select(),
      };
      return q;
    },
  }),
}));
vi.mock("./services/icpAgents", () => ({ tickIcpAgent: mocks.tick }));
import { startIcpAgentWorker } from "./services/icpAgentWorker";
import {
  workerConfiguration,
  workerStatus,
  markWorkerStopped,
  markWorkerCheck,
} from "./services/icpAgentRuntime";
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("HOST", "127.0.0.1");
  vi.stubEnv("TAILORPITCH_AGENT_WORKER", "cloud");
  markWorkerStopped();
  markWorkerCheck();
  mocks.tick.mockReset();
  mocks.select.mockReset();
  mocks.select.mockResolvedValue([]);
  mocks.tick.mockResolvedValue({ status: "paused" });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  markWorkerStopped();
});
describe("Cloud Computer ICP worker", () => {
  it("accepts persistent cloud deployment without platform schedules and keeps legacy server mode", () => {
    expect(workerConfiguration()).toMatchObject({
      configured: true,
      environment: "cloud",
      pollIntervalSeconds: 60,
    });
    expect(
      workerConfiguration({
        HOST: "127.0.0.1",
        TAILORPITCH_AGENT_WORKER: "local",
      })
    ).toMatchObject({ configured: true, environment: "local" });
    for (const HOST of ["0.0.0.0", "", undefined])
      expect(
        workerConfiguration({ HOST, TAILORPITCH_AGENT_WORKER: "cloud" })
          .configured
      ).toBe(false);
  });
  it("reports actual startup, minute polls, and stopped state—not configured alone", async () => {
    expect(workerStatus().active).toBe(false);
    const stop = startIcpAgentWorker();
    expect(workerStatus().active).toBe(true);
    expect(workerStatus().startedAt).toBeInstanceOf(Date);
    await vi.advanceTimersByTimeAsync(60000);
    expect(mocks.select).toHaveBeenCalledTimes(1);
    expect(workerStatus().lastCheckAt).toEqual(new Date());
    stop();
    expect(workerStatus().active).toBe(false);
    await vi.advanceTimersByTimeAsync(60000);
    expect(mocks.select).toHaveBeenCalledTimes(1);
  });
  it("dispatches compatible server agents on the cloud and never executes platform-scheduled agents", async () => {
    mocks.select.mockResolvedValue([
      { id: 1, companyId: 2, config: { execution: "local" } },
      { id: 3, companyId: 2, config: { execution: "hosted" } },
    ]);
    const stop = startIcpAgentWorker();
    await vi.advanceTimersByTimeAsync(60000);
    expect(mocks.tick).toHaveBeenCalledTimes(1);
    expect(mocks.tick).toHaveBeenCalledWith(2, 1, "local");
    expect(workerStatus().lastError).toBeNull();
    stop();
  });
  it("does not dispatch under absent/mismatched runtime and reports failed checks honestly", async () => {
    vi.stubEnv("TAILORPITCH_AGENT_WORKER", "");
    const noop = startIcpAgentWorker();
    await vi.advanceTimersByTimeAsync(60000);
    expect(mocks.select).not.toHaveBeenCalled();
    noop();
    vi.stubEnv("TAILORPITCH_AGENT_WORKER", "cloud");
    mocks.select.mockRejectedValueOnce(Error("fixture"));
    const stop = startIcpAgentWorker();
    await vi.advanceTimersByTimeAsync(60000);
    expect(workerStatus().lastError).toContain("Dispatch could not finish");
    await vi.advanceTimersByTimeAsync(60000);
    expect(workerStatus().lastError).toBeNull();
    stop();
  });
});
