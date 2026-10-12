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
    audience: "Research 100 accounts. Make your chosen 10 pitches personal.",
  },
  {
    id: "momentum",
    name: "Momentum",
    price: 249,
    researchedLeads: 300,
    personalizedPages: 30,
    credits: 600,
    audience:
      "Research 300 accounts. Put 30 personal pages behind your outreach.",
  },
  {
    id: "studio",
    name: "Studio",
    price: 499,
    researchedLeads: 700,
    personalizedPages: 70,
    credits: 1400,
    audience:
      "Research 700 accounts. Give 70 selected accounts their own page.",
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
