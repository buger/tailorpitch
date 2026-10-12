import { describe, it, expect } from "vitest";
import {
  sourceReadiness,
  preferredIcpId,
  startBlocker,
  agentStateMessage,
} from "../shared/agentReadiness";
const approved = {
  id: 60,
  approvedAt: new Date(),
  stale: false,
  selection: { actorId: "apify/google-search-scraper" },
  answers: { dailyLimit: 3 },
};
describe("ICP startup readiness", () => {
  it("defaults to the approved ICP, not the first unapproved profile", () => {
    const states = [
      sourceReadiness(1, undefined, []),
      sourceReadiness(3, approved, [approved.selection.actorId]),
    ];
    expect(preferredIcpId([{ id: 1 }, { id: 3 }], states)).toBe(3);
    expect(preferredIcpId([{ id: 1 }], states)).toBe(1);
    expect(preferredIcpId([], states)).toBe(0);
  });
  it("never treats a stale, unapproved or unavailable source as startable", () => {
    expect(
      sourceReadiness(3, approved, [approved.selection.actorId]).state
    ).toBe("ready");
    expect(
      sourceReadiness(3, { ...approved, approvedAt: null }, [
        approved.selection.actorId,
      ]).state
    ).toBe("needs_approval");
    expect(
      sourceReadiness(3, { ...approved, stale: true }, [
        approved.selection.actorId,
      ]).state
    ).toBe("stale");
    expect(sourceReadiness(3, approved, []).state).toBe("tool_unavailable");
  });
  it("makes company sourcing/sync pauses and executor readiness explicit", () => {
    const base = {
      source: sourceReadiness(3, approved, [approved.selection.actorId]),
      sourcingPaused: false,
      syncPaused: false,
      workerActive: true,
      executor: "local" as const,
    };
    expect(startBlocker(base)).toBeNull();
    expect(startBlocker({ ...base, sourcingPaused: true })).toContain(
      "Company sourcing is paused"
    );
    expect(startBlocker({ ...base, syncPaused: true })).toContain(
      "Company sync is paused"
    );
    expect(startBlocker({ ...base, workerActive: false })).toContain(
      "not active"
    );
    expect(startBlocker({ ...base, executor: "hosted" })).toContain(
      "register its platform schedule"
    );
  });
  it("explains that enabled is not an immediate/bulk-delivery promise", () => {
    expect(agentStateMessage("outside_working_hours")).toContain(
      "working hours"
    );
    expect(agentStateMessage("waiting_for_next_turn")).toContain(
      "does not bypass"
    );
    expect(agentStateMessage("daily_delivery_cap")).toContain(
      "no bulk catch-up"
    );
    expect(agentStateMessage("sourcing_paused")).toContain("cannot start");
  });
});
