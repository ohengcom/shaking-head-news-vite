# Deployment

## Standard Flow

```bash
npm run lint:unused
npm run check
npm run deploy
```

For a fresh Cloudflare project, create KV namespaces first:

```bash
npx wrangler kv namespace create APP_SETTINGS_KV
npx wrangler kv namespace create APP_SETTINGS_KV --preview
npm run types:worker
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
- Keep `BETTER_AUTH_URL` aligned with the deployed origin.

## Dry Run

```bash
npm run build
npx wrangler deploy --dry-run
```
