import { z } from "zod";
import { icpSchema, type IcpCriteria } from "./domain";
export const ICP_REVIEW_LIMIT = 20;
export const reviewedIcpsSchema = z.array(icpSchema).max(ICP_REVIEW_LIMIT);
export type IcpReviewEntry = {
  id: string;
  criteria: IcpCriteria;
  selected: boolean;
  origin: "suggested" | "manual" | "reviewed";
};
export type IcpReviewErrors = Record<
  string,
  Partial<Record<keyof IcpCriteria, string>>
>;
export const emptyIcp: IcpCriteria = {
  name: "",
  industries: "",
  geography: "",
  companySize: "",
  roles: "",
  keywords: "",
  signals: "",
  exclusions: "",
  minScore: 70,
};
export function reviewEntries(
  criteria: IcpCriteria[],
  draftId: number,
  applied = false
): IcpReviewEntry[] {
  return criteria.map((item, index) => ({
    id: `review-${draftId}-${index}`,
    criteria: { ...item },
    selected: true,
    origin: applied ? "reviewed" : "suggested",
  }));
}
export function addReviewEntry(
  entries: IcpReviewEntry[],
  id: string
): IcpReviewEntry[] {
  if (
    entries.length >= ICP_REVIEW_LIMIT ||
    entries.some(entry => entry.id === id)
  )
    return entries;
  return [
    ...entries,
    { id, criteria: { ...emptyIcp }, selected: true, origin: "manual" },
  ];
}
export function updateReviewEntry(
  entries: IcpReviewEntry[],
  id: string,
  patch: Partial<IcpReviewEntry>
): IcpReviewEntry[] {
  return entries.map(entry =>
    entry.id === id ? { ...entry, ...patch, id: entry.id } : entry
  );
}
export function removeReviewEntry(entries: IcpReviewEntry[], id: string) {
  return entries.filter(entry => entry.id !== id);
}
export function restoreReviewEntry(
  entries: IcpReviewEntry[],
  entry: IcpReviewEntry,
  index: number
) {
  if (
    entries.length >= ICP_REVIEW_LIMIT ||
    entries.some(item => item.id === entry.id)
  )
    return entries;
  const next = [...entries];
  next.splice(Math.max(0, Math.min(index, next.length)), 0, entry);
  return next;
}
export function selectedReviewCriteria(entries: IcpReviewEntry[]) {
  return entries
    .filter(entry => entry.selected)
    .map(entry => ({
      ...entry.criteria,
      name: entry.criteria.name.trim(),
      keywords: entry.criteria.keywords.trim(),
    }));
}
export function validateReviewEntries(
  entries: IcpReviewEntry[]
): IcpReviewErrors {
  const errors: IcpReviewErrors = {};
  const names = new Map<string, string>();
  for (const entry of entries.filter(item => item.selected)) {
    const parsed = icpSchema.safeParse({
      ...entry.criteria,
      name: entry.criteria.name.trim(),
      keywords: entry.criteria.keywords.trim(),
    });
    if (!parsed.success)
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof IcpCriteria;
        if (!field) continue;
        (errors[entry.id] ??= {})[field] =
          field === "name"
            ? "Give this ICP a name (2–120 characters)."
            : field === "keywords"
              ? "Add targeting keywords (2–2,000 characters)."
              : field === "minScore"
                ? "Use a whole-number fit score from 0 to 100."
                : `${String(field)}: ${issue.message}`;
      }
    const name = entry.criteria.name.trim().toLowerCase();
    const previous = names.get(name);
    if (name && previous) {
      (errors[entry.id] ??= {}).name =
        "Use a different name for each selected ICP.";
      (errors[previous] ??= {}).name =
        "Use a different name for each selected ICP.";
    } else if (name) names.set(name, entry.id);
  }
  return errors;
}
