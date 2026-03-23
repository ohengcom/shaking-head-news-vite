# Cloudflare Deployment Guide

## Target Platform

This repository now targets the Cloudflare-supported Vite native stack:

- `@cloudflare/vite-plugin`
- Cloudflare Workers for API execution
- static asset serving from `dist/client`

## Build Artifacts

Running `npm run build` produces:

- Worker bundle and generated Wrangler metadata under `dist/shaking_head_news_vite/`
- client assets under `dist/client/`

## Required Configuration

Current `wrangler.jsonc` should keep these behaviors:

- `main = ./worker/index.ts`
- `assets.directory = ./dist/client`
- `assets.not_found_handling = single-page-application`
- `assets.run_worker_first = ["/api/*", "/ads.txt"]`

## Deploy

```bash
npx wrangler whoami
npm run build
npm run deploy
```

## Secrets

Recommended as Wrangler secrets:

- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_SECRET`
- `AUTH_MICROSOFT_ENTRA_ID_SECRET`
- `SENTRY_AUTH_TOKEN`

Recommended as plain vars or build env:

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

## Route Behavior

- Browser navigation such as `/settings` falls back to the SPA entry.
- API requests under `/api/*` are handled by the Worker.
- `/ads.txt` is generated dynamically by the Worker.

## Recommended Verification

```bash
npm run lint
npm run type-check
npm test
npm run build
npx wrangler deploy --dry-run
```
