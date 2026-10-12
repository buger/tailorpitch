import https from "node:https";
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { load } from "cheerio";
import { safeUrl } from "../../shared/domain";
import type { AnalysisEvidence } from "../../shared/analysis";
export function isPublicAddress(address: string) {
  try {
    let ip = ipaddr.parse(address);
    if (ip.kind() === "ipv6" && (ip as ipaddr.IPv6).isIPv4MappedAddress())
      ip = (ip as ipaddr.IPv6).toIPv4Address();
    return ip.range() === "unicast";
  } catch {
    return false;
  }
}
export function normalizePublicUrl(value: string) {
  const u = new URL(safeUrl.parse(value));
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (ipaddr.isValid(host) && !isPublicAddress(host))
    throw new Error("Use a public website address.");
  if (u.port && u.port !== "443")
    throw new Error("Only standard public HTTPS websites are supported.");
  if (
    u.hostname === "localhost" ||
    u.hostname.endsWith(".local") ||
    u.hostname.endsWith(".internal")
  )
    throw new Error("Use a public website.");
  u.hash = "";
  return u.toString();
}
export async function publicFetch(
  value: string,
  redirects = 0
): Promise<{ url: string; body: string; type: string }> {
  const url = normalizePublicUrl(value),
    u = new URL(url);
  const addresses = await lookup(u.hostname.replace(/^\[|\]$/g, ""), {
    all: true,
  });
  if (!addresses.length || addresses.some(a => !isPublicAddress(a.address)))
    throw new Error(
      "The website does not resolve exclusively to public addresses."
    );
  const address = addresses[0];
  return new Promise((resolve, reject) => {
    const req = https.get(
      u,
      {
        agent: false,
        headers: {
          "User-Agent": "TailorPitch/1.0 public website analysis",
          Accept: "text/html,application/json,text/plain,text/css;q=0.9",
        },
        lookup: ((_host: any, options: any, cb: any) =>
          options?.all
            ? cb(null, [address])
            : cb(null, address.address, address.family)) as any,
      },
      res => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirects >= 3)
            return reject(new Error("Too many website redirects."));
          try {
            return publicFetch(
              new URL(res.headers.location, url).toString(),
              redirects + 1
            ).then(resolve, reject);
          } catch {
            return reject(
              new Error("The website returned an invalid redirect.")
            );
          }
        }
        if (status < 200 || status >= 300) {
          res.resume();
          return reject(
            new Error(
              `Public source returned HTTP ${status}. It may require login or block automated access.`
            )
          );
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        res.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 1024 * 1024) {
            req.destroy(new Error("Source exceeds the 1 MB analysis limit."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () =>
          resolve({
            url,
            body: Buffer.concat(chunks).toString("utf8"),
            type: String(res.headers["content-type"] ?? ""),
          })
        );
      }
    );
    const deadline = setTimeout(
      () => req.destroy(new Error("Public source timed out.")),
      15000
    );
    req.on("close", () => clearTimeout(deadline));
    req.on("error", reject);
  });
}
function link(value: string | undefined, base: string) {
  if (!value) return null;
  try {
    return normalizePublicUrl(new URL(value, base).toString());
  } catch {
    return null;
  }
}
export function extractHtml(body: string, url: string): AnalysisEvidence {
  const $ = load(body);
  const title = $("title").first().text().trim();
  const copyExamples: AnalysisEvidence["copyExamples"] = [];
  const structured: string[] = [];
  const declaredLogos: AnalysisEvidence["logos"] = [];
  $('script[type="application/ld+json"]').each((_i, el) => {
    try {
      const value = JSON.parse($(el).text());
      structured.push(JSON.stringify(value).slice(0, 5000));
      const nodes = Array.isArray(value) ? value : (value["@graph"] ?? [value]);
      for (const node of nodes) {
        if (
          !["Organization", "SoftwareApplication", "Brand"].includes(
            node["@type"]
          )
        )
          continue;
        const raw = typeof node.logo === "string" ? node.logo : node.logo?.url;
        const v = link(raw, url);
        if (v)
          declaredLogos.push({
            url: v,
            sourceUrl: url,
            label: "Publisher-declared logo (structured data)",
          });
      }
    } catch {
      /* invalid schema is not evidence */
    }
  });
  $("h1,h2,h3,p,a,button").each((_i, el) => {
    if ($(el).closest("nav,footer,script,style,noscript").length) return;
    const tag = el.tagName;
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length < 12 || text.length > 1200 || copyExamples.length >= 16)
      return;
    const kind = tag.startsWith("h")
      ? "heading"
      : ["a", "button"].includes(tag)
        ? "cta"
        : "body";
    if (!copyExamples.some(x => x.text === text))
      copyExamples.push({ text, sourceUrl: url, kind });
  });
  copyExamples.sort(
    (a, b) =>
      ({ heading: 0, body: 1, cta: 2 })[a.kind] -
      { heading: 0, body: 1, cta: 2 }[b.kind]
  );
  const logos: AnalysisEvidence["logos"] = [...declaredLogos];
  $("img,link[rel]").each((_i, el) => {
    const rel = $(el).attr("rel") ?? "";
    const desc = [
      $(el).attr("alt"),
      $(el).attr("class"),
      $(el).attr("src"),
    ].join(" ");
    if (!/logo|brand/i.test(desc) && !/icon/i.test(rel)) return;
    const parentLink = $(el).closest("a").attr("href");
    if (
      parentLink &&
      new URL(link(parentLink, url) ?? url).origin !== new URL(url).origin
    )
      return;
    if (/trust|partner|customer|sponsor/i.test(desc)) return;
    if (
      el.tagName === "img" &&
      !/logo|brand|wordmark/i.test(
        [$(el).attr("alt"), $(el).attr("class")].join(" ")
      ) &&
      !$(el).closest("header").length
    )
      return;
    const candidate = link(
      $(el).attr(el.tagName === "link" ? "href" : "src"),
      url
    );
    if (candidate && !logos.some(x => x.url === candidate) && logos.length < 6)
      logos.push({
        url: candidate,
        sourceUrl: url,
        label: (desc.trim() || rel).slice(0, 180),
      });
  });
  const links: string[] = [];
  $('a[href],link[rel="stylesheet"]').each((_i, el) => {
    const v = link($(el).attr("href"), url);
    if (v && !links.includes(v) && links.length < 80) links.push(v);
  });
  const styleText =
    $("style").text() +
    " " +
    $("[style]")
      .map((_i, el) => $(el).attr("style"))
      .get()
      .join(" ");
  const colors = [...new Set(styleText.match(/#[\da-fA-F]{6}\b/g) ?? [])].slice(
    0,
    12
  );
  const fonts = [
    ...new Set(
      (styleText.match(/font-family\s*:\s*[^;}]+/gi) ?? []).slice(0, 10)
    ),
  ];
  $("script,style,noscript,iframe,svg").remove();
  const text = (
    title +
    "\n" +
    $("body").text() +
    "\nPublisher structured data: " +
    structured.join("\n")
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24000);
  if (text.length < 80)
    throw new Error(
      "This page has too little readable public copy. Try a product/about page; authenticated or JavaScript-only sites may need provider research."
    );
  return {
    sources: [{ url, text }],
    copyExamples,
    logos,
    styleClues: [...colors.map(x => `Observed CSS color: ${x}`), ...fonts],
    links,
  };
}
export function githubRepo(value: string) {
  const u = new URL(normalizePublicUrl(value));
  if (u.hostname !== "github.com") return null;
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length < 2 || !parts.slice(0, 2).every(p => /^[\w.-]+$/.test(p)))
    throw new Error(
      "Use a public GitHub repository URL with owner and repository."
    );
  return {
    owner: parts[0],
    repo: parts[1].replace(/\.git$/, ""),
    url: `https://github.com/${parts[0]}/${parts[1].replace(/\.git$/, "")}`,
  };
}
export function leadIdentity(website: string) {
  const repo = githubRepo(website);
  return repo
    ? `github.com/${repo.owner.toLowerCase()}/${repo.repo.toLowerCase()}`
    : new URL(website).hostname.replace(/^www\./, "").toLowerCase();
}
export async function collectEvidence(
  value: string
): Promise<AnalysisEvidence> {
  const repo = githubRepo(value);
  if (repo) {
    let data: any;
    try {
      const meta = await publicFetch(
        `https://api.github.com/repos/${repo.owner}/${repo.repo}`
      );
      data = JSON.parse(meta.body);
    } catch {
      const page = await publicFetch(repo.url);
      if (!page.type.includes("html"))
        throw new Error(
          "GitHub API is unavailable and no readable public repository page was returned."
        );
      const evidence = extractHtml(page.body, repo.url);
      evidence.sources[0].text =
        "Public GitHub repository HTML (API unavailable; metadata completeness is limited): " +
        evidence.sources[0].text;
      return evidence;
    }
    if (data.private)
      throw new Error("Only public repositories are supported.");
    let readme = "";
    try {
      const r = await publicFetch(
        `https://api.github.com/repos/${repo.owner}/${repo.repo}/readme`
      );
      const d = JSON.parse(r.body);
      if (d.encoding === "base64")
        readme = Buffer.from(d.content, "base64")
          .toString("utf8")
          .slice(0, 20000);
    } catch {
      /* metadata still useful; disclose README absent */
    }
    const homepage = link(data.homepage, repo.url);
    const text = JSON.stringify({
      name: data.full_name,
      description: data.description,
      homepage,
      language: data.language,
      topics: data.topics,
      license: data.license?.name,
      updated_at: data.updated_at,
      readme: readme || "README not retrievable",
    }).slice(0, 24000);
    const evidence: AnalysisEvidence = {
      sources: [{ url: repo.url, text }],
      copyExamples: [
        {
          text: String(data.description ?? data.full_name).slice(0, 2000),
          sourceUrl: repo.url,
          kind: "body",
        },
      ],
      logos: [],
      styleClues: [],
      links: homepage ? [homepage] : [],
    };
    if (homepage) {
      try {
        const p = await publicFetch(homepage);
        if (p.type.includes("html")) {
          const e = extractHtml(p.body, p.url);
          evidence.sources.push(...e.sources);
          evidence.copyExamples.push(...e.copyExamples);
          evidence.logos = e.logos;
          evidence.styleClues = e.styleClues;
          evidence.links.push(...e.links);
        }
      } catch {
        /* homepage remains an observed link not a fetched fact */
      }
    }
    return evidence;
  }
  const page = await publicFetch(value);
  if (!page.type.includes("html"))
    throw new Error("Use a readable HTML website or public GitHub repository.");
  const evidence = extractHtml(page.body, page.url);
  const origin = new URL(page.url).origin;
  const pages = evidence.links
    .filter(
      l =>
        new URL(l).origin === origin &&
        /\/(about|product|solution|pricing|contact|brand)(?:\/|$)/i.test(
          new URL(l).pathname
        )
    )
    .slice(0, 2);
  for (const candidate of pages) {
    try {
      const p = await publicFetch(candidate);
      if (new URL(p.url).origin !== origin || !p.type.includes("html"))
        continue;
      const e = extractHtml(p.body, p.url);
      evidence.sources.push(...e.sources);
      evidence.copyExamples.push(...e.copyExamples.slice(0, 6));
      evidence.logos.push(
        ...e.logos.filter(x => !evidence.logos.some(y => y.url === x.url))
      );
      evidence.styleClues.push(...e.styleClues);
      evidence.links.push(...e.links);
    } catch {
      /* retain successfully fetched sources */
    }
  }
  const css = evidence.links.find(
    l => new URL(l).origin === origin && new URL(l).pathname.endsWith(".css")
  );
  if (css) {
    try {
      const c = await publicFetch(css);
      if (new URL(c.url).origin === origin) {
        const colors = [
          ...new Set(c.body.match(/#[\da-fA-F]{6}\b/g) ?? []),
        ].slice(0, 12);
        const fonts = (c.body.match(/font-family\s*:\s*[^;}]+/gi) ?? []).slice(
          0,
          6
        );
        evidence.styleClues.push(
          ...colors.map(x => `Observed ${css} color: ${x}`),
          ...fonts
        );
      }
    } catch {
      /* no claim stylesheet was read */
    }
  }
  evidence.logos = evidence.logos.slice(0, 8);
  evidence.copyExamples = evidence.copyExamples.slice(0, 24);
  evidence.links = [...new Set(evidence.links)].slice(0, 120);
  return evidence;
}
