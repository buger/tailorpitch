# TailorPitch implementation outcomes

- [x] Public SaaS landing page explains lead sourcing, research, personalized pages and outreach; validates and persists consented early-access emails, with success/error states, privacy page and custom-domain-ready relative routing.
- [x] Real Manus login protects private data. Only `hello@reqproof.com` initially owns the single Proof company pilot. Other authenticated accounts see access pending, never the pilot data. Companies and memberships support future company registration and teams; protected reads/writes enforce server-resolved tenant scope.
- [x] Owner manages company offer, CTA, approved claims, design assets and inspiration references, text voice, website instructions and outreach instructions. Both generation paths use the saved profile, beginning with editable official Proof branding.
- [x] Owner can create/edit ICPs with industries, geography, company size, roles, keywords, signals, exclusions and fit threshold. Suggested Proof profiles are clearly hypotheses. Leads can be added manually or sourced through real Apify actor runs, with durable status, source provenance and idempotent import; missing credentials are explicitly disconnected.
- [x] Leads are researched with a bounded public-site Apify crawl, source URLs and timestamps. AI distinguishes supported facts, hypotheses and unknown ICP fields, scores fit and records gaps; no invented contact data, endorsements or certifications.
- [x] Per-lead button creates editable personalized page drafts from research, company brand/voice and website instructions; preview and explicitly publish an opaque share URL; drafts remain private; missing/unpublished pages return 404. Public forms attribute consented submissions to the owning company.
- [x] Per-lead email, LinkedIn and X drafts use research, page link, company voice and outreach instructions. Exact editable recipients and payloads are reviewed before send. Social copy/profile-open/manual-completion is truthful and automatic integration readiness is explicit. No messages are sent during the build.
- [x] Company owner can connect Gmail OAuth or IMAP inbox plus SMTP delivery. Credentials stay encrypted and server-side; no browser secret persistence or logging. Inbox sync, email send provider acceptance, failures, opt-out suppression and activity are persisted without false delivery claims.
- [x] Overview, leads, profiles, pages, outreach, inbox and settings form a responsive coherent editorial workspace with honest empty/loading/error states and real database totals; no fake live analytics.
- [x] Read-only implementation review checks the company boundary and end-to-end connections. Confirmed issues are corrected; affected type/build/tests pass; complete route manifest and durable logo metadata exist; save a recorded checkpoint and deliver the Preview without claiming publication.

## Final evidence and boundaries

TypeScript checking, 17 automated tests, and the production build pass. Production serving was checked locally for initial landing HTML, private noindex metadata, health and all 13 declared page routes. Public Preview responds successfully; unauthenticated lead API rejects with HTTP 401; missing prospect URL returns 404. A real AI page-generation call returned schema-valid personalized content without storing a test lead or page. Read-only integration review was completed and confirmed interrupted-run, opt-out, final-payload and consent-scope issues were corrected.

Proof seed contains two editable ICP hypotheses; no fake leads, pages, outreach or connected accounts are inserted. Apify and Gmail/IMAP require owner configuration, so provider-dependent live scraping, mailbox login and delivery have not been exercised with the owner's accounts. LinkedIn and X use manual outreach, as approved. The app is a preview, not a published or domain-bound service. Company registration/invitation UI remains future scope; tenant/member models exist now. Before broader production launch, configure a dedicated stable CREDENTIAL_ENCRYPTION_KEY before adding integrations, complete any applicable Google OAuth verification, and apply operational mailbox/data retention policies.

## TailorPitch extension outcomes

- [ ] Rebrand SaaS as TailorPitch, retain Proof company branding, and configure tailorpitch.com through Cloudflare and platform-issued domain records; connection is claimed only after actual verification.
- [ ] Gojiberry uses real MCP discovery, dynamic client registration, S256 PKCE, browser/user/company-bound state, callback code exchange, encrypted token persistence/refresh, safe discovered tool schemas, and one authorized read-only integration test; missing login remains explicit.
- [x] Manus v2 verifies the account, creates/resumes bounded agent tasks, records real events/task URLs, parses strict structured results, checks waiting/background states, and keeps external account credentials encrypted per tenant.
- [x] A flexible durable pipeline covers find → research/qualify → human selection → private page draft → optional outreach draft. No automatic publication or messaging. Stage jobs, leases, failures and provider IDs survive restarts.
- [x] Editable pacing starts at one candidate per cycle, up to 3 candidates/day, 240 minutes between discoveries and weekday local 09:00–17:00. Daily caps, stage selection, working windows, pause/resume, bounded Apify requests and no duplicate paid retries are enforced server-side.
- [ ] Authenticated published Heartbeat owns recurring execution and maps actual schedule identity to the pipeline. Configured, unpublished and running states remain distinct; no detached Sandbox scheduling loop or unapproved ongoing paid work.
- [ ] Type/build/tests and a read-only extension review check OAuth/tenant/pipeline connections. Final checkpoint and handoff report actual integration, domain and scheduler status.

## TailorPitch extension evidence and remaining activation steps

TypeScript checks, 34 automated tests and the production build pass. The 14-page manifest matches source, including Agents & pipeline. Unauthenticated agent API and unsigned Heartbeat return 401. Read-only review confirmed lease ownership, schedule idempotence, stale research selection and pending OAuth disconnect defects; corrected with random lease tokens, serialized UID reuse, current-lead guards and OAuth-session cleanup.

A live Gojiberry check successfully discovered the provider, dynamically registered a public client, and returned a matching-state S256 PKCE authorization URL with the exact MCP resource. No account tokens were granted: owner login and a real tool call remain pending. Manus lifecycle regression tests used mocked HTTP and did not launch real account tasks. No integrations or active recurring pipelines were inserted during the build. Cloudflare access was not accepted, so tailorpitch.com remains unbound. Production publication, owner login, provider credentials and schedule activation remain next steps. Nothing was sent or scraped against the owner's accounts.

## Website onboarding and manual intake outcomes

- [x] Owner provides a website in onboarding; analyze it first and display real copy examples, source URLs, logo candidates, observed style clues and suggested voice/instructions plus ICP hypotheses. User edits/selects before applying; reanalysis and later changes remain available in Settings. Preserve existing ICPs and require explicit application before brand overwrite.
- [x] Owner pauses/resumes sourcing independently from provider-result synchronization; persisted controls are enforced server-side. Already running external tasks are not misrepresented as cancelled. Explicit manual URL intake stays available while automated sourcing is paused.
- [x] Website/public GitHub links yield source-grounded enrichment and ICP research with review/edit before deduplicated save. No private repo access, execution, invented contacts or unsupported facts; repository identity avoids merging unrelated github.com leads. The leads table displays source/ICP/fit context and filters.

## Website onboarding and link intake evidence

Live public extraction read reqproof.com home/product/about pages, real copy and declared-logo/CSS clues; a source-grounded AI onboarding check returned a schema-valid company profile and three editable ICP hypotheses. Public expressjs/express repository metadata/README and observed homepage extraction succeeded in the first check; a subsequent unauthenticated GitHub API request hit HTTP 403, so public-HTML fallback and explicit rate-limit/access errors are implemented. No test leads, onboarding drafts or pause-control rows were saved. The company/user access boundary remains unchanged. Automated regressions cover public-address/DNS safety, source/script extraction, repository identity, exact contact matching, strict provider-schema compatibility, independent pause controls and anonymous API rejection. Current route manifest declares 15 routes including onboarding; public onboarding remains noindex.

A read-only review found provider-research provenance, GitHub import identity, pause reconciliation, suppression and stale-field issues; confirmed paths were corrected. Existing external provider runs are not cancelled by app pause. Manual link review invalidates research on edited input/ICP/company context and preserves existing deduplicated leads without overwrite. Hosted sign-in metadata and domain binding remain blocked on separate authenticated website settings/Cloudflare access; no new account key was required for these new features.

## Owner-supplied visual references

- [x] Apply the supplied Proof exploration boards to TailorPitch's landing page and dashboard: warm paper and ink, large serif typography, generous whitespace, hairline rules, small accent markers, natural-material hero visual and clear workflow. Preserve consented signup, login, all private workflows and factual database counts.
- [x] Add both exact original uploaded PNG images as durable inspiration assets to the existing Proof (`proof`) organization. Keep current brand/logo unchanged, clarify historical exploration versus official live brand, and make the references visible in Settings and available to personalized page generation.
- [x] Verify type/build/tests and real HTTP readiness, review focused design/reference connections, save the complete change to the canonical repository, and deliver the Preview without claiming domain publication.

### Reference-led design evidence

Both original PNGs were imported to Proof company 1 as brandAssets IDs 1 and 2. Signed-download SHA-256 checks matched the owner's originals; stable asset routes resolve HTTP 200 after the expected redirect. A second import returned already stored and created no duplicate assets. The official Proof logo URL, primary ink #24302a and sage #7fa34e remained unchanged. Settings now shows uncropped board thumbnails with links to the original and labels them as inspiration rather than offering Use as logo. Personalized-page generation passes both boards as high-detail signed visual inputs with explicit historical-reference notes; a mocked regression confirms this connection without provider charges or lead creation.

TailorPitch now uses editorial serif headings, Space Grotesk interface text, warm paper/ink surfaces, thin rules, restrained signal pins and a five-stage illustrative landing workflow. Actual workspace counts, loading/error states, login, consent text, signup success/error and all existing private routes are preserved. One AI-generated stone/thread illustration is assigned only to the hero at the reserved managed URL; it is atmospheric, not evidence of the product or a customer. No video is needed for this iteration.

Final focused review corrected graceful hero availability handling and made historical exploration metadata explicitly layout-only with authoritative preservation of saved company logo/colors. 48 tests, TypeScript, production build and HTTP readiness pass.

Website onboarding reconfirmed and made permanently discoverable in the Company sidebar. Owner can override discovered logo URL and visual-direction instructions on the review step; later edits stay available in Settings and ICP Profiles. Existing source-linked real copy, inferred style notes and selectable/editable ICP hypotheses remain unchanged.

## Creative landing, illustrative pricing and Proof draft copy

- [x] Replace the mismatched image and standard landing blocks with a distinctive readable product visualization: fictional lead discovery, source-grounded qualification, owner selection, personalized landing-page creation and email/LinkedIn/X drafting. Allow local stage interaction, label examples, preserve no-auto-send behavior and reduced motion.
- [x] Use clear Hormozi-informed outcome/effort/mechanism copy without unsupported conversion rates, guarantees, time claims, fake scarcity or real social proof. Preserve working signup, explicit consent, privacy links and login.
- [x] Add illustrative pricing from $99/month including up to 100 researched leads and 10 personalized landing pages. Show 200 proposed credits split 100 research credits plus 100 page credits, 1 credit per researched lead and 10 per page. Higher proposed plans $249 for 300/30 and 600 credits, $499 for 700/70 and 1,400 credits. No billing, checkout, debits or subscription enrollment; early-access interest only.
- [x] Generate Proof testimonial-style draft copy and label each clearly as 'Draft for Proof approval · Not a verified testimonial', without invented speakers or performance claims.
- [x] Visually inspect actual desktop and mobile page renders, inspect demo stages and pricing/signup navigation without sending a message or submitting personal data, correct visible defects, run type/tests/build, save to canonical repository and deliver Preview.

Creative landing evidence: explicit desktop 1440px and mobile 390px screenshots inspected across hero, workbench, Page and Outreach stages, method blocks, Proof draft labels, pricing and signup. Horizontal overflow is false and browser page errors are empty at both widths. Local checks confirmed Select approval gating, expanded page example, LinkedIn/X copy switching, replay, 600/1400 plan allocations, 100 leads plus 10 pages equals200 credits, and early-access navigation with an empty email field. No signup, payment, real research, message sending or database mutation occurred in visual tests. Corrected the observed oversized stage heading, redundant mobile inspector/margin stacking, and hover contrast. Workbench now initially displays the page output to make the product's visual deliverable clear; replay still starts discovery.

## Dashboard login access

- [x] Approve the exact authenticated `leonsbox@gmail.com` identity as a Proof company owner while retaining `hello@reqproof.com`. No matching other Gmail/Proof addresses, fabricated users or auth bypasses.
- [x] Successful login routes straight to dashboard; clearly explain Google login through the existing Manus sign-in provider. This does not connect Gmail mail sending.
- [x] Unapproved authenticated users see a proper no-workspace-access error, signed-in email and a switch-account action. Cancelled/invalid-state/failed login returns to a readable error screen; missing or failed account synchronization is distinct from silently looking logged out.
- [x] Validate auth and tenant regression tests, inspect actual login path without entering user credentials, save the working update and provide exact dashboard login steps.

## Refero-led landing revision

- [x] Use actual Refero MCP searches, full retrieved style rules and visual previews; synthesize a visible new direction with an explicit reference lock instead of copying one brand or only restating inspiration.
- [x] Change the public landing from centered serif template to bold asymmetric typographic product gallery, visually explaining research → personal page → outreach while keeping local fictional demo labels, editable proposal prices starting $99/10 pages/100 researched leads, no billing, consented email form and privacy.
- [x] Keep Proof organization branding and stored reference images unchanged. Keep owner login access and current app functionality intact.
- [x] Inspect desktop/mobile rendered result and correct confirmed clipping/overflow. Check build/types/regressions and save the changes. Report exact approved Google-linked login steps and actual Refero sources used.

Login/Refero evidence: existing authenticated Google user id1 was explicitly bound to Proof company id1 with role owner and verified via read-only joined query. Exact allowlist normalization accepts only hello@reqproof.com and leonsbox@gmail.com; aliases/other same-domain addresses stay denied. Callback success redirects /app; mocked provider tests confirm no session for unknown user/missing email and no token exchange on invalid state. Actual public callback failure returns303 /app?login_error=cancelled with no-store. 56 regressions/typecheck/build pass. Parent inspected desktop1440 and mobile390 renders, fixed gallery card/control overlap, tested local Page/Outreach and original workbench/pricing without signup or sending; zero page errors/horizontal overflow. Read-only reviewer found no confirmed material issue. Full user login was not performed by the agent; user chooses Google in the existing Manus provider screen. The hosted OAuth consent app title is platform metadata and may retain its old project title until separately changed there; application branding is TailorPitch.

## Production dashboard null-pipeline crash

- [x] Overview must render a successful pipeline response with `pipeline:null` without reading null.enabled; show setup guidance, distinguish loading/request errors/enabled/paused, and preserve real data and authorization.
- [x] Agent controls must show API failure or missing-response Retry before waiting for an uninitialized editor config; an unsaved pipeline is labeled Not configured.
- [x] Component-render regression tests reproduce the exact null response and cover loading, absent data, errors and saved states; types/build/tests pass; save and release through the user's enabled automatic publishing without claiming deployment success prematurely.

Crash-fix evidence: ten actual React component-render regressions pass, including successful response pipeline:null and failed requests without editor state. All 66 tests, TypeScript and production build pass. No user/company/pipeline record was created or changed; unsaved pipeline remains intentionally absent. Release uses currently user-enabled auto_publish:true. Production asset in reported stack was index-B0CICXka.js, which predates this correction.

## Owner-approved Proof quotes — 12 October 2026

Leonid Bugaev explicitly approved removal of the draft/testimonial warnings and attribution of the existing two perspective quotes to his name as Proof owner. Both interactive landing and crawler-visible initial HTML now use Leonid Bugaev — Owner, Proof. This approval concerns these quotes only: no performance metrics, fabricated customer outcomes, billing enablement or unlabeled live-demo claims were added.

## Full landing offer/story rewrite

- [x] Apply Hormozi value drivers to all marketing copy: clear audience and desired outcome, concrete mechanism/confidence, less effort and fewer handoffs, literal controls/no-card next step; no invented guarantees, timing, savings, scarcity or revenue results.
- [x] Restructure outcome → problem/alternative → dedicated interactive mechanism → approved Proof perspective → simple onboarding/control steps → explicit value stack/pricing → objections → consistent early-access CTA; preserve the Refero visual direction, exact Leonid quotes, private login, consent/privacy and local demo controls.
- [x] Keep $99 including up to100 researched leads and10 pages plus current higher illustrative plans and correct separate credit allocations; do not add billing. Explain provider costs and manual LinkedIn/X drafts. Synchronize initial HTML/social metadata and all page copy.
- [x] Inspect actual desktop/mobile rendered hero, story, pricing and signup; validate scripts, build and tests and save through the enabled publication flow.

Full-story evidence: shared headline/FAQs and initial public HTML are aligned; section-order/allowance/signup/quote tests pass. Actual desktop1440 and mobile390 screenshots inspected, zero JS page errors/horizontal overflow, local gallery/workbench/channel/pricing navigation retained. Focus remains99 with100researched and10pages; no billing or database mutation. All73tests/typecheck/build passed; final added assertion rechecked. Focused read-only review confirmed the four-driver story and prompted an explicit email-list-only caption and shorter closing copy. Owner role is used consistently and approved quotes remain verbatim.

## Progress feedback for long-running actions

- [x] Analyze company website opens a nice immediate progress window with the current website, real stage checklist, elapsed time, draft/review boundary and clear completion/error; preserve editable review and previous drafts. Use Refero references and existing TailorPitch identity.
- [x] Apply the same interaction to manual lead-link research, page generation and outreach drafting. Prevent repeated starts while pending; minimizing is not cancellation; restore a compact progress indicator. Do not invent provider progress, fake percentages, completion estimates or automatic publication/sending.
- [x] Scope durable progress snapshots by company and initiating authenticated user; retain old-client mutation compatibility and safe error/interruption handling. Backend stages, not elapsed timers, advance completion.
- [x] Verify desktop/mobile and keyboard/error/minimize/restore behavior with mocked UI responses (no live analysis records, paid runs or sends), type checks/tests/build, then save the ready implementation.

Progress evidence: four operation kinds / five UI entry points connected to scoped real backend snapshots. All90regressions, typecheck and production build passed. Desktop1440/mobile390 actual component screenshots inspected with API fixtures; focustrap, Escape/minimize/restore, result/review, errorwithpreviousdraft and no duplicate starts passed. No private API request was forwarded by the visual fixture, no live analysis/provider/send triggered. Real unauthenticated progress read returns401. Migration is additive, one newtable only. Read-only review’s stale-status contradiction fixed as uncertain(?) rather than failed(X); mobile review boundary visible, terminal motifs stop animating.

## Onboarding ICP collection clarity and editing

- [x] Section 03 clearly identifies Ideal customer profiles (ICPs), explains how they guide sourcing and qualification, and uses Refero-backed collection/action hierarchy instead of an ambiguous hypotheses form stack.
- [x] Owner can Add ICP, edit targeting criteria, include/exclude, Remove a draft ICP and Undo removal; stable identities preserve the other rows and selections. Empty suggestions and removing all profiles remain usable. Manual additions work beyond the three AI suggestions, up to the explicit 20-profile review limit enforced by the apply API.
- [x] Selected new profiles validate with field-level feedback before applying; excluded incomplete drafts do not block applying. Removing a draft never deletes a saved ICP. Applied reviews/read-only access have appropriate disabled controls and a Manage saved ICPs link; no auto-saving or sourcing starts.
- [x] Verify add/remove/undo/edit/selection and apply payload via safe API fixtures, desktop/mobile layout, targeted regressions, type checking and production build; save the updated version.

ICP evidence: Refero Anam and Cycle full screens inspected; Section03 full-width collection visually inspected on desktop/mobile. Add/Edit/Include/Remove/Undo, stable selection, manual profiles beyond three AI suggestions, selected-only apply payload, blank-field feedback, zero-profile apply, and applied/member read-only states passed with intercepted fixtures (zero backend requests forwarded). Eight new state/schema regressions passed; complete suite98tests, type checks and production build passed. No saved ICP was deleted; no provider or company-analysis request was triggered. Existing review/apply owner and brand concurrency boundaries retained.

## Bundled Apify activation

- [x] A protected application-owned token powers manual Apify lead discovery, research and the existing paced pipeline. Customers are not asked to connect Apify; no secret is returned to the browser or stored in source. Only the protected app-wide credential is accepted; the obsolete customer-token API and fallback are disabled without deleting any saved legacy records.
- [x] Settings and Agents report the effective bundled provider availability; an owner can verify account and required actor access without starting a scrape. Company/customer disconnect cannot remove the app-wide account.
- [x] Real sourcing/research remains tenant-scoped and deduplicated, respects sourcing/sync pause controls, bounds page count/runtime/charges, and prevents duplicate starts after uncertain outcomes. No recurring pipeline, page publication or outreach is automatically enabled.
- [ ] Validate protected token and actor access, run bounded end-to-end provider checks, regressions/type/build, and save the complete implementation with accurate local versus published status.


## Native Apify source planning

- [x] Ask editable company/ICP-specific questions before sourcing: desired engagement, active trigger and recency, company constraints/exclusions, buyer roles, evidence requirements, preferred/avoided sources and daily pace. The provided attachment has recommendations only, so original unseen questions are not presented as verbatim.
- [x] Inspect a verified Apify actor catalog through the backend account, then propose relevant discovery, evidence and contact sources with reasons, current schema/pricing caveats and bounded inputs rather than blindly using one generic Google query. Preserve the supplied Proof cohort distinctions and official API alternatives.
- [x] Persist reviewable per-company/per-ICP plans; allow edits and explicit approval before discovery. Invalidate stale criteria snapshots, and distinguish executable adapters from proposed or unsupported integrations. Do not auto-enable recurring pipelines, scrape, publish pages or contact people.
- [x] Validate anonymous/tenant/schema/limits guards and UI review flows with mock fixtures; save working local code and report verified versus pending actor execution honestly.

### Native source validation and activation boundary

Backend account identity and both main actors verified; all nine catalog actors returned current input schemas. Google and crawler bounded inputs validated against live default schemas, including opaque tenant/internal-run correlation. One actual source recommendation passed strict validation without storing a plan or importing any lead. The review found and corrected stale active-run reuse, obsolete personal-token paths, unsafe shared-account run adoption, provider-sync overreach, same-plan approval state, query-preview mismatch and missing source-query error/retry feedback.

Full suite: 120 tests in 24 files passed, TypeScript and production build passed. Actual desktop/mobile private-screen fixtures tested questionnaire, genuine pending request, recommendation, proposed-only specialist source status, current-query approval, no page errors/overflow, and zero private API forwarding. SourcePlans and sourcingRuns remain zero rows after validation. No actor run, recurring agent, publication or outreach was started. Source execution stays pending owner selection/approval, with Google discovery + website research adapters ready, specialist execution adapters explicitly not activated. Local-only branch saved separately from canonical main; production unchanged by this source code update. Shared database has the additive 0008 schema only.
