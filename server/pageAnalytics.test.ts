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
describe("inclusive published-page views", () => {
  it("counts owner/admin, visitor and rendered automation views", () => {
    expect(shouldCountPageOpen({ id: 1 }, "Chrome")).toBe(true);
    expect(shouldCountPageOpen(null, "Googlebot")).toBe(true);
    expect(shouldCountPageOpen(null, "Slackbot preview")).toBe(true);
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
  it("journals only event key with exact page/company attribution, then increments", async () => {
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
  it("retry with the same event key does not double-count", async () => {
    const d = database({ id: 4, companyId: 3 }, 0);
    expect(await recordPageOpen("token", "visit", d.load)).toEqual({
      recorded: false,
    });
    expect(d.updateWhere).not.toHaveBeenCalled();
  });
});
