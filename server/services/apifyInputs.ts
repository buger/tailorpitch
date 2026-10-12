import { APIFY_ACTORS } from "./apifyAccess";

export const APIFY_RUN_MAX_CHARGE_USD = 0.5;
export function discoveryInput(
  query: string,
  limit: number,
  recencyDays?: number
) {
  const normalized = query.replace(/[\r\n]+/g, " ").trim();
  if (!normalized || normalized.length > 1500)
    throw new Error("Enter a search query between 1 and 1500 characters.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new Error("Request between 1 and 100 candidates per manual search.");
  return {
    queries: normalized,
    maxPagesPerQuery: Math.ceil(limit / 10),
    languageCode: "en",
    ...(recencyDays
      ? {
          afterDate: new Date(Date.now() - recencyDays * 86400000)
            .toISOString()
            .slice(0, 10),
        }
      : {}),
    maximumLeadsEnrichmentRecords: 0,
    verifyLeadsEnrichmentEmails: false,
    aiOverview: { scrapeFullAiOverview: false },
    aiModeSearch: { enableAiMode: false },
    geminiSearch: { enableGemini: false },
    perplexitySearch: { enablePerplexity: false },
    chatGptSearch: { enableChatGpt: false },
    copilotSearch: { enableCopilot: false },
    websiteContentScraper: { enable: false },
    linkProspecting: { enable: false },
    focusOnPaidAds: false,
    saveHtml: false,
    saveHtmlToKeyValueStore: false,
  };
}
export function researchInput(website: string) {
  return {
    startUrls: [{ url: website }],
    maxCrawlPages: 4,
    maxResults: 4,
    maxCrawlDepth: 1,
    crawlerType: "playwright:adaptive",
    proxyConfiguration: { useApifyProxy: true },
    respectRobotsTxtFile: true,
    saveMarkdown: true,
    maxConcurrency: 2,
    initialConcurrency: 1,
    requestTimeoutSecs: 30,
    maxRequestRetries: 1,
    maxSessionRotations: 2,
    htmlTransformer: "readableTextIfPossible",
    useSitemaps: false,
    useLlmsTxt: false,
    summarize: false,
    blockMedia: true,
  };
}
export function actorRunPath(type: keyof typeof APIFY_ACTORS) {
  const params = new URLSearchParams({
    timeout: "600",
    restartOnError: "false",
    maxTotalChargeUsd: String(APIFY_RUN_MAX_CHARGE_USD),
  });
  return `actors/${APIFY_ACTORS[type]}/runs?${params}`;
}
