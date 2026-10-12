import { describe, it, expect, vi } from "vitest";
const fixtures = vi.hoisted(() => ({
  assets: [
    {
      companyId: 1,
      name: "Proof board 01",
      key: "companies/1/references/proof-explorations-board-01.png",
      mime: "image/png",
      note: "Owner-supplied Proof exploration board, not the official logo.",
    },
    {
      companyId: 1,
      name: "Proof board 02",
      key: "companies/1/references/proof-explorations-board-02.png",
      mime: "image/png",
      note: "Owner-supplied Proof exploration board, paper and ink.",
    },
  ],
  page: {
    eyebrow: "A proposed starting point",
    headline: "A considered proposal for Example",
    subheadline: "Based on a researched need.",
    contextTitle: "The context",
    contextBody: "A supported observation.",
    benefits: [
      { title: "A clear scope", body: "An explicit pilot." },
      { title: "Evidence", body: "Checks with sources." },
    ],
    pilotTitle: "Start small",
    pilotBody: "Choose a single component.",
    steps: [
      { title: "Review", body: "Review scope." },
      { title: "Decide", body: "Decide next steps." },
    ],
    ctaText: "Discuss the pilot",
    closing: "A proposal, not an endorsement.",
    designNotes: "Paper and ink from references.",
    layout: "editorial",
  },
}));
vi.mock("./services/tenant", () => ({
  db: async () => ({
    select: () => ({ from: () => ({ where: async () => fixtures.assets }) }),
  }),
  scopedRow: vi.fn(),
}));
vi.mock("./storage", () => ({
  storageGetSignedUrl: vi.fn(
    async (key: string) => `https://storage.example.com/${key}?signed=temporary`
  ),
}));
vi.mock("./_core/llm", () => ({
  listLLMModels: async () => ({ data: [{ id: "gpt-5-mini" }] }),
  invokeLLM: vi.fn(async () => ({
    choices: [{ message: { content: JSON.stringify(fixtures.page) } }],
  })),
}));
import { generatePage } from "./services/generation";
import { invokeLLM } from "./_core/llm";
describe("stored organization visual references", () => {
  it("passes both original boards as signed visual inspiration without treating them as public page images", async () => {
    await generatePage(
      {
        companyName: "Example",
        research: { summary: "Grounded public research", facts: [] },
      } as any,
      {
        id: 1,
        name: "Proof",
        website: "https://reqproof.com/",
        brand: {
          offer: "Evidence-backed software",
          websiteInstructions: "Use official Proof branding",
          inspiration: [],
        },
      } as any
    );
    const request = vi.mocked(invokeLLM).mock.calls[0][0];
    const content = request.messages[1].content as any[];
    const images = content.filter(p => p.type === "image_url");
    expect(images).toHaveLength(2);
    expect(images.every(p => p.image_url.detail === "high")).toBe(true);
    expect(
      content
        .filter(p => p.type === "text")
        .some(p => p.text.includes("not the official logo"))
    ).toBe(true);
    expect(
      content.some(
        p => p.type === "text" && p.text.includes("historical_layout_only")
      )
    ).toBe(true);
    expect(
      content.some(
        p =>
          p.type === "text" &&
          p.text.includes(
            "saved company.brand logo and colors are authoritative"
          )
      )
    ).toBe(true);
    expect(request.response_format?.type).toBe("json_schema");
  });
});
