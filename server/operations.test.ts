import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  operationDefinitions,
  stepState,
  type OperationKind,
} from "../shared/operations";
const state = vi.hoisted(() => ({
  rows: [] as any[],
  writes: [] as any[],
  failInsert: false,
}));
vi.mock("./services/tenant", () => ({
  db: async () => ({
    insert: () => ({
      values: async (value: any) => {
        if (state.failInsert) throw new Error("duplicate");
        state.writes.push({ insert: value });
      },
    }),
    update: () => ({
      set: (value: any) => ({
        where: async (condition: any) => {
          state.writes.push({ update: value, condition });
        },
      }),
    }),
    select: () => ({
      from: () => ({
        where: (condition: any) => ({
          limit: async () => {
            state.writes.push({ query: condition });
            return state.rows;
          },
        }),
      }),
    }),
  }),
}));
import {
  getOperation,
  reportedSnapshot,
  withObservedOperation,
} from "./services/operations";
import { MySqlDialect } from "drizzle-orm/mysql-core";
beforeEach(() => {
  state.rows = [];
  state.writes = [];
  state.failInsert = false;
});
describe("genuine operation progress", () => {
  it("marks only observed earlier stages complete and never advances waiting stages by time", () => {
    expect(stepState(1, 0, "running")).toBe("complete");
    expect(stepState(1, 1, "running")).toBe("active");
    expect(stepState(1, 2, "running")).toBe("waiting");
    expect(stepState(1, 1, "failed")).toBe("stopped");
    expect(stepState(1, 1, "interrupted")).toBe("uncertain");
    expect(stepState(1, 2, "interrupted")).toBe("waiting");
    expect(stepState(1, 2, "failed")).toBe("waiting");
    expect(stepState(4, 3, "succeeded")).toBe("complete");
  });
  it("keeps every operation explicitly draft/review-only", () => {
    for (const kind of Object.keys(operationDefinitions) as OperationKind[]) {
      expect(operationDefinitions[kind].steps).toHaveLength(4);
      expect(operationDefinitions[kind].boundary).toMatch(
        /only|until|only when/
      );
    }
  });
  it("reports interruption as uncertainty, not a successful or cancelled request", () => {
    const date = new Date("2026-10-12T09:00:00Z");
    const row = {
      id: "x",
      companyId: 1,
      userId: 2,
      kind: "company_analysis",
      status: "running",
      stage: 1,
      detail: "Preparing",
      startedAt: date,
      updatedAt: date,
      completedAt: null,
    } as const;
    expect(
      reportedSnapshot(row, new Date("2026-10-12T09:11:00Z").getTime()).status
    ).toBe("interrupted");
    expect(
      reportedSnapshot(
        { ...row, status: "succeeded" },
        new Date("2026-10-12T10:11:00Z").getTime()
      ).status
    ).toBe("succeeded");
  });
  it("scopes reads to ID, company and the initiating user", async () => {
    expect(
      await getOperation({ companyId: 71, userId: 92 }, "request-id")
    ).toBeNull();
    const compiled = new MySqlDialect().sqlToQuery(state.writes[0].query);
    expect(compiled.params).toEqual(["request-id", 71, 92]);
    expect(compiled.sql).toContain("companyId");
    expect(compiled.sql).toContain("userId");
  });
  it("completes only after the actual work resolves and preserves its result", async () => {
    let resolve!: () => void;
    const gate = new Promise<void>(r => {
      resolve = r;
    });
    const pending = withObservedOperation(
      { companyId: 1, userId: 2 },
      "company_analysis",
      "request-id",
      async report => {
        await report(0, "Read");
        await report(1, "Suggest");
        await gate;
        return { id: 42 };
      }
    );
    await new Promise(r => setTimeout(r, 0));
    expect(state.writes.some(x => x.update?.status === "succeeded")).toBe(
      false
    );
    resolve();
    expect(await pending).toEqual({ id: 42 });
    expect(state.writes.at(-1).update).toMatchObject({
      status: "succeeded",
      stage: 4,
    });
  });
  it("keeps failure at its last observed stage, with no automatic work retry", async () => {
    let calls = 0;
    await expect(
      withObservedOperation(
        { companyId: 1, userId: 2 },
        "lead_analysis",
        "request-id",
        async report => {
          calls++;
          await report(1);
          throw new Error("Source unavailable");
        }
      )
    ).rejects.toThrow("Source unavailable");
    expect(calls).toBe(1);
    expect(state.writes.at(-1).update).toMatchObject({
      status: "failed",
      stage: 1,
    });
  });
  it("does not launch duplicate work when a UUID was already used", async () => {
    state.failInsert = true;
    state.rows = [{ id: "request-id" }];
    const work = vi.fn();
    await expect(
      withObservedOperation(
        { companyId: 1, userId: 2 },
        "page_generation",
        "request-id",
        work
      )
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(work).not.toHaveBeenCalled();
  });
  it("preserves older clients and skips progress persistence when no ID supplied", async () => {
    expect(
      await withObservedOperation(
        { companyId: 1, userId: 2 },
        "outreach_generation",
        undefined,
        async report => {
          await report(1);
          return { id: 8 };
        }
      )
    ).toEqual({ id: 8 });
    expect(state.writes).toHaveLength(0);
  });
});
