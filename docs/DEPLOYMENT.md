# Deployment

## Standard Flow

```bash
npm run lint
npm run type-check
npm test
npm run build
npm run deploy
```

## Current Cloudflare Topology

- Worker entry: `worker/index.ts`
- Static assets: `dist/client`
- SPA fallback: enabled in `wrangler.jsonc`
- API-first routing: `/api/*` and `/ads.txt` always hit the Worker first

## Wrangler Notes

- Check auth with `npx wrangler whoami`
- Deploy with `wrangler deploy`
- Routes are defined in `wrangler.jsonc`
- Secrets should be stored with `wrangler secret put`

## Local Verification

```bash
npm run build
npx wrangler deploy --dry-run
```
