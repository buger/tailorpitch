import { beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  controls: { sourcingPaused: false, syncPaused: false },
  active: true,
  approved: true,
  stale: false,
  agent: null as any,
  writes: 0,
  sourcePlanId: 60,
}));
vi.mock("./services/intakeControls", () => ({
  getIntakeControls: async () => m.controls,
  assertSyncOpen: vi.fn(),
}));
vi.mock("./services/icpAgentRuntime", () => ({
  workerStatus: () => ({ active: m.active }),
}));
vi.mock("./services/sourcePlans", () => ({
  listSourcePlans: async () => ({
    plans: [
      {
        id: m.sourcePlanId,
        approvedAt: m.approved ? new Date() : null,
        stale: m.stale,
        selection: { actorId: "apify/google-search-scraper" },
        answers: { dailyLimit: 3 },
        contextHash: "fixture",
        recommendation: {},
      },
    ],
  }),
  discoverSourceCatalog: async () => [
    {
      id: "apify/google-search-scraper",
      role: "discovery",
      available: true,
      schema: {},
      pricing: {
        pricingModel: "PAY_PER_EVENT",
        minimalMaxTotalChargeUsd: 0.5,
        pricingPerEvent: { actorChargeEvents: {} },
      },
    },
  ],
}));
vi.mock("./services/apifyAccess", () => ({
  getApifyStatus: async () => ({ connected: true }),
  apifyRequest: vi.fn(),
  ApifyRequestError: class extends Error {},
}));
vi.mock("./services/tenant", async () => {
  const t = await import("../drizzle/schema");
  const query = (rows: () => any[]) => {
    const q: any = {
      where: () => q,
      limit: () => q,
      orderBy: () => q,
      then: (resolve: any, reject: any) =>
        Promise.resolve(rows()).then(resolve, reject),
    };
    return q;
  };
  return {
    recordActivity: vi.fn(),
    scopedRow: async (table: any, id: number, companyId: number) => {
      if (companyId !== 1) throw Error("Record not found in your company.");
      if (table === t.icps) return { id, companyId };
      if (!m.agent || m.agent.companyId !== companyId)
        throw Error("Record not found in your company.");
      return m.agent;
    },
    db: async () => ({
      select: () => ({
        from: (table: any) =>
          query(() =>
            table === t.icpAgents
              ? m.agent
                ? [m.agent]
                : []
              : table === t.pipelines
                ? []
                : [{ n: 0 }]
          ),
      }),
      insert: () => ({
        values: (fields: any) => ({
          onDuplicateKeyUpdate: async ({ set }: any) => {
            m.writes++;
            m.agent = m.agent
              ? { ...m.agent, ...set }
              : { id: 9, ...fields, nextRunAt: null, leaseToken: null };
            return [{ insertId: 9 }];
          },
        }),
      }),
      update: () => ({
        set: (fields: any) => ({
          where: async () => {
            m.writes++;
            m.agent = { ...m.agent, ...fields };
            return [{ affectedRows: 1 }];
          },
        }),
      }),
    }),
  };
});
import {
  saveAndStartIcpAgent,
  saveIcpAgent,
  toggleIcpAgent,
} from "./services/icpAgents";
import { icpAgentConfigSchema } from "../shared/icpAgents";
const config = icpAgentConfigSchema.parse({
  allowedActorIds: ["apify/google-search-scraper"],
  weekdaysOnly: false,
  startHour: 0,
  endHour: 24,
});
beforeEach(() => {
  m.controls = { sourcingPaused: false, syncPaused: false };
  m.active = true;
  m.approved = true;
  m.stale = false;
  m.agent = null;
  m.writes = 0;
});
describe("Explicit ICP agent startup", () => {
  it("saves and enables the reviewed ICP on the active cloud worker", async () => {
    const r = await saveAndStartIcpAgent(1, 3, "Reviewed agent", config);
    expect(r).toMatchObject({ id: 9, success: true, status: "ready" });
    expect(m.agent).toMatchObject({
      companyId: 1,
      icpId: 3,
      sourcePlanId: 60,
      enabled: 1,
    });
  });
  it("continues to save paused unless start was requested", async () => {
    expect((await saveIcpAgent(1, 3, "Reviewed agent", config)).id).toBe(9);
    expect(m.agent.enabled).toBe(0);
  });
  it.each(["sourcingPaused", "syncPaused"] as const)(
    "does not ignore %s or write enabled state",
    async key => {
      m.controls[key] = true;
      await expect(
        saveAndStartIcpAgent(1, 3, "Reviewed agent", config)
      ).rejects.toThrow("paused");
      expect(m.writes).toBe(0);
    }
  );
  it("never approves a strategy or starts on an inactive/different executor", async () => {
    m.approved = false;
    await expect(
      saveAndStartIcpAgent(1, 3, "Reviewed agent", config)
    ).rejects.toThrow("Approve");
    expect(m.writes).toBe(0);
    m.approved = true;
    m.stale = true;
    await expect(
      saveAndStartIcpAgent(1, 3, "Reviewed agent", config)
    ).rejects.toThrow("Approve");
    m.stale = false;
    m.active = false;
    await expect(
      saveAndStartIcpAgent(1, 3, "Reviewed agent", config)
    ).rejects.toThrow("active Cloud Computer");
    m.active = true;
    await expect(
      saveAndStartIcpAgent(1, 3, "Reviewed agent", {
        ...config,
        execution: "hosted",
      })
    ).rejects.toThrow("active Cloud Computer");
  });
  it("blocks resume under a company pause and preserves tenant scope", async () => {
    await saveIcpAgent(1, 3, "Reviewed agent", config);
    m.controls.sourcingPaused = true;
    await expect(toggleIcpAgent(1, 9, true)).rejects.toThrow(
      "sourcing is paused"
    );
    expect(m.agent.enabled).toBe(0);
    await expect(
      saveAndStartIcpAgent(2, 3, "Foreign agent", config)
    ).rejects.toThrow("paused");
    m.controls.sourcingPaused = false;
    await expect(
      saveAndStartIcpAgent(2, 3, "Foreign agent", config)
    ).rejects.toThrow("not found");
  });
});
