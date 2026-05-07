# Shaking Head News

Read the news while your page gently tilts, so a quick headline break also becomes a small neck-movement reminder.

[![License](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)
[![Runtime](https://img.shields.io/badge/runtime-Cloudflare%20Workers-f38020)](https://workers.cloudflare.com/)
[![Frontend](https://img.shields.io/badge/frontend-Vite%20%2B%20React-646cff)](https://vite.dev/)
[![Version](https://img.shields.io/badge/version-2.3.1-2563eb)](CHANGELOG.md)

**Live demo:** https://sn.oheng.com  
**Repository:** https://github.com/ohengcom/shaking-head-news-vite

## Why This Exists

Most news readers optimize only for speed and content density. Shaking Head News adds a deliberate, lightweight twist: the reading surface rotates by a few degrees over time, nudging you to move your neck instead of freezing in one posture.

This is a small product, but it is also a practical Cloudflare-native reference app:

- Vite SPA served by Cloudflare Workers static assets
- Hono API routes running on the Worker
- Better Auth sessions backed by Cloudflare KV secondary storage
- Per-user settings, RSS sources, and movement stats in KV
- React Router, Tailwind CSS 4, Radix UI, Framer Motion
- Vitest unit tests, Playwright smoke tests, Knip unused-code checks
- GitHub Actions deployment to Cloudflare Workers

## Features

- Daily brief and IT news feeds
- Optional custom RSS feeds for signed-in users
- OPML import/export for Pro preview users
- Adjustable page rotation mode, interval, and reading preferences
- Movement statistics and health reminder UI
- Chinese and English interface
- Light/dark themes
- Ad slot support with an ad-free Pro preview mode for self-hosted deployments

The Pro tier in this repository is a self-hosted feature preview. It is not wired to billing.

## Stack

- Frontend: Vite 8, React 19, React Router 7
- Edge API: Cloudflare Worker + Hono
- Auth: Better Auth
- Storage: Cloudflare KV
- UI: Tailwind CSS 4, Radix UI, Framer Motion, lucide-react
- Validation: Zod
- Testing: Vitest + Playwright
- Deployment: Wrangler + GitHub Actions

## Runtime Layout

- `src/main.tsx`: browser app entry
- `src/styles/globals.css`: active browser stylesheet
- `worker/index.ts`: Cloudflare Worker entry and HTTP routing
- `wrangler.jsonc`: Worker, static assets, KV, routes, and observability config
- `worker-configuration.d.ts`: generated Cloudflare binding types
- `components/`: shared UI and feature components
- `lib/actions/`: Worker-side business logic
- `lib/api/*-client.ts`: browser fetch wrappers for Worker APIs
- `app/`: archived Next.js migration reference; excluded from the active Vite runtime

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Default URL: `http://localhost:3001`

Required local variables:

```env
BETTER_AUTH_URL=http://localhost:3001
BETTER_AUTH_SECRET=
```

Generate a local secret with:

```bash
openssl rand -hex 32
```

## Common Commands

- `npm run dev`: start the local Vite dev server
- `npm run check`: run lint, type-check, unit tests, and build
- `npm run test:e2e:smoke`: run the Chromium smoke suite
- `npm run lint:unused`: detect unused files, exports, dependencies, and duplicates
- `npm run types:worker`: regenerate Cloudflare binding types
- `npm run deploy`: build and deploy with Wrangler
- `npm run clean`: remove local build and test artifacts

## Cloudflare Deployment

Before a remote deploy:

```bash
npx wrangler whoami
npm run check
npm run deploy
```

Current Worker routing:

- `assets.directory = ./dist/client`
- `assets.not_found_handling = single-page-application`
- `assets.run_worker_first = ["/api/*", "/ads.txt"]`
- `observability.enabled = true`
- `APP_SETTINGS_KV` stores settings, stats, auth secondary storage, and RSS state

When changing `wrangler.jsonc` or `.env.example`, regenerate Worker types:

```bash
npm run types:worker
```

## Project Health

The repository currently passes:

```bash
npm run lint:unused
npm run check
```

Known tradeoffs are tracked in [Known Issues](docs/KNOWN_ISSUES.md). The largest remaining cleanup is removing the archived Next.js tree and replacing the temporary Next-style compatibility shims with native Vite imports.

## Documentation

- [Setup](docs/SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Cloudflare Deployment](docs/CLOUDFLARE_DEPLOYMENT.md)
- [Monitoring Quick Start](docs/MONITORING_QUICK_START.md)
- [Known Issues](docs/KNOWN_ISSUES.md)

## Contributing

Issues and small pull requests are welcome. Good first areas:

- remove remaining Next compatibility shims
- improve RSS parsing limits and feed resilience
- add screenshots and short demo GIFs
- improve accessibility around motion preferences
- add more Cloudflare deployment examples

Run `npm run check` before opening a PR.

## Credits

- News API: [vikiboss/60s](https://github.com/vikiboss/60s)

## License

MPL-2.0
