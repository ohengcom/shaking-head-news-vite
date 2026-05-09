# Monitoring Quick Start

## Environment Variables

```env
VITE_GA_ID=
VITE_SENTRY_DSN=
VITE_LOG_LEVEL=info
```

## Notes

- Public client configuration should use `VITE_*`.
- Worker observability is configured through `wrangler.jsonc`.

## Recommended Order

1. Configure `VITE_LOG_LEVEL`.
2. Add `VITE_GA_ID` if Google Analytics is required.
3. Add `VITE_SENTRY_DSN` if Sentry is required.
4. Keep Worker observability enabled in `wrangler.jsonc` for Cloudflare dashboard logs and traces.
5. Rebuild with `npm run build`.
