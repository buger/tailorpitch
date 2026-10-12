import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, it, expect } from "vitest";
import { observedProspectBrand } from "./services/prospectBrand";
import { PagePreview } from "../client/src/components/PagePreview";
import { pageContentSchema, pageTextContentSchema } from "../shared/domain";
import { personalizedPageOfferInstructions } from "../shared/pageOffer";
import { proofBrand } from "./services/tenant";
import fs from "node:fs";
beforeAll(() => {
  (globalThis as any).React = React;
});
const page = {
  eyebrow: "Using Proof in Hilbert",
  headline: "Use Proof at Hilbert. Stop rebuilding the review trail.",
  subheadline: "A proposed repository/check/review connection.",
  contextTitle: "A scoped first change",
  contextBody: "Current process is to be confirmed.",
  benefits: [
    { title: "Intent", body: "Agreed behavior." },
    { title: "Evidence", body: "Observed results." },
  ],
  pilotTitle: "One component",
  pilotBody: "Agree the scope first.",
  steps: [
    { title: "Discuss", body: "Confirm setup." },
    { title: "Review", body: "Inspect the record." },
  ],
  ctaText: "Discuss one change",
  closing: "A proposed first engagement.",
  layout: "editorial",
  designNotes: "Quiet paper and ink",
  prospectBrand: {
    name: "Hilbert",
    website: "https://hilberts.ai/",
    logoUrl: "/visuals/hilbert-logo.svg",
    logoSourceUrl: "https://hilberts.ai/",
  },
  workflow: {
    integrationTitle: "Hilbert’s change → Proof → your review",
    currentWork:
      "If results are collected manually, target that assembly work.",
    proposedFlow: [
      { title: "Your runners", body: "Confirm the actual setup." },
      {
        title: "Proof connects results",
        body: "Keep intent and check results together.",
      },
      { title: "Your review", body: "Accept or repair with evidence." },
    ],
    workRemoved: [
      { title: "Collecting check results", body: "One agreed record." },
      { title: "Rewriting reviewer context", body: "Shared scoped context." },
    ],
  },
};
describe("prospect-first offer generation", () => {
  it("applies the value equation and requires concrete job removal and integration, not generic hype", () => {
    expect(personalizedPageOfferInstructions).toContain("Alex Hormozi");
    expect(personalizedPageOfferInstructions).toContain(
      "What work would this take off"
    );
    expect(personalizedPageOfferInstructions).toContain("never invent");
  });
  it("keeps logos outside text model schema while allowing optional sourced branding on saved pages", () => {
    expect(pageTextContentSchema.shape).not.toHaveProperty("prospectBrand");
    expect(pageTextContentSchema.shape).toHaveProperty("workflow");
    expect(pageContentSchema.safeParse(page).success).toBe(true);
    expect(
      pageContentSchema.safeParse({
        ...page,
        prospectBrand: {
          ...page.prospectBrand,
          logoUrl: "javascript:alert(1)",
        },
      }).success
    ).toBe(false);
  });
  it("places real prospect identity, work removed and the integration before the contextual marketing section", () => {
    const html = renderToStaticMarkup(
      React.createElement(PagePreview, {
        content: pageContentSchema.parse(page),
        brand: proofBrand,
        companyName: "Proof",
        leadName: "Hilbert",
        ctaHref: "#contact",
      })
    );
    for (const text of [
      "Hilbert logo",
      "Collecting check results",
      "How it would fit",
      "Your runners",
    ])
      expect(html.indexOf(text)).toBeLessThan(html.indexOf('id="context"'));
    expect(html).toContain("Proposed workflow");
    expect(html).toContain('href="#contact"');
  });
  it("rejects customer/testimonial logos and assets from unrelated source sites", () => {
    const evidence: any = {
      logos: [
        {
          url: "https://cdn.example/client.svg",
          sourceUrl: "https://hilberts.ai/",
          label: "Customer testimonial logo",
        },
        {
          url: "https://cdn.example/unrelated.svg",
          sourceUrl: "https://other.example/",
          label: "Publisher-declared logo",
        },
        {
          url: "https://cdn.example/hilbert.svg",
          sourceUrl: "https://hilberts.ai/",
          label: "Publisher-declared logo (structured data)",
        },
      ],
    };
    expect(
      observedProspectBrand("Hilbert", "https://hilberts.ai/", evidence).logoUrl
    ).toBe("https://cdn.example/hilbert.svg");
    expect(
      observedProspectBrand("Hilbert", "https://hilberts.ai/", {
        ...evidence,
        logos: evidence.logos.slice(0, 2),
      }).logoUrl
    ).toBe("");
  });
  it("uses a new per-load event key, counts signed-in/admin previews, and does not reuse tab identities", () => {
    const hook = fs.readFileSync(
      "client/src/components/usePageOpen.ts",
      "utf8"
    );
    expect(hook).not.toContain("sessionStorage");
    expect(hook).toContain("crypto.randomUUID()");
    const admin = fs.readFileSync(
      "client/src/pages/WorkspaceContent.tsx",
      "utf8"
    );
    expect(admin).toContain('data.page.status === "published"');
    expect(admin).toContain("PublishedAdminPreview");
  });
});
