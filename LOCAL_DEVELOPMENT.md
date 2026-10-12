# TailorPitch on this Mac

## Current setup

- Project folder: `/Users/buger/tailorpitch`.
- Local application: `http://127.0.0.1:5175`.
- Local dashboard: `http://127.0.0.1:5175/app`.
- Source imported from saved commit `6523a986dbe5bc7e199e2b7f2964809fefbc3372`, including the website-analysis progress window and editable onboarding ICP collection.
- Working branch: `local-development`.
- Frontend and Express/tRPC backend run on the Mac.
- Existing Manus database, OAuth, AI services and stored assets remain cloud services. Internet connectivity is required.
- The published site and Cloudflare domain configuration were not moved or changed. Castly in `/Users/buger/voiceclone` remains separate.

## Start or restart

Use this project's Manus Desktop session so the existing managed environment is loaded. A separate ordinary Terminal does **not** automatically receive its managed credentials.

If the local server is stopped, run this from the project folder in the attached Manus session:

```sh
cd /Users/buger/tailorpitch
MANUS_API_KEY="${MANUS_API_KEY:-$BUILT_IN_FORGE_API_KEY}" \
  HOST=127.0.0.1 PORT=5175 TAILORPITCH_AGENT_WORKER=local pnpm dev
```

The supplied built-in runtime credential was verified against the managed model catalog. The command passes it directly into the server's environment; no secret value is written into source, configuration files or Git. This does not provide a separate Manus v2 account task credential. Bundled Apify is now configured separately through the protected TailorPitch application secret; no customer token entry is needed.

The port is this session's local setting, not the production port. If another process occupies it, select a free port through the project's local runtime configuration and use that same port in the command. Do not stop Castly or silently switch ports.

Stop the application through its Manus service controls or Ctrl-C in its terminal. Leaving it running here does not install a launch-at-login daemon. Local requests stop working if the Mac sleeps, shuts down or the process stops.

## Safety and data

**Local and published code use the same managed database.** Real onboarding application, profile edits, lead imports, published prospect pages and email actions can affect live data. Checks used read-only queries and mocked tests; no scrape, outreach or account task was started during setup.

Authentication remains real Manus OAuth; unauthorized requests remain denied. The approved `leonsbox@gmail.com` account retains its existing Proof membership. Nothing in the local setup bypasses sign-in or grants new workspace access.

Cloud scheduled callbacks continue to target the published app. Running a development server on the Mac does not transfer scheduled jobs or expose localhost to public webhooks.

## Validation and development

```sh
pnpm check
pnpm test
pnpm build
```

The migration passed TypeScript checking, all 100 regression tests and a Mac production build. Local HTTP health, marketing HTML, dashboard/onboarding routes, the route manifest and unauthorized API enforcement were checked. The managed database passed a read-only `SELECT 1`; the authenticated AI catalog returned HTTP 200 with 10 models.

Native language-server registration was unavailable because the local launcher could not find its MCP registration CLI. The existing TypeScript compiler is the reliable checking fallback.

Use the existing managed Git workflow to sync code with Manus. Do not reinitialize or replace `.git`. The imported cloud history and local branch are retained; this migration does not itself push a new cloud version or publish a deployment.

## Bundled Apify and source planning

Open [Sources & strategy](http://127.0.0.1:5175/app/sources), select an ICP, review the desired engagement, current trigger, account filters, buyer roles, exclusions, evidence requirements, source preferences, recency and daily candidate allowance. **Recommend Apify sources** uses the current company/ICP context and live actor catalog, saves an editable strategy, and does not start a run. Edit the source/query and approve explicitly, then start a bounded run in Leads or save a paced agent in Agents.

Account authentication, nine actor schemas, Google/crawler input validation and real AI recommendations have been checked. A live scrape/import has not been run because no source strategy has yet been chosen and approved. Google discovery and website research execution adapters are present; the seven specialist actor adapters are proposed/catalog-verified only and cannot silently fall back to Google. Optional contacts are not automatically enriched.

Apify comes from the protected `TAILORPITCH_APIFY_API_TOKEN` environment value, never a customer UI token or source file. Settings can verify account/actor access without starting work. Existing legacy stored Apify records are ignored by this runtime; they were not deleted. Provider starts use a 10-minute timeout and a $0.50 maximum charge parameter (matching Google's currently published minimum); no optional paid AI/contact/prospecting add-ons. One-page searches may return multiple provider results, but imports and repeated starts respect the approved daily allowance (UTC); search result candidates are not guaranteed qualified leads.

Provider syncing can be paused independently: it defers external fetch/import/start work while local drafts for already qualified/selected leads may continue if the pipeline itself is enabled. Running provider jobs are not cancelled. Interrupted starts are blocked until reconciled; recovery validates signed company/internal-run/plan correlation from provider INPUT and never attaches another tenant's run.

This update passes 120 tests, TypeScript and a Mac build. Desktop/mobile Sources checks used intercepted fixtures, no production data writes or actor runs. Development still uses the shared managed database; schema migration 0008 is additive. Source changes remain on `local-development`, not published canonical main. Scheduled cloud callbacks still target published code, not this Mac.

## Independent ICP agents

`/app/agents` is now a per-ICP sourcing-agent roster, not just one company pipeline. Approve an ICP source strategy in Sources, configure its agent (default maximum **3 qualified lead deliveries/day**, **6 search turns/day**, 4 hours between new searches), select its allowed bounded Apify tools and save. New/saved agents are **paused**. Resume explicitly. Each turn chooses one allowed tool/query, examines at most ten provider records and qualifies at most one candidate. It counts actual new lead deliveries, not search rows. Unsupported ICP filters or undated/unsupported buying signals result in rejection rather than filler.

The Mac application worker advances enabled **local** agents every minute while the server runs; their own hours, cadence, daily attempt/delivery caps and leases govern actual paid dispatch. No missed-day catch-up bursts. Five bounded discovery adapters are available for ICP agents (Google, LinkedIn posts/jobs/companies and career-site job descriptions). The career API minimum is ten source records, not ten lead deliveries. Optional contact/comment/reaction work is disabled. The legacy manual source-plan adapter status remains separate; choosing a specialist does not silently invoke Google.

Daily delivery history is measured per ICP and timezone. Timezone cannot be changed after an agent's first turn because doing so would reset the meaning of its daily budget. Pause/resume and saved edits preserve history. A signed immutable provider-input marker binds interrupted starts to the owning company/agent/turn; ambiguous starts are paused for explicit recovery and never blindly replayed. Cloud hosted execution requires separately registered authenticated callbacks and this version published; localhost cannot receive those callbacks. Do not run a legacy discovery pipeline and an ICP agent for the same ICP.

No real ICP agents, cycles or deliveries were created during validation; all roster interactions were isolated browser fixtures. The managed database migration adds tables only. The other agent's landing redesign (`5511a9dd`, `1d837a3a`) is present and preserved in our working branch.
