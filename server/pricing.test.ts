import { describe, it, expect } from "vitest";
import {
  proposedPlans,
  proposedUsage,
  proposedCreditCosts,
} from "../shared/pricing";
describe("illustrative marketing prices", () => {
  it("starts at $99 with 100 researched leads and 10 pages simultaneously included", () => {
    const p = proposedPlans[0];
    expect(p.price).toBe(99);
    expect(p.researchedLeads).toBe(100);
    expect(p.personalizedPages).toBe(10);
    expect(proposedUsage(p.researchedLeads, p.personalizedPages)).toBe(200);
    expect(p.credits).toBe(200);
  });
  it("keeps all proposed monthly allocations arithmetically consistent", () => {
    for (const p of proposedPlans)
      expect(proposedUsage(p.researchedLeads, p.personalizedPages)).toBe(
        p.credits
      );
    expect(proposedCreditCosts).toEqual({
      researchedLead: 1,
      personalizedPage: 10,
    });
    expect(proposedUsage(50, 5)).toBe(100);
  });
});
