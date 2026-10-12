import { describe, it, expect, vi } from "vitest";
import { isPilotOwner, proofBrand } from "./services/tenant";
import { publicWebsite } from "./services/apify";
import {
  brandSchema,
  leadInputSchema,
  pageContentSchema,
} from "../shared/domain";
import { prepareInitialHtml, escapeHtml } from "./publicHtml";
import { appRouter } from "./routers";

const template =
  '<!doctype html><html><head><title>Placeholder</title></head><body><div id="root"></div></body></html>';
describe("company workflow boundaries", () => {
  it("only matches explicitly approved pilot owner emails", () => {
    expect(isPilotOwner({ email: "hello@reqproof.com" })).toBe(true);
    expect(isPilotOwner({ email: "HELLO@REQPROOF.COM" })).toBe(true);
    expect(isPilotOwner({ email: "leonsbox@gmail.com" })).toBe(true);
    expect(isPilotOwner({ email: " LEONSBOX@GMAIL.COM " })).toBe(true);
    expect(isPilotOwner({ email: "leonsbox+other@gmail.com" })).toBe(false);
    expect(isPilotOwner({ email: "other@gmail.com" })).toBe(false);
    expect(isPilotOwner({ email: "other@reqproof.com" })).toBe(false);
    expect(isPilotOwner({ email: null })).toBe(false);
  });
  it("requires HTTPS public website URLs without credentials or internal IPs", () => {
    expect(publicWebsite("https://reqproof.com/").hostname).toBe(
      "reqproof.com"
    );
    for (const url of [
      "http://example.com",
      "https://localhost",
      "https://127.0.0.1",
      "https://10.0.0.1",
      "https://a:b@example.com",
      "https://internal.local",
    ])
      expect(() => publicWebsite(url)).toThrow();
  });
  it("validates brand controls and preserves separate instructions", () => {
    const brand = brandSchema.parse(proofBrand);
    expect(brand.websiteInstructions).not.toBe(brand.outreachInstructions);
    expect(brand.inspiration[0].url).toBe("https://reqproof.com/brand");
    expect(brand.primaryColor).toBe("#24302a");
    expect(
      brandSchema.safeParse({ ...proofBrand, primaryColor: "red" }).success
    ).toBe(false);
  });
  it("rejects unauthenticated private API requests before any data access", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { headers: {} } as any,
      res: {} as any,
    });
    await expect(caller.workspace.get()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.leads.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.pages.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.intake.get()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.sources.catalog()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.sources.list({ icpId: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.mailbox.verifyApify()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.analysis.history()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      caller.operations.get({ id: "00000000-0000-4000-8000-000000000001" })
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      caller.analysis.company({ url: "https://example.com" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      caller.analysis.lead({
        url: "https://github.com/example/repo",
        icpId: null,
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("rejects unsafe or missing lead contacts and ICP linkage", () => {
    expect(
      leadInputSchema.safeParse({
        companyName: "Example",
        website: "https://example.com",
        icpId: null,
      }).success
    ).toBe(true);
    expect(
      leadInputSchema.safeParse({
        companyName: "Example",
        website: "https://example.com",
        email: "invented",
        icpId: null,
      }).success
    ).toBe(false);
  });
});
describe("public HTML", () => {
  it("provides meaningful initial landing content and metadata", async () => {
    const r = await prepareInitialHtml(template, "/");
    expect(r.status).toBe(200);
    expect(r.html).toContain("<h1");
    expect(r.html).toContain(
      "Find the right leads. Make every pitch personal."
    );
    expect(r.html).toContain('name="description"');
    expect(r.html).not.toContain('rel="canonical"');
  });
  it("keeps private app routes noindex without company data", async () => {
    const r = await prepareInitialHtml(template, "/app/leads/123");
    expect(r.status).toBe(200);
    expect(r.html).toContain("noindex,nofollow");
    expect(r.html).not.toContain("Software Intent Graph");
  });
  it("keeps onboarding and agent routes noindex without private data", async () => {
    for (const path of ["/app/onboarding", "/app/agents", "/app/sources"]) {
      const r = await prepareInitialHtml(template, path);
      expect(r.status).toBe(200);
      expect(r.html).toContain("noindex,nofollow");
      expect(r.html).not.toContain("Software Intent Graph");
    }
  });
  it("returns real 404 for unknown routes", async () => {
    const r = await prepareInitialHtml(template, "/missing");
    expect(r.status).toBe(404);
    expect(r.html).toContain("Page not found");
  });
  it("escapes untrusted dynamic content", () => {
    expect(escapeHtml('<img src=x onerror="test">')).toBe(
      "&lt;img src=x onerror=&quot;test&quot;&gt;"
    );
  });
});
