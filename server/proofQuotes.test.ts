import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("./services/tenant", () => ({ db: vi.fn() }));
import { prepareInitialHtml } from "./publicHtml";
describe("owner-approved Proof quote attribution", () => {
  it("publishes both approved owner perspectives in initial landing HTML", async () => {
    const { html, status } = await prepareInitialHtml(
      '<html><head></head><body><div id="root"></div></body></html>',
      "/"
    );
    expect(status).toBe(200);
    expect(html.match(/Leonid Bugaev — Owner, Proof/g)).toHaveLength(2);
    expect(html).toContain(
      "We need a clear reason to speak to the right team."
    );
    expect(html).toContain("why this team, and why this conversation.");
    expect(html).not.toContain("Draft for Proof approval");
    expect(html).not.toContain("Not a verified testimonial");
    expect(html).not.toContain("Generated quote-style positioning");
  });
  it("keeps React attribution synchronized and retains honest proposal/demo boundaries", () => {
    const source = readFileSync(
      new URL("../client/src/pages/LandingPage.tsx", import.meta.url),
      "utf8"
    );
    expect(source.match(/<strong>Leonid Bugaev<\/strong>/g)).toHaveLength(2);
    expect(source.match(/<span>Owner, Proof<\/span>/g)).toHaveLength(2);
    expect(source).not.toContain("Draft for Proof approval");
    expect(source).not.toContain("Not a verified testimonial");
    expect(source).not.toContain("generated draft positioning");
    expect(source).toContain("No payment today");
  });
});
