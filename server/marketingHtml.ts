import { marketing } from "../shared/marketing";
import { proposedPlans } from "../shared/pricing";

/** Shared story for crawlers/no-JS. React owns the interactive demo and signup. */
export function renderMarketingHtml(escape: (value: unknown) => string) {
  const p = (text: string) =>
    `<p style="max-width:720px;line-height:1.8;color:#aeb7c5">${escape(text)}</p>`;
  const section = (id: string, title: string, body: string) =>
    `<section id="${id}" style="border-top:1px solid #303743;padding:40px 0"><h2 style="font-size:32px;line-height:1.2;letter-spacing:-1px">${escape(title)}</h2>${body}</section>`;
  return `<main class="signal-static" style="min-height:100vh;padding:32px max(24px,calc((100vw - 1200px)/2));font-family:Inter,Arial,sans-serif;color:#f7f8f8;background:#08090a">
<header style="display:flex;justify-content:space-between;border-bottom:1px solid #303743;padding-bottom:24px"><a href="/" style="font-size:24px;color:inherit">TailorPitch</a><a href="/app" style="color:inherit">Log in</a></header>
<section style="padding:64px 0"><p style="font:10px monospace;letter-spacing:1px">${escape(marketing.audience)}</p><h1 style="font-size:clamp(38px,5vw,68px);line-height:1.1;letter-spacing:-2px">${marketing.headline.map(escape).join("<br>")}</h1>${p(marketing.description)}${p(marketing.sourceLine)}<a href="#early-access" style="display:inline-block;margin:20px 0;padding:12px 20px;background:#e4f222;color:#08090a;border-radius:6px">${escape(marketing.primaryCta)} →</a>${p("Early-access email list. No card required.")}</section>
${section("the-work", marketing.mechanismTitle, marketing.steps.map((step, index) => `<article id="flow-${step.id}" style="padding:18px 0"><p style="font:12px monospace;color:#9aa9bc">0${index + 1} / ${escape(step.label)}</p><h3 style="font-size:24px">${escape(step.title)}</h3>${p(step.description)}${p(`What you get: ${step.output}`)}</article>`).join(""))}
${section("your-sources", "Start where your best leads come from.", p("Use included Apify sourcing, connect Gojiberry or Manus, research a public website or GitHub link, or add a company manually. Each path leads to the same research and qualification workflow. Optional Gojiberry and Manus connections use your own authorized accounts; their fees are separate."))}
${section("proof-pilot", marketing.proofTitle, `<figure><blockquote>We don't need another thousand names. We need a clear reason to speak to the right team.</blockquote><figcaption>Leonid Bugaev — Owner, Proof</figcaption></figure><figure><blockquote>The pitch should feel like Proof. The context should make it clear why this team, and why this conversation.</blockquote><figcaption>Leonid Bugaev — Owner, Proof</figcaption></figure>`)}
${section("pricing", marketing.offerTitle, p(marketing.offer) + p(marketing.priceNote) + proposedPlans.map(plan => p(`${plan.name}: proposed $${plan.price}/month. Up to ${plan.researchedLeads} researched leads and ${plan.personalizedPages} personalized pages, both included.`)).join("") + p("Every proposed plan includes offer and ICP setup, source-backed research, editable pages and outreach drafts. Managed Apify sourcing is included. Final prices and allowances may change. Optional third-party fees are separate. These are proposed plans, not a checkout."))}
${section("questions", "Before you jump in.", marketing.faqs.map(([question, answer]) => `<details><summary>${escape(question)}</summary>${p(answer)}</details>`).join(""))}
${section("early-access", "Build a pipeline with a personal touch.", p("Join the early-access email list for access announcements and product updates. The signup form requires JavaScript. Email list only. Workspace access is separate. No subscription starts. No payment today."))}
<footer><a href="/privacy" style="color:inherit">Privacy</a></footer></main>`;
}
