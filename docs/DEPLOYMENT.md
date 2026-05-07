# Deployment

## Standard Flow

```bash
npm run lint:unused
npm run check
npm run deploy
```

## Current Cloudflare Topology

- Worker entry: `worker/index.ts`
- Static assets: `dist/client`
- SPA fallback: enabled in `wrangler.jsonc`
- Worker-first routes: `/api/*` and `/ads.txt`

## Notes

- Verify Wrangler access with `npx wrangler whoami`.
- Store private values with `wrangler secret put`.
- Provide public client config through `VITE_*` build variables.
- Keep `NEXT_PUBLIC_*` only as a temporary fallback for existing secrets.

## Dry Run

```bash
npm run build
npx wrangler deploy --dry-run
```
