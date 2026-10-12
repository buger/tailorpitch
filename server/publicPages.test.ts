import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  row: null as any,
  insert: vi.fn(),
  finish: () => Promise.resolve(),
}));
vi.mock("./services/tenant", async importOriginal => {
  const original = await importOriginal<any>();
  return {
    ...original,
    db: async () => ({
      select: () => {
        const q: any = {
          from: () => q,
          innerJoin: () => q,
          where: () => q,
          limit: async () => (state.row ? [state.row] : []),
        };
        return q;
      },
      insert: () => ({
        values: (value: any) => {
          state.insert(value);
          return { onDuplicateKeyUpdate: () => state.finish() };
        },
      }),
    }),
  };
});
import { appRouter } from "./routers";
import { prepareInitialHtml } from "./publicHtml";
const token = "c".repeat(48);
const caller = () =>
  appRouter.createCaller({
    user: null,
    req: { headers: {}, ip: "fixture" } as any,
    res: {} as any,
  });
beforeEach(() => {
  state.row = null;
  state.insert.mockClear();
  state.finish = () => Promise.resolve();
});
describe("public personalized page lifecycle", () => {
  it("missing or unpublished page remains unavailable, including HTML", async () => {
    await expect(caller().public.page({ token })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    const page = await prepareInitialHtml(
      '<head><title>x</title></head><div id="root"></div>',
      `/p/${token}`
    );
    expect(page.status).toBe(404);
    expect(state.insert).not.toHaveBeenCalled();
  });
  it("published page reads do not require login or expose private research", async () => {
    state.row = {
      page: {
        id: 3,
        companyId: 2,
        content: { headline: "Example" },
        brandSnapshot: {
          websiteInstructions: "private site instructions",
          outreachInstructions: "private message rules",
          voice: "private voice",
          approvedClaims: "internal claim notes",
          inspiration: [{ url: "https://example.com", note: "private" }],
        },
        title: "A proposal",
        shareToken: token,
      },
      company: { name: "Example seller", website: "https://example.com" },
      lead: { companyName: "Example buyer" },
    };
    const result = await caller().public.page({ token });
    expect(result.page.title).toBe("A proposal");
    expect(result).not.toHaveProperty("research");
    expect(result.page).not.toHaveProperty("companyId");
    expect(result.page.brandSnapshot.websiteInstructions).toBe("");
    expect(result.page.brandSnapshot.inspiration).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("private site instructions");
  });
  it("saves consented CTA emails to exact company and page only after database acknowledgment", async () => {
    state.row = { page: { id: 3, companyId: 2 } };
    let finish!: () => void;
    state.finish = () =>
      new Promise<void>(r => {
        finish = r;
      });
    let done = false;
    const result = caller()
      .public.subscribe({
        token,
        email: "Buyer@example.com",
        consent: true,
        website: "",
      })
      .then(r => {
        done = true;
        return r;
      });
    await vi.waitFor(() => expect(state.insert).toHaveBeenCalled());
    expect(done).toBe(false);
    expect(state.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 2,
        pageId: 3,
        email: "buyer@example.com",
        source: "page-3",
        consentText: expect.stringContaining("explicit request"),
      })
    );
    finish();
    expect(await result).toEqual({ success: true });
  });
  it("requires consent and rejects invalid email before persistence", async () => {
    await expect(
      caller().public.subscribe({
        token,
        email: "invalid",
        consent: true,
        website: "",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller().public.subscribe({
        token,
        email: "buyer@example.com",
        consent: false as any,
        website: "",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.insert).not.toHaveBeenCalled();
  });
  it("never accepts a signup for missing or private page", async () => {
    await expect(
      caller().public.subscribe({
        token,
        email: "buyer@example.com",
        consent: true,
        website: "",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(state.insert).not.toHaveBeenCalled();
  });
});
