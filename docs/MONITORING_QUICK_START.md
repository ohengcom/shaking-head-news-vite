# Monitoring Quick Start

## Environment Variables

```env
VITE_GA_ID=
VITE_VERCEL_ANALYTICS=
VITE_SENTRY_DSN=
VITE_LOG_LEVEL=info
```

## Notes

- Public client configuration should use `VITE_*`.
- Legacy `NEXT_PUBLIC_*` names are still read as a fallback.
- Vercel Analytics is optional and not required for the Cloudflare deployment path.

## Recommended Order

1. Configure `VITE_LOG_LEVEL`.
2. Add `VITE_GA_ID` if Google Analytics is required.
3. Add `VITE_SENTRY_DSN` if Sentry is required.
4. Add `VITE_VERCEL_ANALYTICS` only if that integration is explicitly needed.
5. Rebuild with `npm run build`.
