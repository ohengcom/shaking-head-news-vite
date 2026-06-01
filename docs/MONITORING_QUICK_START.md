# Monitoring Quick Start

## Environment Variables

```env
VITE_LOG_LEVEL=info
```

## Notes

- Public client configuration should use `VITE_*`.
- Worker observability is configured through `wrangler.jsonc`.

## Recommended Order

1. Configure `VITE_LOG_LEVEL`.
2. Keep Worker observability enabled in `wrangler.jsonc` for Cloudflare dashboard logs and traces.
3. Rebuild with `npm run build`.
