# Shaking Head News

Cloudflare-native news reader built with Vite, React, and a Worker-backed API.

[![License](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)
[![Runtime](https://img.shields.io/badge/runtime-Cloudflare%20Workers-f38020)](https://workers.cloudflare.com/)
[![Frontend](https://img.shields.io/badge/frontend-Vite%20%2B%20React-646cff)](https://vite.dev/)
[![Version](https://img.shields.io/badge/version-2.3.1-2563eb)](CHANGELOG.md)

## Active Stack

- Frontend: Vite 8, React 19, React Router 7
- Edge API: Cloudflare Worker + Hono
- Auth: Better Auth
- Storage: Cloudflare KV
- UI: Tailwind CSS 4, Radix UI, Framer Motion
- Testing: Vitest + Playwright

## Runtime Layout

- Browser app entry: `src/main.tsx`
- Browser styles: `src/styles/globals.css`
- Worker entry: `worker/index.ts`
- Worker deployment config: `wrangler.jsonc`
- Shared UI: `components/`
- Shared business logic: `lib/`

The repository still keeps a legacy `app/` tree from the previous Next.js implementation.
It is retained only as an archive and is not part of the active Vite runtime path.

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Default URL: `http://localhost:3001`

## Environment Variables

Required:

- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`

Common optional variables:

- `NEWS_API_BASE_URL`
- `VITE_ADSENSE_CLIENT_ID`
- `VITE_ADSENSE_SLOT_SIDEBAR`
- `VITE_ADSENSE_SLOT_HEADER`
- `VITE_ADSENSE_SLOT_FOOTER`
- `VITE_ADSENSE_SLOT_INLINE`
- `VITE_GA_ID`
- `VITE_SENTRY_DSN`
- `VITE_VERCEL_ANALYTICS`
- `VITE_LOG_LEVEL`

`NEXT_PUBLIC_*` values are still accepted as a migration fallback, but new configuration
should use `VITE_*`.

If `NEWS_API_BASE_URL` is left unset in local development, the app falls back to the public
upstream feed. Expected upstream `401`/`403`/`404` responses are deduplicated to a single warning
in `development` and `test`, while production keeps full error logging.

## Commands

- `npm run dev`: start the local Vite dev server
- `npm run build`: build client assets and the Worker bundle
- `npm run preview`: preview the client build
- `npm run deploy`: build and deploy with Wrangler
- `npm run check`: run lint, type-check, unit tests, and build
- `npm run lint:unused`: detect unused files, exports, and dependencies with Knip
- `npm run test:e2e:smoke`: run the local Chromium smoke suite
- `npm run test:e2e`: run the full Playwright browser matrix
- `npm run clean`: remove local build and test artifacts

## Deployment

Before a remote deploy:

```bash
npx wrangler whoami
npm run check
npm run deploy
```

Current Cloudflare asset routing:

- `assets.directory = ./dist/client`
- `assets.not_found_handling = single-page-application`
- `assets.run_worker_first = ["/api/*", "/ads.txt"]`

## Documentation

- [Setup](docs/SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Cloudflare Deployment](docs/CLOUDFLARE_DEPLOYMENT.md)
- [Monitoring Quick Start](docs/MONITORING_QUICK_START.md)
- [Known Issues](docs/KNOWN_ISSUES.md)

## Credits

- News API: [vikiboss/60s](https://github.com/vikiboss/60s)
