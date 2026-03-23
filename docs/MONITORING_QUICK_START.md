# Monitoring Quick Start

## Environment Variables

```env
VITE_GA_ID=
VITE_SENTRY_DSN=
VITE_LOG_LEVEL=info
```

## Notes

- Public client-side configuration now uses `VITE_*`.
- Legacy `NEXT_PUBLIC_*` names are read only as a migration fallback.
- Vercel Analytics is not part of the default Cloudflare deployment path.

## Recommended Order

1. Configure `VITE_LOG_LEVEL`.
2. Add `VITE_GA_ID` if Google Analytics is required.
3. Add `VITE_SENTRY_DSN` if Sentry is required.
4. Rebuild with `npm run build`.
