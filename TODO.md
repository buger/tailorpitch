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
