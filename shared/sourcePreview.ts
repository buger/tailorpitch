import type { SourceActor, SourceAnswers } from "./sourcePlans";
export function pricingSummary(pricing: Record<string, any> | null) {
  if (!pricing)
    return [
      "Platform usage-based pricing; no actor event schedule was supplied. Verify provider terms before activation.",
    ];
  const events = pricing.pricingPerEvent?.actorChargeEvents;
  if (!events || typeof events !== "object")
    return [
      `Pricing model: ${pricing.pricingModel ?? "unspecified"}. Inspect the live schedule before activation.`,
    ];
  return Object.values(events)
    .filter(
      (event: any) =>
        event.isPrimaryEvent ||
        !/add-on|reaction|comment|email|overview|gemini|gpt|copilot|perplexity/i.test(
          event.eventTitle ?? ""
        )
    )
    .slice(0, 4)
    .map((event: any) => {
      const values = event.eventTieredPricingUsd
        ? Object.values(event.eventTieredPricingUsd)
            .map((tier: any) => tier.tieredEventPriceUsd)
            .filter((v): v is number => typeof v === "number")
        : typeof event.eventPriceUsd === "number"
          ? [event.eventPriceUsd]
          : [];
      const rate = values.length
        ? `${Math.min(...values) === Math.max(...values) ? "" : "from "}$${Math.min(
            ...values
          )
            .toFixed(5)
            .replace(/0+$/, "")
            .replace(/\.$/, "")} per event`
        : "rate unavailable";
      return `${event.eventTitle}: ${rate}${event.eventTieredPricingUsd ? "; varies by Apify plan" : ""}.`;
    });
}
export function sourceInputPreview(
  actorId: string,
  query: string,
  answers: SourceAnswers
) {
  const limit = Math.min(answers.dailyLimit, 3);
  const afterDate = new Date(Date.now() - answers.recencyDays * 86400000)
    .toISOString()
    .slice(0, 10);
  switch (actorId) {
    case "apify/google-search-scraper":
      return {
        queries: query,
        maxPagesPerQuery: 1,
        afterDate,
        maximumLeadsEnrichmentRecords: 0,
        verifyLeadsEnrichmentEmails: false,
        aiOverview: { scrapeFullAiOverview: false },
        aiModeSearch: { enableAiMode: false },
        websiteContentScraper: { enable: false },
        linkProspecting: { enable: false },
        focusOnPaidAds: false,
      };
    case "apify/website-content-crawler":
      return {
        startUrls: [{ url: "https://QUALIFIED-COMPANY.example/" }],
        maxCrawlPages: 4,
        maxResults: 4,
        maxCrawlDepth: 1,
        respectRobotsTxtFile: true,
        proxyConfiguration: { useApifyProxy: true },
        summarize: false,
      };
    case "harvestapi/linkedin-post-search":
      return {
        searchQueries: [query],
        maxPosts: limit,
        postedLimit: "month",
        profileScraperMode: "short",
        maxReactions: 0,
        maxComments: 0,
      };
    case "fantastic-jobs/career-site-job-listing-api":
      return {
        descriptionSearch: [query],
        limit: 10,
        timeRange: "7d",
        datePostedAfter: afterDate,
      };
    case "harvestapi/linkedin-job-search":
      return {
        jobTitles: [query],
        maxItems: limit,
        postedLimit: "month",
        sortBy: "date",
      };
    case "harvestapi/linkedin-company-search":
      return {
        searchQuery: query.slice(0, 300),
        maxItems: limit,
        scraperMode: "full",
        takePages: 1,
      };
    case "harvestapi/linkedin-company-employees":
      return {
        companies: ["https://www.linkedin.com/company/QUALIFIED-COMPANY/"],
        jobTitles: answers.buyerRoles
          .split(/[,;\n]/)
          .map(s => s.trim())
          .filter(Boolean)
          .slice(0, 5),
        maxItems: limit,
        maxItemsPerCompany: limit,
        profileScraperMode: "Short ($4 per 1k)",
      };
    case "harvestapi/linkedin-profile-scraper":
      return {
        queries: ["https://www.linkedin.com/in/IDENTIFIED-PERSON/"],
        profileScraperMode: "Profile details no email ($4 per 1k)",
      };
    case "memo23/apify-clutch-cheerio":
      return {
        startUrls: [{ url: "https://clutch.co/developers" }],
        maxItems: limit,
        maxItemsTotal: limit,
        enrichEmails: false,
      };
    default:
      return null;
  }
}
