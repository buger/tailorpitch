import { describe, it, expect, vi, beforeEach } from "vitest";
const state = vi.hoisted(() => ({ sourcingPaused: 0, syncPaused: 0 }));
vi.mock("./services/tenant", () => ({
  recordActivity: vi.fn(),
  db: async () => ({
    select: () => ({ from: () => ({ where: async () => [state] }) }),
  }),
}));
import {
  getIntakeControls,
  assertSourcingOpen,
  assertSyncOpen,
} from "./services/intakeControls";
describe("independent intake controls", () => {
  beforeEach(() => {
    state.sourcingPaused = 0;
    state.syncPaused = 0;
  });
  it("allows syncing when only sourcing is paused", async () => {
    state.sourcingPaused = 1;
    expect(await getIntakeControls(1)).toEqual({
      sourcingPaused: true,
      syncPaused: false,
    });
    await expect(assertSourcingOpen(1)).rejects.toThrow("sourcing is paused");
    await expect(assertSyncOpen(1)).resolves.toBeUndefined();
  });
  it("allows sourcing check but blocks result import when only sync is paused", async () => {
    state.syncPaused = 1;
    await expect(assertSourcingOpen(1)).resolves.toBeUndefined();
    await expect(assertSyncOpen(1)).rejects.toThrow("sync is paused");
  });
  it("resuming controls allows both paths again", async () => {
    await expect(assertSourcingOpen(1)).resolves.toBeUndefined();
    await expect(assertSyncOpen(1)).resolves.toBeUndefined();
  });
});
