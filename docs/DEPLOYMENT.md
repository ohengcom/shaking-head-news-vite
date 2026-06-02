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
- Worker-first routes: `/`, `/api/*`, and `/ads.txt`

## Notes

- The home route is Worker-first so the deployed Worker can inject cached public feed snapshots into the initial HTML response.
- Cloudflare Cache API is edge-local; expect a cold region to warm before inline home feed data appears consistently.

- Verify Wrangler access with `npx wrangler whoami`.
- Store private values with `wrangler secret put`.
- Provide public client config through `VITE_*` build variables.
- Keep `BETTER_AUTH_URL` aligned with the deployed origin.

## Dry Run

```bash
npm run build
npx wrangler deploy --dry-run
```
