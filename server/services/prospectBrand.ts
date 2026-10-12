import type { PageContent } from "../../shared/domain";
import type { AnalysisEvidence } from "../../shared/analysis";
import { collectEvidence } from "./publicEvidence";
export function observedProspectBrand(
  name: string,
  website: string,
  evidence: AnalysisEvidence
): NonNullable<PageContent["prospectBrand"]> {
  const host = new URL(website).hostname.replace(/^www\./, "");
  const eligible = evidence.logos.filter(logo => {
    try {
      return (
        new URL(logo.sourceUrl).hostname.replace(/^www\./, "") === host &&
        !/testimonial|customer|client|partner/i.test(logo.label)
      );
    } catch {
      return false;
    }
  });
  const logo =
    eligible.find(x => /publisher-declared logo/i.test(x.label)) ??
    eligible.find(x => /logo|brand/i.test(x.label) && !/icon/i.test(x.label));
  return {
    name,
    website,
    logoUrl: logo?.url ?? "",
    logoSourceUrl: logo?.sourceUrl ?? "",
  };
}
export async function getProspectBrand(name: string, website: string) {
  try {
    const evidence = await collectEvidence(website);
    return {
      brand: observedProspectBrand(name, website, evidence),
      sources: evidence.sources
        .map(s => ({ url: s.url, text: s.text.slice(0, 10000) }))
        .slice(0, 2),
    };
  } catch {
    return {
      brand: { name, website, logoUrl: "", logoSourceUrl: "" },
      sources: [],
    };
  }
}
