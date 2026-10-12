import { describe, it, expect } from "vitest";
import { companyAnalysisSchema } from "../shared/analysis";
import {
  ICP_REVIEW_LIMIT,
  addReviewEntry,
  emptyIcp,
  removeReviewEntry,
  restoreReviewEntry,
  reviewEntries,
  reviewedIcpsSchema,
  selectedReviewCriteria,
  updateReviewEntry,
  validateReviewEntries,
} from "../shared/icpReview";
const profile = (name: string) => ({
  ...emptyIcp,
  name,
  keywords: "developer tools",
});
describe("editable onboarding ICP review", () => {
  it("labels website suggestions and creates selected editable manual profiles", () => {
    const entries = reviewEntries([profile("First")], 9);
    expect(entries[0].origin).toBe("suggested");
    const next = addReviewEntry(entries, "manual");
    expect(next[1]).toMatchObject({
      id: "manual",
      selected: true,
      origin: "manual",
      criteria: { name: "", keywords: "", minScore: 70 },
    });
    expect(entries).toHaveLength(1);
  });
  it("removing a middle row does not change any other identity, criteria or selection", () => {
    const entries = reviewEntries(
      [profile("First"), profile("Second"), profile("Third")],
      9
    );
    const changed = updateReviewEntry(entries, entries[2].id, {
      selected: false,
    });
    const next = removeReviewEntry(changed, entries[1].id);
    expect(next.map(x => x.id)).toEqual([entries[0].id, entries[2].id]);
    expect(next[1].selected).toBe(false);
    expect(next[1].criteria.name).toBe("Third");
  });
  it("undo restores the complete edited row at its original position", () => {
    const entries = reviewEntries([profile("First"), profile("Second")], 9);
    const saved = {
      ...entries[0],
      selected: false,
      criteria: profile("Edited first"),
    };
    const removed = removeReviewEntry([saved, entries[1]], saved.id);
    expect(restoreReviewEntry(removed, saved, 0)).toEqual([saved, entries[1]]);
  });
  it("validates only included profiles and trims accepted names/keywords", () => {
    let entries = addReviewEntry(reviewEntries([profile("First")], 9), "blank");
    expect(validateReviewEntries(entries).blank).toHaveProperty("name");
    expect(validateReviewEntries(entries).blank).toHaveProperty("keywords");
    entries = updateReviewEntry(entries, "blank", { selected: false });
    expect(validateReviewEntries(entries)).toEqual({});
    expect(selectedReviewCriteria(entries)).toHaveLength(1);
    const spaces = reviewEntries(
      [{ ...profile("  Useful ICP  "), keywords: "  engineering agents  " }],
      10
    );
    expect(selectedReviewCriteria(spaces)[0]).toMatchObject({
      name: "Useful ICP",
      keywords: "engineering agents",
    });
  });
  it("allows applying brand with zero selected ICPs", () => {
    const entries = reviewEntries([profile("First")], 9);
    const none = updateReviewEntry(entries, entries[0].id, { selected: false });
    expect(selectedReviewCriteria(none)).toEqual([]);
    expect(reviewedIcpsSchema.safeParse([]).success).toBe(true);
    expect(removeReviewEntry(entries, entries[0].id)).toEqual([]);
  });
  it("flags whitespace-only names, invalid keywords, duplicate names and non-integer scores inline", () => {
    const entries = reviewEntries(
      [
        profile(" First "),
        profile("first"),
        { ...profile(" "), keywords: " ", minScore: 3.5 },
      ],
      9
    );
    const errors = validateReviewEntries(entries);
    expect(errors[entries[0].id].name).toMatch(/different name/);
    expect(errors[entries[1].id].name).toMatch(/different name/);
    expect(errors[entries[2].id]).toHaveProperty("name");
    expect(errors[entries[2].id]).toHaveProperty("keywords");
    expect(errors[entries[2].id]).toHaveProperty("minScore");
  });
  it("supports more than three manual review profiles while retaining the separate AI suggestion limit", () => {
    const five = Array.from({ length: 5 }, (_, i) => profile(`ICP ${i}`));
    expect(reviewedIcpsSchema.safeParse(five).success).toBe(true);
    expect(companyAnalysisSchema.shape.icps.safeParse(five).success).toBe(
      false
    );
  });
  it("enforces the same 20-profile cap in the editor and apply schema, without duplicate IDs", () => {
    const entries = reviewEntries(
      Array.from({ length: ICP_REVIEW_LIMIT }, (_, i) => profile(`ICP ${i}`)),
      9
    );
    expect(addReviewEntry(entries, "extra")).toBe(entries);
    expect(restoreReviewEntry(entries, { ...entries[0], id: "extra" }, 0)).toBe(
      entries
    );
    expect(
      reviewedIcpsSchema.safeParse([
        ...entries.map(x => x.criteria),
        profile("Extra"),
      ]).success
    ).toBe(false);
    expect(addReviewEntry(entries.slice(0, 1), entries[0].id)).toHaveLength(1);
  });
});
