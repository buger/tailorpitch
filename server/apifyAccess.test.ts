import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ integration: vi.fn(), fetch: vi.fn() }));
vi.mock("./services/credentials", () => ({
  getIntegration: mocks.integration,
}));
import {
  apifyRequest,
  getApifyStatus,
  verifyApify,
} from "./services/apifyAccess";
import {
  discoveryInput,
  researchInput,
  actorRunPath,
} from "./services/apifyInputs";

beforeEach(() => {
  vi.stubEnv("TAILORPITCH_APIFY_API_TOKEN", "test-owner-token");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.integration.mockReset();
  mocks.fetch.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("bundled Apify credential", () => {
  it("uses server-owned access without querying or exposing a company token", async () => {
    const status = await getApifyStatus(7);
    expect(status).toEqual({
      connected: true,
      managed: true,
      displayName: "Included with TailorPitch",
    });
    expect(JSON.stringify(status)).not.toContain("test-owner-token");
    expect(mocks.integration).not.toHaveBeenCalled();
  });
  it("never falls back to company credentials when the managed token is absent", async () => {
    vi.stubEnv("TAILORPITCH_APIFY_API_TOKEN", "");
    mocks.integration.mockResolvedValue({
      config: { token: "test-legacy-token" },
      row: { status: "connected", displayName: "Legacy" },
    });
    expect(await getApifyStatus(7)).toMatchObject({
      connected: false,
      managed: true,
    });
    expect(mocks.integration).not.toHaveBeenCalled();
  });
  it("rejects invalid company scope even with a configured shared token", async () => {
    await expect(getApifyStatus(0)).rejects.toThrow("scope");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("reports absent or disconnected credentials without false readiness", async () => {
    vi.stubEnv("TAILORPITCH_APIFY_API_TOKEN", "");
    mocks.integration.mockResolvedValue(null);
    expect(await getApifyStatus(7)).toMatchObject({ connected: false });
    await expect(apifyRequest(7, "users/me")).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    mocks.integration.mockResolvedValue({
      config: { token: "test-legacy" },
      row: { status: "disconnected" },
    });
    expect(await getApifyStatus(7)).toMatchObject({ connected: false });
  });
  it("forces bearer headers and refuses credential leakage to foreign paths", async () => {
    mocks.fetch.mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "account" } }))
    );
    await apifyRequest(7, "users/me", { headers: { Authorization: "wrong" } });
    const [url, options] = mocks.fetch.mock.calls[0];
    expect(String(url)).toBe("https://api.apify.com/v2/users/me");
    expect(options.headers.get("Authorization")).toBe(
      "Bearer test-owner-token"
    );
    expect(options.redirect).toBe("error");
    for (const path of [
      "https://evil.example/api",
      "../users/me",
      "users/me?token=bad",
    ])
      await expect(apifyRequest(7, path)).rejects.toThrow(
        "Invalid Apify API path"
      );
  });
  it("does not expose provider error bodies and treats creation ambiguity honestly", async () => {
    mocks.fetch.mockResolvedValue(
      new Response("private token detail", { status: 401 })
    );
    await expect(apifyRequest(7, "users/me")).rejects.toMatchObject({
      outcomeUnknown: false,
      httpStatus: 401,
    });
    mocks.fetch.mockResolvedValue(
      new Response("private provider detail", { status: 503 })
    );
    await expect(
      apifyRequest(7, "actors/a/runs", { method: "POST" })
    ).rejects.toMatchObject({ outcomeUnknown: true });
    mocks.fetch.mockResolvedValue(new Response("not-json"));
    await expect(
      apifyRequest(7, "actors/a/runs", { method: "POST" })
    ).rejects.toMatchObject({ outcomeUnknown: true });
  });
  it("verifies account and required actors without POST or scrape side effects", async () => {
    mocks.fetch.mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "verified" } }))
    );
    // Each fetch needs a fresh Response body.
    mocks.fetch.mockImplementation(
      async () => new Response(JSON.stringify({ data: { id: "verified" } }))
    );
    const result = await verifyApify(7);
    expect(result.actors).toHaveLength(2);
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
    expect(mocks.fetch.mock.calls.every(([, options]) => !options.method)).toBe(
      true
    );
    expect(JSON.stringify(result)).not.toContain("test-owner-token");
  });
});
describe("bounded Apify actor inputs", () => {
  it("bounds search pages and disables optional paid add-ons", () => {
    expect(discoveryInput(" one\nquery ", 1)).toMatchObject({
      queries: "one query",
      maxPagesPerQuery: 1,
      maximumLeadsEnrichmentRecords: 0,
      websiteContentScraper: { enable: false },
      focusOnPaidAds: false,
    });
    expect(discoveryInput("query", 100).maxPagesPerQuery).toBe(10);
    for (const limit of [0, 101, 1.5])
      expect(() => discoveryInput("query", limit)).toThrow();
    expect(() => discoveryInput(" ", 1)).toThrow();
  });
  it("bounds crawl depth, results, retries, concurrency and charge/runtime limits", () => {
    expect(researchInput("https://reqproof.com/")).toMatchObject({
      maxResults: 4,
      maxCrawlPages: 4,
      maxCrawlDepth: 1,
      maxConcurrency: 2,
      maxRequestRetries: 1,
      respectRobotsTxtFile: true,
      proxyConfiguration: { useApifyProxy: true },
    });
    expect(actorRunPath("discovery")).toContain("maxTotalChargeUsd=0.5");
    expect(actorRunPath("research")).toContain(
      "timeout=600&restartOnError=false"
    );
  });
});
