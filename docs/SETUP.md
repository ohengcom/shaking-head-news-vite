# Setup Guide

## 1. Prerequisites

- Node.js `>=22`
- npm `>=10`
- Optional services:
  - Cloudflare Workers KV binding (`APP_SETTINGS_KV`) for persistent user settings/stats
  - Google/Microsoft OAuth app credentials (for login)

## 2. Install

```bash
npm install
```

## 3. Environment Variables

Copy and edit:

```bash
cp .env.example .env.local
```

### Minimum for local development

- `BETTER_AUTH_URL=http://localhost:3001`
- `BETTER_AUTH_SECRET=<random-secret>`

### Recommended for full features

- OAuth:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `AUTH_MICROSOFT_ENTRA_ID_ID`
  - `AUTH_MICROSOFT_ENTRA_ID_SECRET`
  - `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID`
- Storage:
  - `APP_SETTINGS_KV` binding in `wrangler.jsonc`

### Optional

- `NEWS_API_BASE_URL`
- `NEXT_PUBLIC_ADSENSE_*`
- `NEXT_PUBLIC_GA_ID`
- `NEXT_PUBLIC_VERCEL_ANALYTICS`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `NEXT_PUBLIC_LOG_LEVEL`

## 4. Run

### vinext (primary runtime)

```bash
npm run dev
```

Open `http://localhost:3001`.

### Next.js (compatibility runtime)

```bash
npm run dev:next
```

Open `http://localhost:3000`.

## 5. Local Quality Checks

```bash
npm run type-check
npm run lint
npm run test
npm run build
npm run build:next
```

## 6. Notes

- If `APP_SETTINGS_KV` is not available, persistent reads fall back to empty/default results and writes fail fast.
- Better Auth currently supports fallback to `NEXTAUTH_*` env vars for migration compatibility.
