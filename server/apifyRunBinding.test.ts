import { describe, it, expect, vi, afterEach } from "vitest";
import {
  runBinding,
  assertRunBinding,
  assertMatchingActiveRun,
  providerJobNeedsSync,
} from "./services/apifyRunBinding";
const run = {
  id: 44,
  companyId: 7,
  type: "discovery",
  actorId: "apify/google-search-scraper",
  sourcePlanId: 11,
  query: "migration parity",
  requestedLimit: 3,
};
afterEach(() => {
  vi.unstubAllEnvs();
});
describe("shared-account Apify run ownership", () => {
  it("requires the private binding for exactly the company, internal run and reviewed request", () => {
    vi.stubEnv("MANUS_JWT_SECRET", "test-run-signing-secret");
    vi.stubEnv("MANUS_PROJECT_ID", "project-fixture");
    const input = { _tailorpitchCorrelation: runBinding(run) };
    expect(() => assertRunBinding(run, input)).not.toThrow();
    for (const changed of [
      { ...run, companyId: 8 },
      { ...run, id: 45 },
      { ...run, sourcePlanId: 12 },
      { ...run, actorId: "apify/website-content-crawler" },
      { ...run, query: "other query" },
      { ...run, requestedLimit: 1 },
    ])
      expect(() => assertRunBinding(changed, input)).toThrow(
        "not verifiably bound"
      );
    expect(() => assertRunBinding(run, {})).toThrow("not verifiably bound");
    expect(input._tailorpitchCorrelation).not.toContain(
      "test-run-signing-secret"
    );
  });
  it("refuses ambiguous run starts when signing is unavailable", () => {
    vi.stubEnv("MANUS_JWT_SECRET", "");
    expect(() => runBinding(run)).toThrow("signing is unavailable");
  });
  it("never reuses an old plan or larger run as the newly reviewed request", () => {
    expect(() => assertMatchingActiveRun(run, run)).not.toThrow();
    for (const changed of [
      { ...run, sourcePlanId: 12 },
      { ...run, query: "different query" },
      { ...run, requestedLimit: 1 },
      { ...run, actorId: "other/source" },
    ])
      expect(() => assertMatchingActiveRun(run, changed)).toThrow(
        "different source strategy"
      );
  });
  it("lets local page/outreach generation continue while provider sync is paused", () => {
    expect(providerJobNeedsSync({ provider: "generation" })).toBe(false);
    expect(providerJobNeedsSync({ provider: "apify" })).toBe(true);
    expect(
      providerJobNeedsSync({ provider: "manus", manusTaskId: "original-task" })
    ).toBe(true);
    expect(
      providerJobNeedsSync({ provider: "generation", sourceRunId: 12 })
    ).toBe(true);
  });
});
