# Setup Guide

## 1. Prerequisites

- Node.js `>=22`
- npm `>=10`
- Optional services:
  - Upstash Redis (for persistent user settings/stats)
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

- `BETTER_AUTH_URL=http://localhost:3000`
- `BETTER_AUTH_SECRET=<random-secret>`

### Recommended for full features

- OAuth:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `AUTH_MICROSOFT_ENTRA_ID_ID`
  - `AUTH_MICROSOFT_ENTRA_ID_SECRET`
  - `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID`
- Storage:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`

### Optional

- `NEWS_API_BASE_URL`
- `NEXT_PUBLIC_ADSENSE_*`
- `NEXT_PUBLIC_GA_ID`
- `NEXT_PUBLIC_VERCEL_ANALYTICS`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `NEXT_PUBLIC_LOG_LEVEL`

## 4. Run

### Next.js (primary runtime)

```bash
npm run dev
```

Open `http://localhost:3000`.

### vinext (migration path)

```bash
npm run dev:vinext
```

Open `http://localhost:3001`.

## 5. Local Quality Checks

```bash
npm run type-check
npm run lint
npm run test
npm run build
npm run build:vinext
```

## 6. Notes

- If Redis is not configured, app falls back to in-memory storage (data not persisted across restarts).
- Better Auth currently supports fallback to `NEXTAUTH_*` env vars for migration compatibility.
