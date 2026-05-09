# Cloudflare Deployment Guide

## Target Platform

This repository targets the Cloudflare-supported Vite native stack:

- `@cloudflare/vite-plugin`
- Cloudflare Workers for API execution
- static asset serving from `dist/client`

## Build Artifacts

Running `npm run build` produces:

- Worker bundle and generated Wrangler metadata under `dist/shaking_head_news_vite/`
- browser assets under `dist/client/`

## Required Wrangler Behavior

Current `wrangler.jsonc` should keep these values:

- `main = ./worker/index.ts`
- `assets.directory = ./dist/client`
- `assets.not_found_handling = single-page-application`
- `assets.run_worker_first = ["/api/*", "/ads.txt"]`
- `observability.enabled = true`
- `observability.head_sampling_rate = 1`

## Recommended Variables

Wrangler secrets:

- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_SECRET`
- `AUTH_MICROSOFT_ENTRA_ID_SECRET`
- `SENTRY_AUTH_TOKEN`

Build variables or plain env:

- `BETTER_AUTH_URL`
- `NEWS_API_BASE_URL`
- `VITE_ADSENSE_CLIENT_ID`
- `VITE_ADSENSE_SLOT_SIDEBAR`
- `VITE_ADSENSE_SLOT_HEADER`
- `VITE_ADSENSE_SLOT_FOOTER`
- `VITE_ADSENSE_SLOT_INLINE`
- `VITE_GA_ID`
- `VITE_SENTRY_DSN`
- `VITE_LOG_LEVEL`

## Create KV Namespaces

```bash
npx wrangler kv namespace create APP_SETTINGS_KV
npx wrangler kv namespace create APP_SETTINGS_KV --preview
```

Copy the generated values into `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "APP_SETTINGS_KV",
    "id": "<production-id>",
    "preview_id": "<preview-id>",
  },
]
```

Then regenerate Worker binding types:

```bash
npm run types:worker
```

## Configure Secrets

At minimum, set the auth secret before production deploys:

```bash
printf '<your-production-secret>' | npx wrangler secret put BETTER_AUTH_SECRET
```

Optional OAuth provider secrets:

```bash
printf '<google-secret>' | npx wrangler secret put GOOGLE_CLIENT_SECRET
printf '<microsoft-secret>' | npx wrangler secret put AUTH_MICROSOFT_ENTRA_ID_SECRET
```

## Deploy

```bash
npx wrangler whoami
npm run types:worker
npm run check
npm run deploy
```

## Route Behavior

- Browser navigation such as `/settings` falls back to the SPA entry.
- API requests under `/api/*` are handled by the Worker.
- `/ads.txt` is generated dynamically by the Worker.
