# TailorPitch — Cloud Computer deployment

## Verified current state

**Public app: https://tailorpitch.com/app — live on the Cloud Computer with temporary owner password login.**

- Project: `/home/ubuntu/tailorpitch`.
- Branch: `local-development`; migration base commit: `14c6d2346faafdc8cfb7704fa0af61403d92a632`.
- Preserves the other agent's landing update (`1d837a3a`) and branding update (`7ccf1c40`).
- Source and full Git history were privately transferred from the Mac; all 254 source-file checksums verified.
- Locked dependencies installed on Linux. TypeScript passes. **139 tests across 28 files pass**. Production build passes.
- `tailorpitch.service` is active and enabled to start on boot. It serves the compiled app on **127.0.0.1:5175**; this is not a public URL.
- `/api/health`, `/app/agents` and the 16-route manifest return HTTP 200. Anonymous ICP-agent API access returns 401.
- Existing managed database, project identity/signing secret, built-in model transport and bundled Apify token are retained. Model-catalog authentication returned HTTP 200.
- No live ICP agents, agent cycles or deliveries were created. Database counts were zero for all three new tables. No paid actor runs or outreach were started.
- The Mac TailorPitch service was stopped before the Cloud Computer service was started.

## Persistent service operations

```sh
sudo systemctl status tailorpitch
sudo journalctl -u tailorpitch --since '15 minutes ago'
sudo systemctl restart tailorpitch
curl -f http://127.0.0.1:5175/api/health
```

The service unit is `/etc/systemd/system/tailorpitch.service`. Its project-scoped environment file is `/home/ubuntu/tailorpitch/.work/cloud/runtime.env`, mode 0600, inside a mode-0700 directory. Do not print it, commit it, put it in a public download, or copy its values into documentation. Restart the service after deliberate environment updates. Retain the existing signing/encryption secrets so stored company integrations remain decryptable.

Build updates with the project's pinned pnpm and lockfile. `pnpm check`, `pnpm test` and `pnpm build` do not require scraping. The managed database is shared with the published app: do not use real company mutations as test fixtures.

## Independent daily ICP agents

Open [Agents](https://tailorpitch.com/app/agents). Each ICP has its own agent, allowed discovery tools, instructions, working hours, cadence, pause/resume controls and actual daily delivery history.

Defaults: at most **3 qualified lead deliveries/day**, at most **6 search turns/day**, at least **240 minutes between searches**, weekdays 09:00–17:00 in the selected timezone. These are maximums, not promised matches. No catch-up flood. At most one candidate is qualified for delivery per turn. Weak/unsupported candidates are rejected, not used to fill a quota.

An approved current source strategy and explicit resume are required. Saving leaves an agent paused. The application worker advances enabled local-executor agents while this persistent service runs. The `local` executor label denotes the application-owned worker, which now runs on this Cloud Computer rather than the Mac. It is not a hosted Manus callback schedule or a full Manus task.

Confirmed review corrections include a six-attempt maximum, source-bound quote/date checks with real-calendar validation, transaction-scoped source/sync checks, renewed and invalidated leases, signed provider-run correlation and compare-and-set uncertain-run recovery. Provider event pricing must be declared; an explicitly published null minimum is distinguished from absent pricing metadata. The Apify run charge parameter is capped at $0.50, not a guarantee of total account costs.

## Private transfer record

Archive: `tailorpitch-cloud-transfer.tar.gz` (1,778,064 bytes). Handoff ID: `hnd_rpOW8sjz0KCv-cyTsrRLZGyF`, expires October 13, 2026 at 11:07 UTC. SHA-256: `ae9b9c67d0fe80f393a6c2226a18dd4464a64bccadd1815243d46d8f0e5afce4`. Received at `/home/ubuntu/tailorpitch-cloud-transfer.tar.gz`; checksum verification succeeded. The archive excludes credentials and dependencies.

## Public cloud cutover and temporary owner login

The public hostname now targets the Cloud Computer through Cloudflare at origin `34.79.15.154`. TLS is Full (strict), with a Cloudflare Origin certificate expiring October 12, 2027. `www` redirects to `https://tailorpitch.com`. Nginx forwards to the reboot-safe `tailorpitch` service on `127.0.0.1:5175`.

Login at `https://tailorpitch.com/app` with `leonsbox@gmail.com` and the temporary password supplied in the protected credential card. This authenticates the existing Proof owner, not a demo account. Sessions are HttpOnly/Secure and expire after eight hours. Password rotation invalidates owner sessions. The service stores only a salted scrypt verifier; no plaintext password is committed or retained in its environment file. The owner-selected password is shorter than the suggested 12 characters; use a longer unique password when rotating. There is no email-only bypass.

Google dashboard sign-in is deferred; Gmail/IMAP remain separate integrations. Uploaded organization references require company membership; public logos resolve only for a published page referencing that exact asset.

Cloudflare handles browser-facing TLS. The origin certificate is not browser-trusted for direct-IP access. The certificate requires renewal before its expiry.

Operations: `sudo systemctl status tailorpitch`, `sudo systemctl restart tailorpitch`, `sudo nginx -t`. Build with `pnpm build` before restarting. Source/dependencies are under `/home/ubuntu/tailorpitch`. Private runtime verifier and credentials are in `.work/cloud/runtime.env` (0600); never print or commit it. DNS rollback is `.work/cloud/dns-rollback.json`.

No ICP agent is enabled automatically by migration. Configure and resume each desired ICP agent in `/app/agents`; each delivers a few qualified leads per day according to its cap, with per-agent history and independent pause/resume. Real actor runs consume your Apify account; none were launched during cutover. Source account/actor access is verified; optional Gmail/Gojiberry/Manus task integrations require their corresponding authorization. Pricing remains illustrative without billing.

## Deployment verification

Public HTTPS login returned HTTP 200 and resolved the existing **Proof / owner** workspace. Workspace, ICPs, leads, pages, outreach, mailbox status and ICP-agent list all returned authenticated HTTP 200. Anonymous workspace access returned 401. Original Proof reference boards returned 404 without a session and an authorized 307 followed by a real image/png HTTP 200. The persistent environment authenticated both the managed AI catalog and Apify account with HTTP 200. Browser inspection confirmed the new password form; the runtime-config URL is versioned to avoid the old cached Manus provider. No scraping, outreach or agent enablement was performed.

The focused read-only review found one edge-rate-limit error message defect; it was corrected with a defensive response parser and HTML/429 regression tests. Company API writes additionally require the configured same-origin browser Origin. Server startup and restart do not themselves launch any enabled providers when all ICP agents are paused.
