import { describe, it, expect, vi, afterEach } from "vitest";
import {
  agentSourceIds,
  icpAgentConfigSchema,
  agentWindow,
  agentDispatchState,
  admissionReasons,
  recentAgentDays,
  validOriginalSignalDate,
} from "../shared/icpAgents";
import {
  boundedAgentInput,
  agentRunMarker,
  agentRunPath,
  boundedRecords,
  validateObservedCandidate,
  observedRecordUrls,
  verifiedAgentPricing,
} from "./services/icpAgentTools";
const config = icpAgentConfigSchema.parse({
  allowedActorIds: [agentSourceIds[0]],
  timezone: "America/New_York",
});
afterEach(() => vi.unstubAllEnvs());
describe("per ICP agent delivery rules", () => {
  it("defaults to few leads with a bounded search budget, never bulk intake", () => {
    expect(config.dailyTarget).toBe(3);
    expect(config.maxDailyAttempts).toBe(6);
    for (const extra of [
      { dailyTarget: 1000 },
      { maxDailyAttempts: 1000 },
      { maxDailyAttempts: 7 },
      { intervalMinutes: 0 },
      { allowedActorIds: [] },
      { allowedActorIds: ["unknown/actor"] },
    ])
      expect(
        icpAgentConfigSchema.safeParse({ ...config, ...extra }).success
      ).toBe(false);
  });
  it("counts days in each agent timezone and applies working hours/weekend rules", () => {
    expect(agentWindow(config, new Date("2026-10-12T02:00:00Z")).day).toBe(
      "2026-10-11"
    );
    expect(agentWindow(config, new Date("2026-10-12T14:00:00Z")).allowed).toBe(
      true
    );
    expect(agentWindow(config, new Date("2026-10-11T14:00:00Z")).allowed).toBe(
      false
    );
    expect(recentAgentDays("UTC", new Date("2026-10-12T12:00:00Z"))).toEqual([
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
      "2026-10-12",
    ]);
  });
  it("limits deliveries and attempts independently and never catches up a backlog", () => {
    const at = new Date("2026-10-12T14:00:00Z");
    expect(
      agentDispatchState(config, { delivered: 3, attempts: 3 }, null, at)
    ).toBe("daily_delivery_cap");
    expect(
      agentDispatchState(config, { delivered: 0, attempts: 6 }, null, at)
    ).toBe("daily_attempt_cap");
    expect(
      agentDispatchState(
        config,
        { delivered: 0, attempts: 0 },
        new Date(at.getTime() + 60000),
        at
      )
    ).toBe("waiting_for_next_turn");
    expect(
      agentDispatchState(
        config,
        { delivered: 0, attempts: 0 },
        new Date("2026-09-01"),
        at
      )
    ).toBe("ready");
  });
  it("qualifies only when all requested filters have actual evidence", () => {
    const c: any = {
      minScore: 70,
      industries: "software",
      geography: "",
      companySize: "",
      roles: "",
      keywords: "migration",
      signals: "cutover",
      exclusions: "",
    };
    const r: any = {
      score: 90,
      facts: [{ claim: "Observed", sourceUrl: "https://example.com" }],
      criteria: [
        { key: "industries", status: "matched", evidence: "Software" },
        { key: "keywords", status: "matched", evidence: "Migration" },
        { key: "signals", status: "unknown", evidence: "" },
      ],
    };
    expect(admissionReasons(c, r)).toContain("signals is not evidenced.");
    r.criteria[2] = {
      key: "signals",
      status: "matched",
      evidence: "cutover plan",
    };
    expect(admissionReasons(c, r)).toEqual([]);
    r.facts = [];
    expect(admissionReasons(c, r)).toContain("No cited company facts.");
  });
  it("bounds supported source payloads and disables optional contact/reaction work", () => {
    expect(boundedAgentInput(agentSourceIds[0], "migration", 90)).toMatchObject(
      { maxPagesPerQuery: 1, linkProspecting: { enable: false } }
    );
    expect(boundedAgentInput(agentSourceIds[1], "migration", 90)).toMatchObject(
      { maxPosts: 5, scrapeComments: false, scrapeReactions: false }
    );
    expect(boundedAgentInput(agentSourceIds[2], "platform", 90)).toMatchObject({
      maxItems: 5,
    });
    expect(boundedAgentInput(agentSourceIds[3], "software", 90)).toMatchObject({
      maxItems: 5,
      scraperMode: "short",
    });
    expect(boundedAgentInput(agentSourceIds[4], "migration", 90)).toMatchObject(
      { limit: 10, timeRange: "24h", includeCompanyDetails: false }
    );
    expect(() =>
      boundedAgentInput("arbitrary/tool", "migration", 90)
    ).toThrow();
    expect(agentRunPath(agentSourceIds[0])).toContain("maxTotalChargeUsd=0.5");
  });
  it("does not corrupt JSON when bounding large records, and observes rather than invents URLs", () => {
    const records = boundedRecords(
      Array.from({ length: 1000 }, () => ({
        website: "https://acme.example/",
        source: "https://acme.example/news",
        content: "x".repeat(40000),
      })),
      agentSourceIds[1]
    );
    expect(records).toHaveLength(10);
    expect(JSON.stringify(records[0]).length).toBeLessThan(4000);
    const urls = observedRecordUrls(records);
    expect(
      validateObservedCandidate(
        {
          website: "https://acme.example/",
          sourceUrl: "https://acme.example/news",
        },
        urls
      ).website
    ).toBe("https://acme.example/");
    expect(() =>
      validateObservedCandidate(
        {
          website: "https://guessed.example/",
          sourceUrl: "https://acme.example/news",
        },
        urls
      )
    ).toThrow("unobserved");
    expect(() =>
      validateObservedCandidate(
        {
          website: "https://linkedin.com/company/acme",
          sourceUrl: "https://acme.example/news",
        },
        new Set([
          "https://linkedin.com/company/acme",
          "https://acme.example/news",
        ])
      )
    ).toThrow("No verified company");
  });
  it("binds paid starts to exactly this tenant/agent/turn/tool/input", () => {
    vi.stubEnv("MANUS_JWT_SECRET", "agent-fixture-signing");
    vi.stubEnv("MANUS_PROJECT_ID", "fixture");
    const input = { maxItems: 5 };
    const marker = agentRunMarker(1, 2, 3, agentSourceIds[0], input);
    expect(marker).not.toBe(agentRunMarker(2, 2, 3, agentSourceIds[0], input));
    expect(marker).not.toBe(agentRunMarker(1, 3, 3, agentSourceIds[0], input));
    expect(marker).not.toBe(agentRunMarker(1, 2, 4, agentSourceIds[0], input));
    expect(marker).not.toContain("agent-fixture-signing");
  });
});

describe("review corrections", () => {
  it("requires exact source quote/date and a real original calendar date", () => {
    const quote = "We are migrating the platform before the next cutover.";
    const sources = [
      { url: "https://example.com/news", text: "2026-10-10 " + quote },
    ];
    const at = new Date("2026-10-12T12:00:00Z");
    expect(
      validOriginalSignalDate(
        "2026-10-10",
        quote,
        sources,
        "https://example.com/news",
        90,
        at
      )
    ).toBe(true);
    expect(
      validOriginalSignalDate(
        "2026-10-10",
        quote,
        sources,
        "https://other.example/news",
        90,
        at
      )
    ).toBe(false);
    expect(
      validOriginalSignalDate(
        "2026-10-10",
        quote,
        [
          { url: "https://example.com/news", text: quote },
          { url: "https://other.example/", text: "2026-10-10" },
        ],
        "https://example.com/news",
        90,
        at
      )
    ).toBe(false);
    expect(
      validOriginalSignalDate(
        "2026-02-29",
        quote,
        [{ url: "https://example.com/news", text: "2026-02-29 " + quote }],
        "https://example.com/news",
        365,
        at
      )
    ).toBe(false);
  });
  it("requires an actual provider event pricing declaration and honors explicit no-minimum metadata", () => {
    for (const p of [
      null,
      {},
      { pricingModel: "PAY_PER_EVENT" },
      {
        pricingModel: "PAY_PER_EVENT",
        minimalMaxTotalChargeUsd: 0.5,
        pricingPerEvent: {},
      },
      {
        pricingModel: "PAY_PER_EVENT",
        minimalMaxTotalChargeUsd: "",
        pricingPerEvent: { actorChargeEvents: {} },
      },
    ])
      expect(verifiedAgentPricing(p)).toBe(false);
    for (const min of [null, 0, 0.01, 0.5])
      expect(
        verifiedAgentPricing({
          pricingModel: "PAY_PER_EVENT",
          minimalMaxTotalChargeUsd: min,
          pricingPerEvent: {
            actorChargeEvents: { page: { eventPriceUsd: 0.01 } },
          },
        })
      ).toBe(true);
    expect(
      verifiedAgentPricing({
        pricingModel: "PAY_PER_EVENT",
        minimalMaxTotalChargeUsd: 5,
        pricingPerEvent: { actorChargeEvents: {} },
      })
    ).toBe(false);
  });
});
