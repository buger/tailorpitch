import { readFileSync } from "node:fs";
import { describe, it, expect, vi } from "vitest";
import { marketing } from "../shared/marketing";
import { proposedPlans, proposedUsage } from "../shared/pricing";
vi.mock("./services/tenant", () => ({ db: vi.fn() }));
import { prepareInitialHtml } from "./publicHtml";
const template = '<html><head></head><body><div id="root"></div></body></html>';
describe("outcome-led landing story", () => {
  it("uses one outcome and clear price note across initial HTML and metadata", async () => {
    const { html } = await prepareInitialHtml(template, "/");
    expect(marketing.headline.join(" ")).toBe(
      "Find the right leads. Make every pitch personal."
    );
    expect(html).toContain(`<title>${marketing.title}</title>`);
    expect(html).toContain("100 researched leads + 10 personalized pages.");
    expect(html).toContain("No payment today");
    expect(html).toContain("No card");
  });
  it("explains proposition and ICPs before discovery, qualification and personalized output", async () => {
    const { html } = await prepareInitialHtml(template, "/");
    let cursor = -1;
    for (const id of [
      "the-work",
      "flow-offer",
      "flow-icp",
      "flow-find",
      "flow-qualify",
      "flow-page",
      "flow-outreach",
      "your-sources",
      "proof-pilot",
      "pricing",
      "questions",
      "early-access",
    ]) {
      const n = html.indexOf(`id="${id}"`);
      expect(n).toBeGreaterThan(cursor);
      cursor = n;
    }
  });
  it("keeps the React story aligned with the initial HTML story", () => {
    const source = readFileSync(
      new URL(
        "../client/src/components/landing/SignalLanding.tsx",
        import.meta.url
      ),
      "utf8"
    );
    expect(source).toContain("marketing.steps.map");
    expect(source).toContain("marketing.description");
    expect(source).toContain("marketing.headline");
    expect(source).toContain("marketing.primaryCta");
    expect(source).toContain("marketing.faqs");
    expect(source).toContain("Email list only. Workspace access is separate.");
  });
  it("does not turn the offer into a purchase or promise immediate admission/replies", () => {
    const answers = marketing.faqs.map(x => x.join(" ")).join(" ");
    expect(answers).toContain("cannot guarantee replies, meetings or sales");
    expect(answers).toContain(
      "does not automatically grant a company workspace"
    );
    expect(answers).toContain(
      "Optional third-party subscriptions and usage fees are separate"
    );
    expect(answers).toContain("not automatic social delivery");
    expect(answers).toContain("Managed Apify sourcing is included.");
    expect(answers).not.toMatch(
      /guaranteed meetings|limited spots|money.back|free trial/i
    );
  });
  it("keeps both starting allowances and original higher-plan arithmetic", () => {
    const focus = proposedPlans[0];
    expect(focus).toMatchObject({
      price: 99,
      researchedLeads: 100,
      personalizedPages: 10,
      credits: 200,
    });
    for (const plan of proposedPlans) {
      expect(proposedUsage(plan.researchedLeads, plan.personalizedPages)).toBe(
        plan.credits
      );
    }
  });
});
