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
