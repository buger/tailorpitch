import { describe, it, expect, vi } from "vitest";
import { collectSignalEvidence } from "./services/signalEvidence";
import {
  observedRecordUrls,
  validateObservedCandidate,
} from "./services/icpAgentTools";
import { validOriginalSignalDate } from "../shared/icpAgents";
describe("Exact original ICP signal evidence", () => {
  it("reads the observed postmortem file, not the root README", async () => {
    const source = "https://github.com/acme/tool/blob/main/docs/postmortem.md";
    const text =
      "2026-10-01: A public security postmortem identifies missing fuzz coverage and asks for an audit.";
    const fetcher = vi.fn(async (url: string) => ({
      url,
      body: JSON.stringify({
        type: "file",
        encoding: "base64",
        content: Buffer.from(text).toString("base64"),
      }),
      type: "application/json",
    }));
    const evidence = await collectSignalEvidence(source, fetcher);
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://api.github.com/repos/acme/tool/contents/docs/postmortem.md?ref=main"
    );
    expect(evidence.sources).toEqual([{ url: source, text }]);
  });
  it("uses original issue publication, never updated_at or scrape date", async () => {
    const source = "https://github.com/acme/tool/issues/42",
      quote =
        "We need help auditing our new plugin sandbox before the release.";
    const fetcher = vi.fn(async (url: string) => ({
      url,
      body: JSON.stringify({
        html_url: source,
        title: "Audit before release",
        body: quote,
        created_at: "2026-10-01T15:00:00Z",
        updated_at: "2026-10-11T15:00:00Z",
      }),
      type: "application/json",
    }));
    const evidence = await collectSignalEvidence(source, fetcher);
    expect(evidence.sources[0].text).not.toContain("2026-10-11");
    expect(
      validOriginalSignalDate(
        "2026-10-01",
        quote,
        evidence.sources,
        source,
        90,
        new Date("2026-10-12T00:00:00Z")
      )
    ).toBe(true);
  });
  it("preserves declared publication metadata on the actual HTML source", async () => {
    const url = "https://example.com/security-postmortem";
    const evidence = await collectSignalEvidence(url, async () => ({
      url,
      type: "text/html",
      body: '<meta property="article:published_time" content="2026-10-01T10:00:00Z"><h1>Security incident review</h1><p>We are seeking maintainers to help with fuzzing our critical parser before another release.</p>',
    }));
    expect(evidence.sources[0].url).toBe(url);
    expect(evidence.sources[0].text).toContain("2026-10-01");
  });
  it("can map a sourced deep GitHub link to its exact project without inventing a website", () => {
    const deep = "https://github.com/acme/tool/issues/42";
    const observed = observedRecordUrls([{ url: deep }]);
    expect(observed.has("https://github.com/acme/tool")).toBe(true);
    expect(
      validateObservedCandidate(
        { website: "https://github.com/acme/tool", sourceUrl: deep },
        observed
      )
    ).toEqual({ website: "https://github.com/acme/tool", source: deep });
    expect(() =>
      validateObservedCandidate(
        { website: "https://acme.com", sourceUrl: deep },
        observed
      )
    ).toThrow();
  });
});
