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
  HOST=127.0.0.1 PORT=5175 pnpm dev
```

The supplied built-in runtime credential was verified against the managed model catalog. The command passes it directly into the server's environment; no secret value is written into source, configuration files or Git. This does not provide a separate Manus v2 account task credential or configure Apify.

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
