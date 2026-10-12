import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { marketing } from "../shared/marketing";

describe("landing workflow numbering", () => {
  const source = readFileSync(
    new URL(
      "../client/src/components/landing/SignalLanding.tsx",
      import.meta.url
    ),
    "utf8"
  );
  const overview = source.slice(
    source.indexOf("function PipelineOverview()"),
    source.indexOf(
      "function ",
      source.indexOf("function PipelineOverview()") + 10
    )
  );
  it("starts the four-step lead pipeline at 01 instead of 03", () => {
    expect([...overview.matchAll(/number: "(\d+)"/g)].map(x => x[1])).toEqual([
      "01",
      "02",
      "03",
      "04",
    ]);
    expect([...overview.matchAll(/name: "([^"]+)"/g)].map(x => x[1])).toEqual([
      "Find",
      "Qualify",
      "Personal page",
      "Outreach",
    ]);
  });
  it("distinguishes business setup from the lead pipeline", () => {
    expect(overview).toContain("FIRST, SET UP YOUR BUSINESS");
    expect(overview).toContain("THEN, YOUR FOUR-STEP LEAD PIPELINE");
    expect(overview).not.toContain("signal-foundation-number");
  });
  it("retains the full six-step walkthrough including initial offer and ICP setup", () => {
    expect(marketing.steps).toHaveLength(6);
    expect(source).toContain("marketing.steps.map");
    expect(source).toContain('aria-label="The six steps of TailorPitch"');
  });
});
