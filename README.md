# Shaking Head News

A tiny news reader that nudges you to break fixed reading posture with gentle page
rotation.

边看新闻，边用轻微页面旋转打断固定阅读姿势。

[![CI](https://github.com/ohengcom/shaking-head-news-vite/actions/workflows/ci.yml/badge.svg)](https://github.com/ohengcom/shaking-head-news-vite/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)
[![Runtime](https://img.shields.io/badge/runtime-Cloudflare%20Workers-f38020)](https://workers.cloudflare.com/)
[![Frontend](https://img.shields.io/badge/frontend-Vite%20%2B%20React-646cff)](https://vite.dev/)
[![Version](https://img.shields.io/badge/version-2.3.1-2563eb)](CHANGELOG.md)

[Live Demo](https://sn.oheng.com) · [Self-host](#self-host-in-5-minutes) ·
[Roadmap](ROADMAP.md) · [Contributing](CONTRIBUTING.md)

## Why It Exists

Shaking Head News turns a common habit, reading news while sitting still, into a
low-friction posture break:

- the reading area tilts or rotates gently at configurable intervals
- daily brief, IT news, hot lists, and custom RSS feeds live in one place
- OPML import/export makes it practical for self-hosted personal feeds
- settings, RSS sources, and reading stats can be stored in Cloudflare KV

It is not a medical or treatment tool. The product language is intentionally scoped to
posture breaks, gentle movement prompts, and reducing long stretches of fixed-position
reading.

## Feature Highlights

- Daily brief and IT news aggregation
- Custom RSS sources for signed-in users
- OPML import/export in the self-hosted Pro preview mode
- Configurable rotation mode, interval, angle, font size, and layout density
- Reading activity stats and reminder prompts
- Chinese and English UI
- Light/dark/system themes
- Cloudflare-native API runtime with Hono and KV
- Vitest unit tests, Playwright E2E tests, Knip unused-code scanning, and CI

The Pro mode in this repository is a self-hosted feature preview. It does not include
billing. Deployers can wire it to their own entitlement system, keep the preview toggle,
or remove the gated features.

## Tech Stack

- Frontend: Vite 8, React 19, React Router 7
- Edge API: Cloudflare Workers + Hono
- Auth: Better Auth
- Storage: Cloudflare KV
- UI: Tailwind CSS 4, Radix UI, Framer Motion, lucide-react
- Validation: Zod
- Tests: Vitest + Playwright
- Deployment: Wrangler + GitHub Actions

## Self-host In 5 Minutes

Prerequisites:

- Node.js 22+
- npm 11.11+
- A Cloudflare account with Wrangler authenticated

```bash
npm install
cp .env.example .env.local
```

Generate a local auth secret:

```bash
openssl rand -hex 32
```

Set the minimum local variables:

```env
BETTER_AUTH_URL=http://localhost:3001
BETTER_AUTH_SECRET=<your-generated-secret>
```

Create KV namespaces for production and preview:

```bash
npx wrangler kv namespace create APP_SETTINGS_KV
npx wrangler kv namespace create APP_SETTINGS_KV --preview
```

Copy the generated `id` and `preview_id` into `wrangler.jsonc`, then refresh Worker
types:

```bash
npm run types:worker
```

Run locally:

```bash
npm run dev
```

Deploy:

```bash
npx wrangler whoami
npm run check
npm run deploy
```

For OAuth providers, add the relevant IDs to `.env.local` and store private values with
`wrangler secret put` before deploying.

## Project Layout

- `src/main.tsx`: browser entry
- `src/app/App.tsx`: SPA root
- `src/styles/globals.css`: shared styles
- `worker/index.ts`: Cloudflare Worker routes
- `components/`: shared UI and feature components
- `lib/actions/`: Worker-side business logic
- `lib/api/*-client.ts`: browser fetch wrappers for Worker APIs
- `lib/i18n.ts`, `lib/router.ts`, `lib/link.tsx`: local browser runtime helpers
- `wrangler.jsonc`: Worker, assets, KV, routing, and observability config
- `worker-configuration.d.ts`: generated Worker binding types

Runtime: `Vite SPA + Cloudflare Worker`.

## Common Commands

- `npm run dev`: start local development
- `npm run check`: lint, type-check, unit tests, and production build
- `npm run test:e2e:smoke`: run Chromium smoke tests
- `npm run lint:unused`: scan unused files, dependencies, unresolved imports, and duplicates
- `npm run types:worker`: regenerate Worker binding types
- `npm run deploy`: build and deploy with Wrangler
- `npm run clean`: remove local build and test output

## Docs

- [Setup](docs/SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Cloudflare Deployment](docs/CLOUDFLARE_DEPLOYMENT.md)
- [Monitoring Quick Start](docs/MONITORING_QUICK_START.md)
- [Known Issues](docs/KNOWN_ISSUES.md)

## Good First Issues

Useful contribution areas:

- Add more RSS parser edge-case fixtures
- Improve OPML import validation and error messages
- Add an accessibility pass for reduced motion and keyboard navigation
- Document more Cloudflare deployment variants
- Add screenshots for RSS management, settings, and stats pages
- Expand Playwright coverage for language switching and RSS flows

See [CONTRIBUTING.md](CONTRIBUTING.md) and [ROADMAP.md](ROADMAP.md).

## Credits

- News API source: [vikiboss/60s](https://github.com/vikiboss/60s)

## License

MPL-2.0
