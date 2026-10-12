import { z } from "zod";
import type { IcpCriteria, Research } from "./domain";
export const agentSourceIds = [
  "apify/google-search-scraper",
  "harvestapi/linkedin-post-search",
  "harvestapi/linkedin-job-search",
  "harvestapi/linkedin-company-search",
  "fantastic-jobs/career-site-job-listing-api",
] as const;
export const icpAgentConfigSchema = z
  .object({
    dailyTarget: z.number().int().min(1).max(5).default(3),
    maxDailyAttempts: z.number().int().min(1).max(6).default(6),
    intervalMinutes: z.number().int().min(120).max(10080).default(240),
    timezone: z
      .string()
      .max(100)
      .refine(v => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, "Use an IANA timezone.")
      .default("UTC"),
    weekdaysOnly: z.boolean().default(true),
    startHour: z.number().int().min(0).max(23).default(9),
    endHour: z.number().int().min(1).max(24).default(17),
    allowedActorIds: z.array(z.enum(agentSourceIds)).min(1).max(5),
    instructions: z
      .string()
      .max(3000)
      .default(
        "Prefer fresh, attributable buying signals. Do not fill the quota with weak matches."
      ),
    execution: z.enum(["local", "hosted"]).default("local"),
  })
  .refine(v => v.endHour > v.startHour, "End hour must be after start hour.");
export type IcpAgentConfig = z.infer<typeof icpAgentConfigSchema>;
export const agentDecisionSchema = z.object({
  actorId: z.enum(agentSourceIds),
  query: z.string().trim().min(3).max(700),
  reason: z.string().min(5).max(1500),
});
export const pickedCandidateSchema = z.object({
  companyName: z.string().max(200),
  website: z.string().max(2000),
  sourceUrl: z.string().max(2000),
  signal: z.string().max(2000),
  reason: z.string().max(1500),
});
export function agentWindow(c: IcpAgentConfig, at = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: c.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (k: string) => p.find(x => x.type === k)?.value ?? "";
  const day = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = Number(get("hour"));
  return {
    day,
    allowed:
      (!c.weekdaysOnly || !["Sat", "Sun"].includes(get("weekday"))) &&
      hour >= c.startHour &&
      hour < c.endHour,
  };
}
export function agentDispatchState(
  c: IcpAgentConfig,
  counts: { delivered: number; attempts: number },
  next: Date | null,
  at = new Date()
) {
  if (counts.delivered >= c.dailyTarget) return "daily_delivery_cap";
  if (counts.attempts >= c.maxDailyAttempts) return "daily_attempt_cap";
  if (!agentWindow(c, at).allowed) return "outside_working_hours";
  if (next && next > at) return "waiting_for_next_turn";
  return "ready";
}
export function admissionReasons(criteria: IcpCriteria, r: Research) {
  const reasons: string[] = [];
  if (r.score < criteria.minScore)
    reasons.push(`Fit ${r.score}/100 is below ${criteria.minScore}.`);
  if (!r.facts.length) reasons.push("No cited company facts.");
  for (const key of [
    "industries",
    "geography",
    "companySize",
    "roles",
    "keywords",
    "signals",
    "exclusions",
  ] as const) {
    if (
      criteria[key].trim() &&
      !r.criteria.some(
        x => x.key === key && x.status === "matched" && x.evidence.trim()
      )
    )
      reasons.push(`${key} is not evidenced.`);
  }
  if (r.criteria.some(x => x.status === "not_matched"))
    reasons.push("An ICP condition was not matched.");
  return reasons;
}
export function recentAgentDays(timezone: string, at = new Date()) {
  return Array.from(
    { length: 7 },
    (_, i) =>
      agentWindow(
        {
          ...icpAgentConfigSchema.parse({
            allowedActorIds: [agentSourceIds[0]],
          }),
          timezone,
        },
        new Date(at.getTime() - i * 86400000)
      ).day
  ).reverse();
}

export function validOriginalSignalDate(
  value: string,
  quote: string,
  sources: { url: string; text: string }[],
  sourceUrl: string,
  recencyDays: number,
  now = new Date()
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || quote.length < 20) return false;
  const date = new Date(value + "T00:00:00Z");
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    return false;
  if (
    date.getTime() > now.getTime() + 86400000 ||
    now.getTime() - date.getTime() > recencyDays * 86400000
  )
    return false;
  return sources.some(
    s => s.url === sourceUrl && s.text.includes(quote) && s.text.includes(value)
  );
}
