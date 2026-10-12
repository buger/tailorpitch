import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, it, expect, vi } from "vitest";
import {
  pageContentSchema,
  pageTextContentSchema,
  safeUrl,
} from "../shared/domain";
import { DEFAULT_VISUAL_PROVIDER, quietHeroInput } from "../shared/visuals";
import { PagePreview } from "../client/src/components/PagePreview";
import { proofBrand } from "./services/tenant";
beforeAll(() => vi.stubGlobal("React", React));
const content = {
  eyebrow: "Prepared for an engineering team",
  headline: "One change. A clear acceptance record.",
  subheadline: "A proposed scoped first engagement.",
  contextTitle: "Why this may fit",
  contextBody: "The workflow needs to be discussed.",
  benefits: [
    { title: "Intent", body: "State the intended behavior." },
    { title: "Evidence", body: "Review scoped check results." },
  ],
  pilotTitle: "Start with one change",
  pilotBody: "Agree scope and terms first.",
  steps: [
    { title: "1. Discuss", body: "Bring one change." },
    { title: "2. Decide", body: "Review the agreed scope." },
  ],
  ctaText: "Discuss one change — https://reqproof.com/demo",
  closing: "A clearer next decision.",
  designNotes: "Quiet paper and ink",
  layout: "editorial" as const,
};
describe("polished personalized offer", () => {
  it("keeps old saved pages valid and their CTAs functional", () => {
    const parsed = pageContentSchema.parse(content);
    const html = renderToStaticMarkup(
      React.createElement(PagePreview, {
        content: parsed,
        brand: proofBrand,
        companyName: "Proof",
        leadName: "Example",
        ctaHref: "#contact",
      })
    );
    expect(html).toContain('href="#contact"');
    expect(html).toContain("Discuss one change");
    expect(html).not.toContain("— https://reqproof.com/demo");
    expect(html).toContain("The offer");
    expect(html).toContain("No prospect endorsement implied");
  });
  it("supports validated quiet media without allowing javascript, credential URLs or traversal", () => {
    for (const heroImageUrl of [
      "/visuals/proof-evidence-layers.webp",
      "https://example.com/image.webp",
      "/manus-storage/company/a.webp",
    ])
      expect(
        pageContentSchema.safeParse({ ...content, heroImageUrl }).success
      ).toBe(true);
    for (const heroImageUrl of [
      "javascript:alert(1)",
      "/visuals/../secret.env",
      "https://user:password@example.com/image.webp",
      "//evil.example/image.png",
    ])
      expect(
        pageContentSchema.safeParse({ ...content, heroImageUrl }).success
      ).toBe(false);
    expect(() => safeUrl.safeParse("not a url")).not.toThrow();
  });
  it("does not ask a text model to invent an image or its provenance", () => {
    expect(pageTextContentSchema.shape).not.toHaveProperty("heroImageUrl");
    expect(DEFAULT_VISUAL_PROVIDER).toBe("fal.ai");
    expect(quietHeroInput("An understated editorial hero")).toMatchObject({
      num_images: 1,
      aspect_ratio: "16:9",
      resolution: "2K",
      output_format: "webp",
    });
  });
  it("places the quiet artwork beside the readable outcome rather than as a noisy text backdrop", () => {
    const html = renderToStaticMarkup(
      React.createElement(PagePreview, {
        content: {
          ...content,
          heroImageUrl: "/visuals/proof-evidence-layers.webp",
          heroImageAlt: "Aligned translucent evidence layers",
        },
        brand: proofBrand,
        companyName: "Proof",
        leadName: "Example",
        preview: true,
      })
    );
    expect(html).toContain('class="pp-hero-copy"');
    expect(html).toContain('class="pp-hero-aside"');
    expect(html).toContain('alt="Aligned translucent evidence layers"');
    expect(html).toContain("Private preview");
  });
});
