import type { Express, Request } from "express";
import { marketing } from "../shared/marketing";
import { renderMarketingHtml } from "./marketingHtml";
import { and, eq, sql } from "drizzle-orm";
import { db } from "./services/tenant";
import { pages, companies, leads, suppressions } from "../drizzle/schema";

export function escapeHtml(s: unknown) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  );
}
const publicBody = renderMarketingHtml(escapeHtml);
const privacyBody = `<main style="max-width:800px;margin:60px auto;padding:30px;font-family:system-ui"><a href="/">TailorPitch</a><h1>Privacy, in plain language.</h1><p>TailorPitch stores your consented early-access email to send relevant product updates. Personalized-page forms share your email with the company that created the page. You can opt out at any time.</p><h2>Company workspace</h2><p>Authenticated company users manage their own leads, research, brand assets and drafts. Credentials are encrypted on the server and never returned to the browser. When you explicitly run research or generation, relevant data and selected design assets are shared with Apify or the AI service to perform that action.</p><h2>Connected email</h2><p>Connecting Gmail or IMAP/SMTP permits the requested inbox sync and sending actions. We store a limited set of recent message metadata and snippets, not a copy of your whole mailbox. Sending requires an explicit review action. Gmail read access and sending access are authorized through Google.</p><h2>Your controls</h2><p>Disconnect integrations in company settings. Hiding an uploaded asset removes it from the workspace index, not necessarily from object storage. Contact <a href="mailto:hello@reqproof.com">hello@reqproof.com</a> for data and access requests for the Proof pilot.</p><p>The current pilot is not open company registration. Signing up for early access does not grant access to the Proof workspace.</p></main>`;
function basicDocument(title: string, body: string, noindex = true) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>${noindex ? '<meta name="robots" content="noindex,nofollow">' : ""}</head><body style="background:#f3f0e9;color:#24302a">${body}</body></html>`;
}
export async function prepareInitialHtml(
  template: string,
  pathname: string
): Promise<{ html: string; status: number }> {
  let title: string = marketing.title;
  let description: string = marketing.metaDescription;
  let body = "",
    noindex = false,
    status = 200,
    origin: string | null = null;
  if (pathname === "/") {
    body = publicBody;
    origin = process.env.PUBLIC_SITE_ORIGIN ?? null;
  } else if (pathname === "/privacy") {
    title = "Privacy and connected email — TailorPitch";
    description =
      "How TailorPitch handles signup emails, company data, connected mailboxes and your privacy controls.";
    body = privacyBody;
  } else if (
    /^\/app(?:\/(?:leads(?:\/\d+)?|icps|pages|outreach|inbox|settings|submissions|agents|onboarding))?$/.test(
      pathname
    )
  ) {
    noindex = true;
    title = "Company workspace — TailorPitch";
  } else if (/^\/p\/[a-f0-9]{48}$/.test(pathname)) {
    noindex = true;
    const token = pathname.split("/")[2];
    const d = await db();
    const [row] = await d
      .select({ page: pages, company: companies, leadName: leads.companyName })
      .from(pages)
      .innerJoin(companies, eq(companies.id, pages.companyId))
      .innerJoin(
        leads,
        and(eq(leads.id, pages.leadId), eq(leads.companyId, pages.companyId))
      )
      .where(and(eq(pages.shareToken, token), eq(pages.status, "published")))
      .limit(1);
    if (!row) {
      status = 404;
      title = "Page unavailable — TailorPitch";
      body =
        "<main><h1>This page is not available.</h1><p>It may be private or unpublished.</p></main>";
    } else {
      const c = row.page.content,
        b = row.page.brandSnapshot;
      title = row.page.title;
      description = c.subheadline.slice(0, 160);
      origin = row.company.publicOrigin;
      body = `<main style="max-width:1100px;margin:60px auto;padding:30px;color:${escapeHtml(b.primaryColor)};background:${escapeHtml(b.backgroundColor)}"><a href="${escapeHtml(row.company.website)}">${escapeHtml(row.company.name)}</a><p>A proposal prepared for ${escapeHtml(row.leadName)}. Not an endorsement or existing customer relationship.</p><p>${escapeHtml(c.eyebrow)}</p><h1>${escapeHtml(c.headline)}</h1><p>${escapeHtml(c.subheadline)}</p><h2>${escapeHtml(c.contextTitle)}</h2><p>${escapeHtml(c.contextBody)}</p>${c.benefits.map(x => `<section><h2>${escapeHtml(x.title)}</h2><p>${escapeHtml(x.body)}</p></section>`).join("")}<h2>${escapeHtml(c.pilotTitle)}</h2><p>${escapeHtml(c.pilotBody)}</p>${c.steps.map(x => `<h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.body)}</p>`).join("")}<a href="${escapeHtml(b.bookingUrl)}">${escapeHtml(c.ctaText)}</a><p>${escapeHtml(c.closing)}</p></main>`;
    }
  } else {
    status = 404;
    noindex = true;
    title = "Page not found — TailorPitch";
    body =
      '<main style="padding:60px;font-family:system-ui"><h1>That page is not here.</h1><p><a href="/">Return to TailorPitch</a></p></main>';
  }
  let html = template.replace(/<title>[\s\S]*?<\/title>/, "");
  html = html.replace(/<meta\s+name=["'](?:description|robots)["'][^>]*>/g, "");
  html = html.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/g, "");
  html = html.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/g, "");
  let meta = `<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary">`;
  if (noindex) meta += '<meta name="robots" content="noindex,nofollow">';
  if (origin) {
    try {
      const u = new URL(origin);
      if (u.protocol === "https:" && !u.username && !u.password) {
        const canonical = u.origin + pathname;
        meta += `<link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:url" content="${escapeHtml(canonical)}">`;
      }
    } catch {}
  }
  html = html
    .replace("</head>", `${meta}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  return { html, status };
}
export function registerPublicRoutes(app: Express) {
  app.get("/unsubscribe/:token", async (req, res) => {
    if (!/^[a-f0-9]{48}$/.test(req.params.token)) {
      res
        .status(404)
        .send(basicDocument("Link unavailable", "<h1>Link unavailable.</h1>"));
      return;
    }
    const [row] = await (await db())
      .select()
      .from(suppressions)
      .where(eq(suppressions.token, req.params.token))
      .limit(1);
    if (!row) {
      res
        .status(404)
        .send(basicDocument("Link unavailable", "<h1>Link unavailable.</h1>"));
      return;
    }
    const body = row.active
      ? "<h1>You have opted out.</h1><p>No further outreach will be sent to this address from this company.</p>"
      : `<h1>Stop outreach from this company?</h1><p>This stops future outreach to your email address.</p><form method="post" action="/unsubscribe/${escapeHtml(req.params.token)}"><button type="submit">Confirm opt-out</button></form>`;
    res
      .set("Cache-Control", "no-store")
      .type("html")
      .send(
        basicDocument(
          "Email preferences — TailorPitch",
          `<main style="max-width:600px;margin:80px auto;padding:30px;font-family:system-ui">${body}</main>`
        )
      );
  });
  app.post("/unsubscribe/:token", async (req, res) => {
    if (!/^[a-f0-9]{48}$/.test(req.params.token)) {
      res.sendStatus(404);
      return;
    }
    const d = await db();
    const [row] = await d
      .select()
      .from(suppressions)
      .where(eq(suppressions.token, req.params.token))
      .limit(1);
    if (!row) {
      res.sendStatus(404);
      return;
    }
    await d
      .update(suppressions)
      .set({ active: 1 })
      .where(eq(suppressions.id, row.id));
    await d
      .update(leads)
      .set({ status: "suppressed" })
      .where(
        and(
          eq(leads.companyId, row.companyId),
          sql`LOWER(${leads.email}) = ${row.email.toLowerCase()}`
        )
      );
    res.redirect(303, `/unsubscribe/${req.params.token}`);
  });
}
