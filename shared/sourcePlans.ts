import { z } from "zod";

export const sourceActors = [
  {
    id: "apify/google-search-scraper",
    name: "Google Search",
    role: "discovery",
    use: "Engineering articles, migration announcements, incident reports and named project evidence.",
    adapter: true,
  },
  {
    id: "apify/website-content-crawler",
    name: "Website evidence",
    role: "evidence",
    use: "Read selected public company pages and preserve qualification evidence.",
    adapter: true,
  },
  {
    id: "harvestapi/linkedin-post-search",
    name: "LinkedIn posts",
    role: "discovery",
    use: "People discussing active engineering initiatives and difficulties.",
    adapter: false,
  },
  {
    id: "fantastic-jobs/career-site-job-listing-api",
    name: "Career-site job descriptions",
    role: "discovery",
    use: "Find migration, billing and verification responsibilities inside job descriptions.",
    adapter: false,
  },
  {
    id: "harvestapi/linkedin-job-search",
    name: "LinkedIn jobs",
    role: "discovery",
    use: "Discover hiring initiatives by role, company and location.",
    adapter: false,
  },
  {
    id: "harvestapi/linkedin-company-search",
    name: "LinkedIn companies",
    role: "discovery",
    use: "Build company lists by industry, geography, keywords and size, then verify an active need.",
    adapter: false,
  },
  {
    id: "harvestapi/linkedin-company-employees",
    name: "Company employees",
    role: "contacts",
    use: "Identify engineering buyers and champions after company qualification.",
    adapter: false,
  },
  {
    id: "harvestapi/linkedin-profile-scraper",
    name: "Known-person enrichment",
    role: "contacts",
    use: "Enrich a person already identified through a signal, referral or company search.",
    adapter: false,
  },
  {
    id: "memo23/apify-clutch-cheerio",
    name: "Clutch consultancies",
    role: "discovery",
    use: "Find delivery-owning engineering consultancies and named project experience.",
    adapter: false,
  },
] as const;
export const sourceActorIds = sourceActors.map(actor => actor.id);
export const sourceQuestions = [
  {
    key: "outcome",
    label: "What engagement should the lead be a good fit for?",
    hint: "A bounded component audit, a migration decision, verification of an agent-written change, or a delivery partner engagement.",
  },
  {
    key: "signals",
    label: "What active signal makes this account worth contacting now?",
    hint: "A named rollout, cutover, correctness incident or current responsibility—not just a technology mention or company size.",
  },
  {
    key: "accountFilters",
    label: "Which companies belong in this cohort?",
    hint: "Industries, geography, company range, consequential product and relevant delivery responsibility. Company headcount is not engineering headcount.",
  },
  {
    key: "buyerRoles",
    label: "Who owns the engineering decision?",
    hint: "VP Engineering, platform or modernization lead, billing owner, staff engineer or delivery/practice leader.",
  },
  {
    key: "exclusions",
    label: "What should disqualify an account?",
    hint: "Generic advice, staffing-only agencies, no active project, irrelevant geography, or no responsibility for delivery.",
  },
  {
    key: "evidence",
    label: "What must the evidence prove before qualification?",
    hint: "An exact statement, original source and posting date, relevant initiative/stage and behavior at risk. Unknowns stay unknown.",
  },
  {
    key: "preferences",
    label: "Which sources should we prioritize or avoid?",
    hint: "Posts, job descriptions, engineering blogs, public GitHub, awards, case studies or partner directories. Personal data enrichment is optional and separate.",
  },
] as const;
export const sourceAnswersSchema = z.object({
  outcome: z.string().trim().min(5).max(3000),
  signals: z.string().trim().min(5).max(3000),
  accountFilters: z.string().trim().min(3).max(3000),
  buyerRoles: z.string().trim().min(3).max(1500),
  exclusions: z.string().max(2000),
  evidence: z.string().trim().min(5).max(3000),
  preferences: z.string().max(2000),
  recencyDays: z.number().int().min(1).max(365),
  dailyLimit: z.number().int().min(1).max(30),
});
export type SourceAnswers = z.infer<typeof sourceAnswersSchema>;
export const sourceRecommendationSchema = z.object({
  summary: z.string().min(1).max(3000),
  cohort: z.string().min(1).max(200),
  sources: z
    .array(
      z.object({
        actorId: z.string().max(200),
        role: z.enum(["discovery", "evidence", "contacts"]),
        why: z.string().min(1).max(1500),
        caveat: z.string().max(1500),
      })
    )
    .min(2)
    .max(6),
  queries: z.array(z.string().min(3).max(1500)).min(1).max(5),
  qualification: z.string().min(1).max(3000),
  alternatives: z.string().max(2000),
  unknowns: z.array(z.string().max(600)).max(10),
});
export type SourceRecommendation = z.infer<typeof sourceRecommendationSchema>;
export type SourceActor = {
  id: string;
  name: string;
  role: "discovery" | "evidence" | "contacts";
  use: string;
  adapter: boolean;
  available: boolean;
  modifiedAt: string | null;
  checkedAt: string;
  schema: Record<string, unknown> | null;
  pricing: Record<string, unknown> | null;
  stats: Record<string, unknown> | null;
  caveat: string;
};
export const sourceSelectionSchema = z.object({
  actorId: z.string().min(3).max(200),
  query: z.string().trim().min(3).max(1500),
  optionalActorIds: z.array(z.string().max(200)).max(5),
});
export type SourceSelection = z.infer<typeof sourceSelectionSchema>;
