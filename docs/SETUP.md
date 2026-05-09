# Setup

## Prerequisites

- Node.js 22+
- npm 11.11+
- Cloudflare account for remote deploys

## Install

```bash
npm install
cp .env.example .env.local
```

## Required Environment Variables

```env
BETTER_AUTH_URL=http://localhost:3001
BETTER_AUTH_SECRET=
```

Generate a local secret with:

```bash
openssl rand -hex 32
```

## Common Optional Variables

```env
NEWS_API_BASE_URL=https://news.ravelloh.top

VITE_ADSENSE_CLIENT_ID=
VITE_ADSENSE_SLOT_SIDEBAR=
VITE_ADSENSE_SLOT_HEADER=
VITE_ADSENSE_SLOT_FOOTER=
VITE_ADSENSE_SLOT_INLINE=

VITE_GA_ID=
VITE_SENTRY_DSN=
VITE_LOG_LEVEL=debug
```

Public client configuration uses the `VITE_` prefix.

If `NEWS_API_BASE_URL` is not set, local development uses the public upstream feed by default.
Expected upstream `401`/`403`/`404` responses are logged once in `development` and `test`, and
the UI degrades to an empty feed.

## Local Commands

```bash
npm run dev
npm run types:worker
npm run check
npm run test:e2e:smoke
```

Default local URL: `http://localhost:3001`

## Cloudflare Login

Before any remote deploy:

```bash
npx wrangler whoami
```

If not authenticated:

```bash
npx wrangler login
```

## Cloudflare KV

Persistent settings, stats, auth helper data, and RSS state use the `APP_SETTINGS_KV`
binding configured in `wrangler.jsonc`.

Create production and preview namespaces:

```bash
npx wrangler kv namespace create APP_SETTINGS_KV
npx wrangler kv namespace create APP_SETTINGS_KV --preview
```

Copy the generated `id` and `preview_id` into `wrangler.jsonc`, then regenerate Worker
types:

```bash
npm run types:worker
```
