# TailorPitch

TailorPitch is a company-scoped prospecting workspace: define ideal customer profiles, review source strategies, run paced Apify-backed ICP agents, research leads, and create personalized landing pages and outreach drafts.

- **Public app:** https://tailorpitch.com
- **Dashboard:** https://tailorpitch.com/app
- **Source:** https://github.com/buger/tailorpitch

## Stack and commands

React + TypeScript + Vite frontend; Express + tRPC backend; Drizzle with MySQL; managed AI and storage; bundled server-side Apify access.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
pnpm start
```

`pnpm dev` starts the development server. Production honors `PORT` (default 3000) and optional `HOST`. `pnpm db:migrate` applies checked-in migrations; `pnpm db:push` generates and applies schema changes. Review migrations before running them: the configured database is shared with production.

## Cloud Computer execution

The public deployment runs as the reboot-enabled `tailorpitch` systemd service behind Nginx and Cloudflare TLS. The app binds to loopback. Server ICP agents run independently of the owner's Mac and browser:

- `TAILORPITCH_AGENT_WORKER=cloud` enables the Cloud Computer dispatcher.
- `HOST=127.0.0.1` keeps the app listener private behind its HTTPS reverse proxy.
- Every 60 seconds the worker checks enabled server-mode agents.
- Each agent enforces its working hours, timezone, daily limits, approved source strategy, evidence requirements, and pause/sync controls.
- The dashboard shows actual worker startup state and its last completed check.
- Existing `execution=local` agent settings are a compatibility key meaning **the app-server worker**, not a requirement to run on a Mac. Platform-scheduled agents use a separate executor and are not dispatched by this worker.

Saving an agent leaves it paused. Resume it deliberately; the daily target is a ceiling, not a promise of matches. No automatic outreach or page publication is enabled by saving an agent.

## Runtime credentials and data

This repository does not contain runtime passwords, API tokens, TLS private keys, visitor addresses, database contents, dependencies, or private working artifacts. Provision server credentials through protected environment configuration. An unconfigured clone does not automatically receive the deployed app's database, AI, storage, or Apify credentials.

Temporary owner-password sign-in is supported by the current cloud deployment; native Google login remains deferred. Public personalized pages require explicit publication. Their consented form emails are stored in the database; owner-only views show submissions and privacy-aware tab-session open counts.

## Project structure

- `client/src/pages/`: public landing, onboarding, leads, sources, agents, pages, outreach, inbox and settings.
- `client/src/components/`: shared UI, real operation-progress windows and personalized-page rendering.
- `server/routers.ts`: tenant-protected APIs and public form/page endpoints.
- `server/services/`: evidence collection, generation, provider adapters, durable agent orchestration and analytics.
- `drizzle/`: schema and reviewed additive migrations.
- `shared/`: validation schemas, contracts, marketing copy and pacing rules.

See [Cloud deployment](CLOUD_DEPLOYMENT.md), [Local development](LOCAL_DEVELOPMENT.md), and [Google login setup](GOOGLE_LOGIN_SETUP.md) for operational details. GitHub `main` and `local-development` mirror the verified cloud code; this sync does not switch the managed hosting repository or change live DNS.

### Demo access and visual generation

A separately provisioned demo account uses `TAILORPITCH_DEMO_PASSWORD_HASH` in the private server environment; never put the plaintext password in source or `.env.example`. It starts with empty website-first onboarding and cannot read Proof company data. fal.ai is the preferred visual generator, as defined in `shared/visuals.ts`; the existing polished proposal uses a source-controlled fal.ai illustration. The connected agent can generate artwork, but automatic app-side generation needs a separately provisioned server key and is not silently enabled.
