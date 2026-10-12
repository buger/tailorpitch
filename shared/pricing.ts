// Marketing proposal only. Never use these values for billing or live entitlements.
export const proposedCreditCosts = {
  researchedLead: 1,
  personalizedPage: 10,
} as const;
export const proposedPlans = [
  {
    id: "focus",
    name: "Focus",
    price: 99,
    researchedLeads: 100,
    personalizedPages: 10,
    credits: 200,
    audience: "Find your first repeatable outbound motion.",
  },
  {
    id: "momentum",
    name: "Momentum",
    price: 249,
    researchedLeads: 300,
    personalizedPages: 30,
    credits: 600,
    audience: "Give a growing pipeline the personal treatment.",
  },
  {
    id: "studio",
    name: "Studio",
    price: 499,
    researchedLeads: 700,
    personalizedPages: 70,
    credits: 1400,
    audience: "More accounts. The same attention to context.",
  },
] as const;
export type ProposedPlanId = (typeof proposedPlans)[number]["id"];
export function proposedUsage(
  researchedLeads: number,
  personalizedPages: number
) {
  return (
    researchedLeads * proposedCreditCosts.researchedLead +
    personalizedPages * proposedCreditCosts.personalizedPage
  );
}
