# Implementation source notes

Proof’s product name is **Proof** in prose; ReqProof is the domain form. The pilot offer, voice and claims use its official site, and remain editable company settings. The official brand uses paper #f3f0e9, ink #24302a and sage #7fa34e accents, with a serif headline face. “NASA-grade” is not certification or endorsement. Public ledger projects are not assumed customers.

- https://reqproof.com/ — product positioning, Software Intent Graph, scoped engagement, evidence limits.
- https://reqproof.com/brand — supplied marks, voice, palette, naming and claim guidance.
- https://docs.apify.com/academy/api/run-actor-and-retrieve-data-via-api — asynchronous run ID/status/dataset integration.
- https://apify.com/apify/google-search-scraper/input-schema — search query, page limit, organic results and disabled paid lead enrichment.
- https://apify.com/apify/website-content-crawler/input-schema — bounded public-site research input, depth/page limits, robots respect and readable text.
- https://developers.google.com/workspace/gmail/api/auth/scopes — gmail.send sensitive scope; gmail.readonly restricted scope; verification and security-assessment requirements for a broader public app.
- https://developers.google.com/workspace/gmail/api/guides/sending — RFC 2822 message in base64url raw field, messages.send.
- https://resend.com/docs/api-reference/emails/send-email — considered email provider; superseded for the pilot by the user's Gmail or IMAP/SMTP requirement.
- https://www.linkedin.com/help/sales-navigator/answer/a6246714 — LinkedIn Pages messaging through approved partner platforms; not proof that generic cold personal messaging is available.
- https://docs.x.com/x-api/direct-messages/manage/introduction — X messaging requires an eligible developer app and user OAuth access.

No paid scrape, outbound message or social post was run during development. LinkedIn/X are explicit manual-draft workflows until an authorized delivery adapter is selected. API credentials are entered in owner-only application settings, encrypted per company/provider, and not bundled into client code.

## TailorPitch integration extension

Gojiberry’s official MCP setup is described at https://gojiberry.ai/how-to-do-outreach-claude-linkedin-mcp . The actual tool catalog must be authenticated and inspected before operations are assumed. On October 12, 2026, https://mcp.gojiberry.ai/mcp returned HTTP 401 with RFC 9728 resource metadata at https://mcp.gojiberry.ai/.well-known/oauth-protected-resource/mcp and scopes `mcp:tools claudeai`. The authorization server metadata at https://mcp.gojiberry.ai/.well-known/oauth-authorization-server declares dynamic registration, authorization-code and refresh grants, and S256 PKCE. This supports a real redirect/callback integration, not a static-token imitation.

Manus v2 lifecycle and structured outputs: https://open.manus.ai/docs/v2/task-lifecycle and https://open.manus.ai/docs/v2/structured-output . Reusable task IDs support later turns; a stopped main agent is not complete when background-job state is true or unknown. Stable agent profiles, not independently pinned version aliases, are used. No billing or account entitlement assumptions are made.

The owner confirmed Cloudflare as the DNS provider for tailorpitch.com. The Cloudflare access request was not accepted; no DNS changes were made. Domain binding remains pending authorized DNS access and actual platform-issued records.

## Supplied design references — 12 October 2026

The owner supplied `1fe6adcd-5f43-46e5-be63-d536b74fb687.png` and `274b246e-7a67-48d8-87ea-c5eebf800ab5.png`, two Proof homepage exploration boards. Exact bytes retained as company design-inspiration assets; the boards are not shipped product captures or a request to change the official Proof logo. [Proof's current brand guidance](https://reqproof.com/brand) was consulted for Iowan Old Style/Baskerville/Georgia headings, Space Grotesk body, paper #f3f0e9, ink #24302a and the preserved official sage accent. TailorPitch adopts the editorial composition while retaining its separate product identity and sparse oxide-red signal motif.

## Offer-led landing copy — 12 October 2026

[Alex Hormozi’s interview on the value equation](https://youngandprofiting.com/alex-hormozi-the-value-equation-how-to-make-offers-so-good-people-feel-stupid-saying-no-e199/) explains desired outcome, perceived likelihood, reduced delay and reduced effort/sacrifice. [Acquisition.com](https://www.acquisition.com/) links its official Offers training. The TailorPitch rewrite uses clear product outcomes, a visible worked example, explicit inclusions and a low-friction request-access CTA. It does not copy proprietary wording or claim Hormozi endorsement, conversion rates, guaranteed meetings, immediate results or artificial scarcity. Pricing is a TailorPitch product proposal requested by the owner, not market-validated pricing. Proof quote-style copy is generated draft positioning and visibly labeled as unverified pending owner approval.

## Refero MCP design references — 12 October 2026

Actual Refero style searches explored bold editorial studios, AI-product showcases and Attio/CRM directions. Full style guidance and original previews were retrieved for Waka Waka (https://wakawaka.world, UUID dbfdd355-b07e-40d6-9571-09284475794c), Winamp (https://www.winamp.com, UUID 4749df75-133f-4f2c-b583-18cbffb4ca92) and Attio (https://attio.com, UUID 9f0c028b-6b11-415e-ab92-f32e4597cbe2). Waka Waka is the primary gallery-catalog foundation: monumental black sans, flat parchment #edeae4 and sharp forms; implausible extracted fixed scales were adapted responsively. Winamp contributes only overlapping angled product-artifact framing, not its photos. Attio contributes compact software-window precision; blue is focus-only, not decorative. Original Refero previews are retained under design-references/refero as evidence, not presented as TailorPitch screenshots. The new hero is local interactive UI with fictional Northstar page/outreach examples and no provider calls. Proof organization brand controls and the two original owner-supplied reference boards remain unchanged.

## Owner-approved Proof quotes — 12 October 2026

Leonid Bugaev explicitly approved removal of the draft/testimonial warnings and attribution of the existing two perspective quotes to his name as Proof owner. Both interactive landing and crawler-visible initial HTML now use Leonid Bugaev — Owner, Proof. This approval concerns these quotes only: no performance metrics, fabricated customer outcomes, billing enablement or unlabeled live-demo claims were added.

## Whole-landing offer structure — 12 October 2026

Revisited Hormozi’s own discussion of desired outcome, likelihood, time delay and effort/sacrifice in https://youngandprofiting.com/alex-hormozi-the-value-equation-how-to-make-offers-so-good-people-feel-stupid-saying-no-e199/ and Acquisition’s official https://www.acquisition.com/training/offers module index (value equation, creation, bonuses, guarantees, urgency and naming). The revised landing applies the framework through concrete account-specific outputs, a worked mechanism, website-first setup, fewer tool handoffs, a package with explicit allocations and a low-risk early-access action. It intentionally does not manufacture guarantees, scarcity, bonus valuations or reported revenue/reply results. Existing owner-approved Leonid quotes are unchanged. No endorsement by Hormozi or Acquisition is implied.

## Async progress interaction references — 12 October 2026

Refero Typeform processing/modal screen: https://refero.design/pages/77fd0e93-47b0-47ab-af3a-7a04cfa7ac70 (step ledger plus current work), and MonoDesk website-analysis screen: https://refero.design/pages/bb0463c2-9c00-4796-8c17-e59bb30da9a4 (immediate analysis overlay). Screens inspected visually through Refero; hierarchy borrowed and reinterpreted in TailorPitch’s own paper/ink identity. Stage checkmarks are based on actual API/service transitions, not elapsed timers. No third-party images, copying brand marks, or claimed provider progress percentages.
