import { describe, it, expect, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({ request: vi.fn() }));

import {
  discoverSourceCatalog,
  sourceContextHash,
} from "./services/sourcePlans";
import {
  sourceAnswersSchema,
  sourceSelectionSchema,
  sourceActors,
} from "../shared/sourcePlans";
import { pricingSummary, sourceInputPreview } from "../shared/sourcePreview";
const answers = {
  outcome: "Audit one consequential component",
  signals: "Current migration compatibility cutover",
  accountFilters: "Developer tools; US and Europe",
  buyerRoles: "Head of Platform",
  exclusions: "Staff augmentation only",
  evidence: "Exact original statement URL and date",
  preferences: "Primary engineering pages",
  recencyDays: 90,
  dailyLimit: 3,
};
beforeEach(() => {
  mocks.request.mockReset();
});
describe("native source strategy", () => {
  it("requires meaningful discovery questions and conservative bounded pace", () => {
    expect(sourceAnswersSchema.safeParse(answers).success).toBe(true);
    expect(
      sourceAnswersSchema.safeParse({
        ...answers,
        signals: "",
        dailyLimit: 10000,
      }).success
    ).toBe(false);
    expect(
      sourceSelectionSchema.safeParse({
        actorId: "apify/google-search-scraper",
        query: "migration compatibility",
        optionalActorIds: [],
      }).success
    ).toBe(true);
  });
  it("separates specialist proposals from executable adapters and distinct contact stages", () => {
    expect(
      sourceActors
        .filter(a => a.adapter && a.role === "discovery")
        .map(a => a.id)
    ).toEqual(["apify/google-search-scraper"]);
    expect(
      sourceActors.find(a => a.id === "harvestapi/linkedin-company-employees")
        ?.role
    ).toBe("contacts");
    expect(
      sourceActors.find(a => a.id === "apify/website-content-crawler")?.role
    ).toBe("evidence");
  });
  it("invalidates old strategies when ICP or company offer changes", () => {
    expect(
      sourceContextHash({ offer: "A" }, { signals: "migration" })
    ).not.toBe(sourceContextHash({ offer: "B" }, { signals: "migration" }));
    expect(
      sourceContextHash({ offer: "A" }, { signals: "migration" })
    ).not.toBe(sourceContextHash({ offer: "A" }, { signals: "rollout" }));
  });
  it("discovers live schemas through bounded read-only calls without actor runs", async () => {
    mocks.request.mockImplementation(
      async (_companyId: number, path: string) =>
        path.endsWith("/builds/default")
          ? {
              data: {
                inputSchema: JSON.stringify({
                  type: "object",
                  properties: { maxItems: { type: "integer", maximum: 3 } },
                }),
              },
            }
          : {
              data: {
                id: "actor",
                isDeprecated: false,
                pricingInfos: [{ pricingModel: "PAY_PER_EVENT" }],
                modifiedAt: "2026-10-12",
                stats: { totalUsers: 100 },
              },
            }
    );
    const catalog = await discoverSourceCatalog(771, mocks.request);
    expect(catalog).toHaveLength(9);
    expect(catalog.every(a => a.available && a.schema)).toBe(true);
    expect(mocks.request).toHaveBeenCalledTimes(18);
    expect(
      mocks.request.mock.calls.every(
        ([, path, init]) => !path.includes("/runs") && !init
      )
    ).toBe(true);
  });
  it("marks unavailable schemas as unavailable instead of inventing access", async () => {
    mocks.request.mockRejectedValue(new Error("missing permission"));
    const catalog = await discoverSourceCatalog(772, mocks.request);
    expect(catalog.every(a => !a.available && a.schema === null)).toBe(true);
  });
  it("shows actual pricing metadata rather than universal pasted Starter rates", () => {
    const lines = pricingSummary({
      pricingPerEvent: {
        actorChargeEvents: {
          result: {
            eventTitle: "Post",
            isPrimaryEvent: true,
            eventTieredPricingUsd: {
              BRONZE: { tieredEventPriceUsd: 0.002 },
              GOLD: { tieredEventPriceUsd: 0.0015 },
            },
          },
        },
      },
    });
    expect(lines[0]).toContain("from $0.0015");
    expect(lines[0]).toContain("varies");
    expect(pricingSummary(null)[0]).not.toContain("free");
  });
  it("avoids dangerous per-source default volume and unauthorized email enrichment in previews", () => {
    expect(
      sourceInputPreview("memo23/apify-clutch-cheerio", "query", answers)
    ).toMatchObject({ maxItems: 3, maxItemsTotal: 3, enrichEmails: false });
    expect(
      sourceInputPreview("harvestapi/linkedin-post-search", "query", answers)
    ).toMatchObject({
      maxPosts: 3,
      profileScraperMode: "short",
      maxComments: 0,
      maxReactions: 0,
    });
    expect(
      sourceInputPreview(
        "fantastic-jobs/career-site-job-listing-api",
        "query",
        answers
      )
    ).toMatchObject({ limit: 10 });
    expect(
      sourceInputPreview(
        "harvestapi/linkedin-company-employees",
        "query",
        answers
      )
    ).toMatchObject({ maxItems: 3, maxItemsPerCompany: 3 });
  });
});
