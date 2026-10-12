# TailorPitch — company-based prospecting SaaS

## Product scope

TailorPitch helps a company define its ideal customer profiles, find matching leads with Apify, research each lead, create a personalized landing page, and prepare or deliver email, LinkedIn and X outreach. The public TailorPitch landing page collects early-access emails. The private application requires real Manus account login.

The first release has one hardcoded pilot company: **Proof**, at https://reqproof.com/. “ReqProof” is the domain form; the product’s official prose name is Proof. The architecture must support company registration and teams later, rather than treating each login as a separate tenant.

### Company and access model

Use companies, company memberships, and company-scoped records. Every protected query and mutation resolves a membership server-side and restricts reads/writes to that company. Do not accept a tenant ID from the client as authorization. The pilot company is preconfigured; only an explicitly approved owner identity may initially access it. Future registration can create a company plus an owner membership transactionally; invitations and role-based membership are modeled now. Public early-access signups do not grant access to the private Proof workspace.

### Private application

- Overview with real pipeline totals and recent activity; an honest empty state, not invented live leads or analytics.
- ICP management: name, target industries, geography, company size, decision-maker roles, keywords, buying signals, exclusions and a minimum match threshold. Editable Proof-oriented starter profiles target engineering teams adopting coding agents, reliability-sensitive developer infrastructure, and teams with significant review/regression workload. These are suggested hypotheses, not verified customer claims.
- Leads workspace: search, filter by ICP/status, inspect match score and evidence, add a lead manually, find leads with Apify, and view durable sourcing runs and their status. Discovery uses the documented Google Search actor and limits the result count; source candidates are not silently labeled verified matches. Research evaluates criteria, marks unknowns, and explains fit before a lead is qualified.
- Per-lead research: a bounded Apify crawl of public business pages, retained source URLs and research timestamp, facts versus hypotheses, likely pains, Proof relevance, missing criteria, suggested personalization and contact fields. No invented personal emails, hiring/funding signals, customer relationships, or certifications.
- Per-lead page generation: one-click AI-generated headline, context, tailored value propositions, proposed pilot scope and CTA using the company offer plus supported lead research. Save as a draft, allow editing, preview, and explicitly publish/unpublish a shareable, opaque URL. A generated page is clearly a proposal from Proof, not an endorsement by the prospect. Drafts remain private. Public pages collect emails into the owning company’s submissions; outreach does not expose private notes.
- Outreach: generate and edit personalized email, LinkedIn and X drafts with a page link; distinguish drafts, provider acceptance, manual completion and delivery failures. Review an exact recipient and payload before sending. Email uses Gmail OAuth or the company’s SMTP mailbox after the owner connects it. IMAP supplies inbox access, not sending. Social messages can be copied/opened for manual delivery in the pilot; automatic LinkedIn and X delivery requires a selected, authorized provider or eligible API account and must not be represented as connected without one. Track per-lead activity and suppress opted-out contacts. No outbound messages are sent during implementation.
- Company settings: Proof website, offer, approved claims/limitations, booking CTA, sender identity, integrations and custom-domain readiness. Provider credentials remain server-side. Domain status is honest: ready to configure later, not falsely “connected.”

Approved additions: the company owner can upload design assets, add inspiration references, define a text voice, and set separate website and outreach instructions. Both generation paths consume the current company brand profile. Proof begins with editable official brand defaults. The authorized pilot owner login is `hello@reqproof.com`; all other accounts receive an access-request state and no private company data.

Email follows the user's selected options: connect Gmail with OAuth or connect IMAP for inbox access plus SMTP for sending. Store tenant mailbox credentials encrypted server-side; never return credentials to clients or logs. Gmail needs a configured Google OAuth client and may need Google verification for broader public use. IMAP/SMTP requires the user's mailbox settings or app password. Resend is not the required pilot email transport. Keep provider adapters separate from outreach drafts, review and send operations.

### Public website

A marketing landing page for TailorPitch explaining the source → research → personalize → outreach workflow and collecting email with consent. Persist signups, validate and deduplicate emails, include success/error states and a small privacy page. Use meaningful initial HTML and appropriate metadata. Private routes and personalized prospect URLs are noindex. Canonical and sharing origins come from an explicitly configured public origin; do not guess a future domain. Keep all application links relative so hosting and custom-domain binding later do not require rewriting the app.

## Implementation

Use the initialized React/Tailwind/Express/tRPC/Drizzle project and managed MySQL. Preserve supplied OAuth session validation and secure cross-site Preview cookies. AI calls use Manus project server credentials and a currently available model, with structured output validation, bounded requests, and explicit errors.

Pilot provider credentials use protected application secrets. Company integration records associate providers with a tenant, giving a future encrypted-credential/OAuth adapter boundary; do not copy agent credentials into source code or the browser. Apify runs are initiated only from user actions and persisted with external run IDs. The UI refreshes existing run state rather than launching duplicate runs. Result import is idempotent and constrained to the authorized company. Provider calls have bounded timeouts and terminal errors. No paid scrape is executed during development without the user choosing a run.

Use one-time seed/migration records for the pilot company and suggested ICPs; never overwrite later user edits on restart. Track activity and persisted generation results in the database, not process-local memory. Public share tokens and unsubscribe tokens are opaque; missing/private pages return 404.

## Project structure

- `client/src/pages/`: public landing/privacy, login/access gate, overview, ICPs, leads and lead detail, pages, outreach, settings, public personalized page.
- `client/src/components/`: application shell, wordmark, reusable form/dialog/status controls, page renderer and empty/loading/error states.
- `shared/`: validated domain shapes and company/public-page types.
- `drizzle/schema.ts` and committed migrations: companies, memberships, profiles, leads, sourcing runs, pages, outreach drafts/activity, submissions, suppression and provider configuration.
- `server/db.ts` and `server/services/`: company-scoped repositories, tenant authorization, Proof seed, Apify adapter, research/AI personalization and email delivery adapter.
- `server/routers.ts` and feature routers: authenticated company APIs plus limited public signup/page endpoints.
- `server/_core/`: retain the starter’s auth/runtime integration; extend route-level initial HTML and safe public rendering as needed.
- `client/public/`: brand assets and complete `manus-routes.json`; `app.config.ts` supplies a durable project logo URL.

## Design direction

**Movement:** contemporary editorial software, combining a calm paper-and-ink workspace with precise prospecting records. The SaaS brand remains distinct from Proof’s product brand, while Proof-generated pages respect its supplied branding.

**Principles:** content before decoration; sources beside claims; one clear next action; sharp distinctions between draft, ready and actually sent.

**Color philosophy:** warm ivory surfaces and deep charcoal keep research readable; a terracotta accent gives TailorPitch a recognizable action color; subdued olive marks qualified states without suggesting certainty. Proof pages use its official paper #f3f0e9, ink #24302a and sage #7fa34e accent, never sage headlines.

**Layout:** narrow persistent left navigation, spacious asymmetric heading/action rows, a full-width lead table, and a contextual research/detail panel. The landing page uses an editorial split with large left-aligned typography and a typographic workflow illustration, not generic stock imagery.

**Signature elements:** a small interlocking L mark; numbered workflow rails; compact outlined source/status chips. No decorative imagery in the internal tool. Reuse Proof’s real official mark for the company identity.

**Interaction:** precise, reversible controls with visible loading, disabled duplicate submissions, preserved inputs on errors and toast confirmation only after persistence. Drawers/dialogs retain context; actions progressively reveal the next stage.

**Animation:** 150–200 ms hover and drawer transitions, subtle opacity/vertical entrance, no perpetual decoration; respect reduced motion.

**Typography:** Bricolage Grotesque for the TailorPitch wordmark and display headings, DM Sans for application copy, IBM Plex Mono for compact record labels. Proof pages use Iowan Old Style/Baskerville/Georgia headings, Space Grotesk body, and its official wordmark.

**Brand essence:** a focused prospecting workspace that turns researched fit into a relevant conversation. Personality: discerning, clear, personal.

**Voice:** direct and specific, never claims of guaranteed conversion. Examples: “Find the right fit. Make it personal.” and “Research first. Reach out with a reason.”

**Wordmark:** TailorPitch in a tightly set display face beside two interlocking bent strokes, suggesting a lead and its personalized path without a generic sparkle logo.

**Signature color:** kiln terracotta #bf5839, used for the primary action and one small brand detail.

## Current decisions requiring user input

Scope is approved. The pilot owner is `hello@reqproof.com`. Apify and mailbox credentials are not configured yet. The app will provide owner-only integration setup and clearly show disconnected states until configured. Gmail OAuth requires protected client credentials; IMAP/SMTP and Apify can be connected through HTTPS company settings with encrypted server-side storage. Automatic LinkedIn/X sending remains a separate provider setup decision; implement draft/manual workflow plus provider-ready architecture now.

## TailorPitch extension — October 12, 2026

The SaaS name is **TailorPitch**, with the user-owned `tailorpitch.com` domain. Rebrand public and private product copy, metadata, logo and titles, while retaining Proof as the pilot company and keeping existing encrypted credential derivation identifiers stable. Actual DNS/domain binding requires provider access and verified platform-issued records; do not invent an A/CNAME target or claim connectivity before verification.

Implement Gojiberry as a **tenant-owned remote MCP integration** using the official SDK and the server's live RFC 9728/RFC 8414 discovery metadata at `https://mcp.gojiberry.ai/mcp`. It supports authorization code, refresh tokens, S256 PKCE and dynamic client registration. Redirect the owner to Gojiberry and exchange the returned authorization code server-side. Persist client registration, state and verifier encrypted, bind state to the initiating browser/user/company, consume callbacks once, and refresh encrypted tokens. A connect/test operation discovers the actual tool catalog and runs only an owner-selected read-only tool with its real schema. No guessed tool arguments or automatic messaging/campaign enrollment.

Add an **Agents & pipeline** workspace, not a theatrical activity animation. Show actual durable stage jobs, provider run/task IDs and status. A configured agent stays available and resumes in bounded turns; it is not an infinite task or an always-running Sandbox loop. Application-native Heartbeat invokes the published backend independently of process lifetime. A durable tenant job queue, leases, retries and idempotence handle Discovery → Research & qualify → human selection → Page draft → Outreach draft. Page publication and outbound sending keep their separate explicit review controls. Users can enable/disable blocks, choose source provider and ICP, edit instructions, pause/resume the pipeline and change pacing.

Initial editable pace: one candidate per discovery cycle, up to **3 new candidates/day**, at least **240 minutes between discovery starts**, weekdays and a selectable local 09:00–17:00 work window. A hard cap and small Apify run inputs prevent accidental large batches. One active paid provider operation per pipeline; no duplicate discovery/research after uncertain creation; reuse external actor IDs and bounded Apify runs. Lack of qualified results is not concealed or compensated with indiscriminate volume. These are product pacing defaults, not artificial withholding of already-paid results.

Use **Manus API v2** for agentic public-source research or discovery when selected. Keep the account API key encrypted per company, separate from the Webdev project's platform AI key; verify via `user.me`. Persist task ID and URL, retrieve actual activity and strict structured results, check both main-agent status and `has_running_background_jobs`, preserve waiting/unknown states, and never auto-approve external confirmation requests. Continue a stored research/discovery thread with `task.sendMessage` when safe and re-arm structured output each turn; store a fresh per-turn cursor to prevent replaying old extraction. No assumption that model versions can independently be selected by a `2.0` name. Webhook receipt can accelerate synchronization, but authenticated durable Heartbeat reconciliation remains the backbone.

The architecture uses new `shared/pipeline.ts` contracts, additive schema tables/columns, `server/services/gojiberry.ts`, `server/services/manusAgent.ts`, `server/services/pipeline.ts`, feature procedures integrated into the existing company/owner middleware, and `client/src/pages/WorkspaceAgents.tsx`. Leave account setup and unpublished scheduler state honest. Do not start recurring paid sourcing or send real outreach during implementation; a single bounded integration test is permitted after the owner's authorization.

### Final pacing and recovery choices

The 3-candidate/day figure is the initial default, not a hidden immutable subscription gate. The owner can explicitly choose 1–30 candidates/day; the server enforces the chosen cap, one imported candidate per discovery turn, and at least 240 minutes between discovery starts. The default 09:00–17:00 weekday window typically yields at most two cycles in an eight-hour day. Already accepted results are not withheld to manufacture retention. Processing and qualification may continue outside the discovery window so existing paid work can settle. Unknown external starts are never automatically repeated: owner recovery links an existing matching Apify/Manus run, while definitively failed local/read-only stages can be explicitly retried. Pipeline leases have random ownership tokens and compare-and-set release; schedule registration serializes on the company pipeline row and reuses its persisted task UID.

## Website-first onboarding and manual link enrichment

The company owner can analyze an HTTPS company website in onboarding or later in Settings. Bounded public-page retrieval extracts actual copy, logo candidates, links and observed style clues. AI suggests offer, voice, design, separate website/outreach instructions and up to three editable ICP hypotheses citing fetched evidence only. This creates a durable review draft; applying owner-selected edits updates company identity/brand and adds selected ICPs transactionally without wiping existing profiles. First approved-owner login offers onboarding; unapproved accounts still cannot enter the private pilot.

Manual lead intake accepts a website or public GitHub repository URL. Public content extraction identifies README/repository metadata and an evidenced homepage if available, proposes contact/social fields only when actually present, and runs source-grounded ICP research. Review/edit precedes deduplicated lead save with durable source evidence. Unknowns stay blank; repositories without an evidenced homepage retain a repository-specific identity rather than collapsing all leads into github.com. No cloning or code execution. Changing the reviewed website/ICP invalidates old research instead of reusing a stale fit score.

Independent company source/sync switches persist: pause sourcing blocks new automated and manual provider discoveries; pause sync blocks provider polling/import and pipeline processing. Already-running provider work may continue and incur usage; this is not an abort claim. Explicit one-off URL analysis remains available while automated sourcing is paused. Full agent pause continues to freeze all automated stages. The existing leads table retains ICP/status/search filters and gains source plus research context.

## Reference-led design refresh — 12 October 2026

The owner supplied two 12-direction Proof exploration boards for TailorPitch's landing page and dashboard, and requested the same original images in the Proof organization's inspiration library. Preserve all functional routes and company authorization; add assets only to the existing `proof` tenant, with idempotent content-hash provenance. Supplied boards are inspiration, not screenshots of the shipped app or endorsement.

Design movement: quiet editorial modernism, inspired by a gallery catalogue and the Proof explorations. Core principles: generously spaced serif statements; restrained ink/paper surfaces; hairline rules and precise records; purposeful visual relationships instead of ornamental metrics. Typography: Iowan Old Style/Baskerville/Palatino/Georgia for display at weight 400, Space Grotesk for interface copy and navigation, IBM Plex Mono for labels/records. Keep TailorPitch identity separate from Proof's official wordmark. Use a custom serif TailorPitch wordmark with its existing interlocking mark.

Palette: warm paper #f3f0e9, charcoal ink #24302a, hairline neutral #d3d2c8, sparse oxide-red #8a341f for TailorPitch signal markers. Actual Proof pages preserve the official unchanged Proof mark and sage #7fa34e accent; the historic red asterisk on the exploration boards is not a request to replace that mark. Readable semantic pass/fail labels remain.

Landing structure: asymmetrical serif hero paired with one newly generated limestone-sphere/thread image, thin-rule navigation and low-pressure access CTA. Replace the generic busy mockup opening with a staged, clearly illustrative agent workflow; present source → qualify → select → page → outreach as a purposeful path and human approval boundaries. Use a second editorial dark/light comparison with concise copy rather than a colored card grid. Keep existing consented email capture and login actions unchanged. No automatic audio/video; one image and restrained CSS line motion are sufficient for the supplied inspiration.

Dashboard: warm paper shell, narrower indexed navigation with hairline active-state marker, serif page headings, flat rule-delimited actual statistics, stage ledger/queue with clear statuses, calmer blank/loading states, company brand panel and chronological activity. All counts remain database-backed. Shared components carry styling to onboarding, leads, pages, integrations and settings without changing API contracts.

Interaction: links underline, focus remains visible, hover provides a tiny directional cue. Entrance and path movement limited to 500–900 ms or slow subtle decorative motion; reduced-motion users receive a static layout. Brand essence: considered prospecting for teams who want relevance rather than volume — precise, calm, purposeful. Voice examples: “Less chasing. More reasons.” and “Choose the lead. We’ll help with the context.”

## Creative product-story landing and indicative pricing — 12 October 2026

Replace the detached stone-photo hero and conventional stacked text blocks with an interactive tailoring workbench: a warm-paper hero headline, deliberate asymmetry, a full-width dossier of a fictional lead turning into a source-grounded brief, tailored page and outreach draft. Visual craft comes from dimensional paper, fine crop marks, a red selection thread, marginal annotations and real readable example UI, not an unrelated generated asset. Existing uploaded Proof reference boards and company settings remain unchanged. The workbench is explicitly an illustrative local demo, makes no network research/sending calls, and offers user-driven stage switches. Agent movement is purposeful and respects reduced motion.

Use Hormozi-informed offer clarity (desired outcome, visible mechanism to increase confidence, reduced effort and less delay) without copying his wording or inventing timelines, conversion lifts, guarantees, urgency or scarcity. Hero language directly promises the product's function: research suitable leads, build pages and prepare outreach in the company voice. Explain owner input → research evidence → approval and output. CTA is request early access, not checkout or a fictional free trial. Signup consent and login remain operational.

Indicative pricing only: Focus $99/month, 100 researched leads and 10 personalized pages, 200 proposed credits; Momentum $249/month, 300 leads and 30 pages, 600 credits; Studio $499/month, 700 leads and 70 pages, 1,400 credits. Proposed allocation: 1 research credit per researched lead, 10 page credits per generated page; research/page allocations reserved separately to make both allowances simultaneous, editing saved drafts and preparing outreach drafts proposed included. Show monthly quantities and explanation clearly. Prices, credits, limits and rollover are proposals only; do not create entitlements, checkout, payment integrations, credit debits, billing records or real subscription enrollment. Plan CTA chooses early-access interest only.

Proof testimonial-style copy is generated as draft positioning for owner approval, each visibly labeled 'Draft for Proof approval · Not a verified testimonial'. No invented attribution, stars, customer numbers, campaign results or claimed endorsement. Use Proof's official logo only as identification of the existing owner's pilot, not a verified customer stamp. Do not publish broadly: save the Preview checkpoint only.

Implement shared static plan metadata in shared/pricing.ts, isolated landing visual and pricing components under client/src/components/landing, page copy/consent form in LandingPage.tsx, scoped creative styles that do not restyle the working dashboard again, and coherent public initial HTML. Explicitly inspect desktop and mobile screenshots, test the demo and pricing interest CTA without signup, check no horizontal overflow and fix concrete visual defects before delivery.
