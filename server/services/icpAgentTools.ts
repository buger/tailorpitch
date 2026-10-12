import Ajv from "ajv";
import { createHash, createHmac } from "node:crypto";
import { ENV } from "../_core/env";
import { agentSourceIds, type IcpAgentConfig } from "../../shared/icpAgents";
import { discoveryInput } from "./apifyInputs";
import type { SourceActor } from "../../shared/sourcePlans";
import { normalizePublicUrl } from "./publicEvidence";
export function boundedAgentInput(
  actorId: string,
  query: string,
  recencyDays: number
) {
  const q = query.replace(/[\r\n]/g, " ").trim();
  if (q.length < 3 || q.length > 700)
    throw new Error("Use a bounded search phrase.");
  switch (actorId) {
    case "apify/google-search-scraper":
      return discoveryInput(q, 1, recencyDays);
    case "harvestapi/linkedin-post-search":
      return {
        searchQueries: [q],
        maxPosts: 5,
        postedLimit:
          recencyDays <= 7 ? "week" : recencyDays <= 30 ? "month" : "3months",
        sortBy: "date",
        startPage: 1,
        scrapeReactions: false,
        maxReactions: 0,
        scrapeComments: false,
        maxComments: 0,
        profileScraperMode: "short",
      };
    case "harvestapi/linkedin-job-search":
      return {
        jobTitles: [q],
        maxItems: 5,
        sortBy: "date",
        postedLimit: "week",
        page: 1,
      };
    case "harvestapi/linkedin-company-search":
      if (q.length > 300)
        throw new Error(
          "Company search phrase must be at most 300 characters."
        );
      return {
        searchQuery: q,
        maxItems: 5,
        scraperMode: "short",
        startPage: 1,
        takePages: 1,
      };
    case "fantastic-jobs/career-site-job-listing-api":
      return {
        descriptionSearch: [q],
        timeRange: "24h",
        limit: 10,
        includeCompanyDetails: false,
        includeAi: false,
        populateAiRemoteLocation: false,
        populateAiRemoteLocationDerived: false,
      };
    default:
      throw new Error("This discovery tool has no bounded agent adapter.");
  }
}
export function validatedAgentInput(
  actor: SourceActor,
  query: string,
  recencyDays: number
) {
  if (
    !actor.available ||
    !actor.schema ||
    !agentSourceIds.some(id => id === actor.id)
  )
    throw new Error("Choose an available bounded discovery tool.");
  const input = boundedAgentInput(actor.id, query, recencyDays);
  const schema = { ...actor.schema };
  delete schema.$schema;
  const valid = new Ajv({ strict: false, validateFormats: false }).compile(
    schema
  );
  if (!valid(input))
    throw new Error(
      `Provider schema changed for ${actor.name}; agent paused before execution.`
    );
  return input;
}
export function verifiedAgentPricing(pricing: Record<string, any> | null) {
  if (
    !pricing ||
    pricing.pricingModel !== "PAY_PER_EVENT" ||
    !pricing.pricingPerEvent?.actorChargeEvents ||
    !Object.hasOwn(pricing, "minimalMaxTotalChargeUsd")
  )
    return false;
  const minimum = pricing.minimalMaxTotalChargeUsd;
  // Apify explicitly publishes null when there is no actor minimum; this is not missing pricing.
  return (
    minimum === null ||
    (typeof minimum === "number" &&
      Number.isFinite(minimum) &&
      minimum >= 0 &&
      minimum <= 0.5)
  );
}
export function boundedToolCatalog(
  catalog: SourceActor[],
  config: IcpAgentConfig
) {
  return catalog.filter(
    a =>
      config.allowedActorIds.some(id => id === a.id) &&
      a.available &&
      a.role === "discovery" &&
      a.schema &&
      verifiedAgentPricing(a.pricing)
  );
}
export function agentRunPath(actorId: string) {
  if (!agentSourceIds.some(id => id === actorId))
    throw new Error("Tool not allowed.");
  return `actors/${actorId.replace("/", "~")}/runs?timeout=600&restartOnError=false&maxTotalChargeUsd=0.5`;
}
export function agentRunMarker(
  companyId: number,
  agentId: number,
  cycleId: number,
  actorId: string,
  input: unknown
) {
  if (!ENV.cookieSecret || !ENV.appId)
    throw new Error("Agent run signing is unavailable.");
  return createHmac("sha256", ENV.cookieSecret)
    .update(
      JSON.stringify([
        "icp-agent-v1",
        ENV.appId,
        companyId,
        agentId,
        cycleId,
        actorId,
        input,
      ])
    )
    .digest("hex");
}
export function agentConfigHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export function boundedRecords(raw: unknown, actorId: string): unknown[] {
  if (!Array.isArray(raw))
    throw new Error("Provider dataset was not a record list.");
  const items =
    actorId === "apify/google-search-scraper"
      ? raw.flatMap((x: any) =>
          Array.isArray(x?.organicResults) ? x.organicResults : []
        )
      : raw;
  const trim = (x: any, depth = 0): any => {
    if (depth > 5) return null;
    if (typeof x === "string") return x.slice(0, 3500);
    if (Array.isArray(x)) return x.slice(0, 10).map(v => trim(v, depth + 1));
    if (x && typeof x === "object")
      return Object.fromEntries(
        Object.entries(x)
          .slice(0, 60)
          .map(([k, v]) => [k, trim(v, depth + 1)])
      );
    return x;
  };
  return items.slice(0, 10).map(x => trim(x));
}
export function observedRecordUrls(records: unknown[]) {
  const result = new Set<string>();
  const visit = (x: unknown) => {
    if (typeof x === "string") {
      for (const raw of x.match(/https?:\/\/[^\s<>"'\\]+/g) ?? []) {
        try {
          result.add(normalizePublicUrl(raw.replace(/[),.;]+$/, "")));
        } catch {}
      }
    } else if (Array.isArray(x)) x.slice(0, 40).forEach(visit);
    else if (x && typeof x === "object") Object.values(x).forEach(visit);
  };
  records.forEach(visit);
  return result;
}
export function validateObservedCandidate(
  candidate: { website: string; sourceUrl: string },
  observed: Set<string>
) {
  const website = normalizePublicUrl(candidate.website),
    source = normalizePublicUrl(candidate.sourceUrl);
  if (!observed.has(website) || !observed.has(source))
    throw new Error(
      "Agent selected an unobserved website or source; no lead delivered."
    );
  const host = new URL(website).hostname.replace(/^www\./, "");
  if (
    [
      "linkedin.com",
      "google.com",
      "facebook.com",
      "twitter.com",
      "x.com",
      "indeed.com",
    ].some(h => host === h || host.endsWith("." + h))
  )
    throw new Error(
      "No verified company website in this result; no lead delivered."
    );
  return { website, source };
}
