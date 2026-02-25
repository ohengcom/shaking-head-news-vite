# Monitoring Quick Start

## What Is Already in Repository

- Web vitals reporting hook: `app/web-vitals.tsx`
- Analytics helper module: `lib/analytics.ts`
- Logger abstraction: `lib/logger.ts`
- Sentry helper module: `lib/sentry.ts`

## Environment Variables

### Analytics

- `NEXT_PUBLIC_GA_ID`
- `NEXT_PUBLIC_VERCEL_ANALYTICS`

### Sentry

- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`

### Logging

- `NEXT_PUBLIC_LOG_LEVEL`

## Google Analytics Setup

1. Create GA4 property.
2. Set `NEXT_PUBLIC_GA_ID` in `.env.local`.
3. Inject GA script in `app/layout.tsx` (not auto-added by current code).
4. Validate with browser devtools and realtime report.

## Vercel Analytics

1. Install package if needed: `npm install @vercel/analytics`
2. Add `<Analytics />` component into root layout.
3. Enable Vercel Analytics in dashboard.

## Sentry

1. Install package if needed: `npm install @sentry/nextjs`
2. Run Sentry wizard for Next.js integration.
3. Configure DSN env vars.
4. Verify error capture in staging.

## Validation

- Trigger a test client error and check logs.
- Confirm web-vitals logs are emitted.
- Confirm no secret fields are leaked in logs.
