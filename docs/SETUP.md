# Setup

## Prerequisites

- Node.js 22+
- npm 11+
- Cloudflare account if you plan to deploy

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

## Optional Environment Variables

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

Preferred public variable prefix is `VITE_`. The codebase still reads legacy `NEXT_PUBLIC_*` names as a fallback during migration.

## Local Development

```bash
npm run dev
```

The dev server runs on `http://localhost:3001`.

## Cloudflare Login

Before any remote deploy:

```bash
npx wrangler whoami
```

If not authenticated:

```bash
npx wrangler login
```
