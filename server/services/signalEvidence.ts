import { load } from "cheerio";
import type { AnalysisEvidence } from "../../shared/analysis";
import {
  normalizePublicUrl,
  publicFetch,
  extractHtml,
  githubRepo,
} from "./publicEvidence";
function textEvidence(url: string, text: string): AnalysisEvidence {
  if (text.trim().length < 50)
    throw new Error("No readable original signal text.");
  return {
    sources: [{ url, text: text.slice(0, 24000) }],
    copyExamples: [],
    logos: [],
    styleClues: [],
    links: [],
  };
}
export async function collectSignalEvidence(
  value: string,
  fetcher: typeof publicFetch = publicFetch
): Promise<AnalysisEvidence> {
  const url = normalizePublicUrl(value),
    u = new URL(url),
    repo = githubRepo(url),
    parts = u.pathname.split("/").filter(Boolean);
  if (repo && parts[2] === "blob" && parts.length >= 5) {
    try {
      const ref = decodeURIComponent(parts[3]);
      const path = parts
        .slice(4)
        .map(x => encodeURIComponent(decodeURIComponent(x)))
        .join("/");
      const response = await fetcher(
        `https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/${path}?ref=${encodeURIComponent(ref)}`
      );
      const data = JSON.parse(response.body);
      if (
        data.type === "file" &&
        data.encoding === "base64" &&
        typeof data.content === "string"
      )
        return textEvidence(
          url,
          Buffer.from(data.content, "base64").toString("utf8")
        );
    } catch {
      /* Read the exact public page below if API access is unavailable. */
    }
  }
  if (
    repo &&
    ["issues", "pull"].includes(parts[2]) &&
    /^\d+$/.test(parts[3] ?? "")
  ) {
    try {
      const response = await fetcher(
        `https://api.github.com/repos/${repo.owner}/${repo.repo}/issues/${parts[3]}`
      );
      const data = JSON.parse(response.body);
      if (
        data.html_url &&
        normalizePublicUrl(data.html_url) === url &&
        typeof data.body === "string"
      ) {
        const publication =
          typeof data.created_at === "string" ? data.created_at : "";
        return textEvidence(
          url,
          `${data.title ?? ""}\n${data.body}\nOriginal GitHub issue publication date (API created_at): ${publication}`
        );
      }
    } catch {
      /* Read the exact public issue page below if API access is unavailable. */
    }
  }
  const response = await fetcher(url);
  if (!response.type.includes("html")) {
    if (/text\/(plain|markdown)/.test(response.type))
      return textEvidence(url, response.body);
    throw new Error("Original signal is not readable public text.");
  }
  const evidence = extractHtml(response.body, url);
  const $ = load(response.body);
  const dates: string[] = [];
  for (const key of ["article:published_time", "datePublished", "pubdate"]) {
    const v = $(`meta[property="${key}"],meta[name="${key}"]`)
      .first()
      .attr("content");
    if (v) dates.push(`${key}: ${v}`);
  }
  $('[itemprop="datePublished"]').each((_i, e) => {
    const v = $(e).attr("datetime") ?? $(e).attr("content") ?? $(e).text();
    if (v) dates.push(`Publisher datePublished: ${v}`);
  });
  if (dates.length)
    evidence.sources[0].text +=
      "\nPublisher original publication metadata (not crawl or update time):\n" +
      dates.join("\n");
  return evidence;
}
