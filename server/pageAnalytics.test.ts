import { describe, it, expect, vi } from "vitest";
import { recordPageOpen, shouldCountPageOpen } from "./services/pageAnalytics";
function database(page: any, affectedRows = 1) {
  const insertValues = vi.fn().mockResolvedValue([{ affectedRows }]);
  const updateWhere = vi.fn().mockResolvedValue([]);
  const query: any = {
    from: () => query,
    where: () => query,
    for: vi.fn().mockResolvedValue(page ? [page] : []),
  };
  const tx: any = {
    select: () => query,
    insert: () => ({ ignore: () => ({ values: insertValues }) }),
    update: () => ({ set: () => ({ where: updateWhere }) }),
  };
  return {
    load: vi.fn().mockResolvedValue({ transaction: (fn: any) => fn(tx) }),
    insertValues,
    updateWhere,
    query,
  };
}
describe("anonymous published-page analytics", () => {
  it("excludes authenticated previews and recognized crawlers", () => {
    expect(shouldCountPageOpen({ id: 1 }, "Chrome")).toBe(false);
    expect(shouldCountPageOpen(null, "Googlebot")).toBe(false);
    expect(shouldCountPageOpen(null, "Slackbot preview")).toBe(false);
    expect(
      shouldCountPageOpen(null, "Mozilla/5.0 Chrome/120 Safari/537.36")
    ).toBe(true);
  });
  it("does not record missing or unpublished pages", async () => {
    const d = database(null);
    expect(await recordPageOpen("missing", "key", d.load)).toEqual({
      recorded: false,
    });
    expect(d.insertValues).not.toHaveBeenCalled();
  });
  it("journals only tab key with exact page/company attribution, then increments", async () => {
    const d = database({ id: 4, companyId: 3 });
    expect(await recordPageOpen("token", "visit", d.load)).toEqual({
      recorded: true,
    });
    expect(d.insertValues).toHaveBeenCalledWith({
      pageId: 4,
      companyId: 3,
      visitKey: "visit",
    });
    expect(d.updateWhere).toHaveBeenCalledTimes(1);
    expect(d.query.for).toHaveBeenCalledWith("update");
  });
  it("duplicate tab key does not increment opens", async () => {
    const d = database({ id: 4, companyId: 3 }, 0);
    expect(await recordPageOpen("token", "visit", d.load)).toEqual({
      recorded: false,
    });
    expect(d.updateWhere).not.toHaveBeenCalled();
  });
});
