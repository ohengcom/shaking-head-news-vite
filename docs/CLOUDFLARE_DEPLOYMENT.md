# Cloudflare Deployment Guide

## Target Platform

This repository targets the Cloudflare-supported Vite native stack:

- `@cloudflare/vite-plugin`
- Cloudflare Workers for API execution
- static asset serving from `dist/client`

## Build Artifacts

Running `npm run build` produces:

- Worker bundle and generated Wrangler metadata under `dist/shaking_head_news_vite/`
- browser assets under `dist/client/`

## Required Wrangler Behavior

Current `wrangler.jsonc` should keep these values:

- `main = ./worker/index.ts`
- `assets.directory = ./dist/client`
- `assets.not_found_handling = single-page-application`
- `assets.run_worker_first = ["/", "/api/*", "/ads.txt"]`
- `observability.enabled = true`
- `observability.head_sampling_rate = 1`

## Recommended Variables

Wrangler secrets:

- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_SECRET`
- `AUTH_MICROSOFT_ENTRA_ID_SECRET`

Build variables or plain env:

- `BETTER_AUTH_URL`
- `NEWS_API_BASE_URL`
- `VITE_ADSENSE_CLIENT_ID`
- `VITE_ADSENSE_SLOT_SIDEBAR`
- `VITE_ADSENSE_SLOT_HEADER`
- `VITE_ADSENSE_SLOT_FOOTER`
- `VITE_ADSENSE_SLOT_INLINE`
- `VITE_LOG_LEVEL`

## Create KV Namespaces

```bash
npx wrangler kv namespace create APP_SETTINGS_KV
npx wrangler kv namespace create APP_SETTINGS_KV --preview
```

Copy the generated values into `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "APP_SETTINGS_KV",
    "id": "<production-id>",
    "preview_id": "<preview-id>",
  },
]
```

Then regenerate Worker binding types:

```bash
npm run types:worker
```

> The `id`/`preview_id` committed in this repository belong to the project author's account.
> Replace both with the namespaces you created above before your first deploy, or every
> request will fail KV binding resolution.

## Custom Domain

The committed `wrangler.jsonc` routes the Worker to the author's zone:

```jsonc
"routes": [
  {
    "pattern": "sn.oheng.com/*",
    "zone_name": "oheng.com",
  },
],
```

Self-hosters must adapt this before deploying:

- **Use your own domain**: replace `pattern` and `zone_name` with a domain whose zone exists
  in your Cloudflare account. Add a DNS record for the hostname (an `A`/`AAAA` record proxied
  by Cloudflare, or a `CNAME` to any target — Workers routes take precedence once the route
  matches). If you keep `workers_dev: true`, the `<worker-name>.<account>.workers.dev`
  hostname stays available as well.
- **No custom domain**: remove the `routes` block entirely and rely on the default
  `workers.dev` hostname.

After changing `wrangler.jsonc`, set `BETTER_AUTH_URL` (and any OAuth redirect URIs) to the
final origin so Better Auth issues cookies for the right host.

## Free Plan Limits

This app is designed to run on the Workers free plan, but the quota ceilings matter:

| Resource                          | Free plan limit | How this app stays inside it                                                                                                                      |
| --------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Worker requests                   | 100,000 / day   | Static assets are served free and unlimited; `run_worker_first` only invokes the Worker for `/`, `/api/*`, and `/ads.txt`                         |
| CPU time                          | 10 ms / request | Home feed snapshot is edge-cached; OPML imports are capped at 512 KB                                                                              |
| Subrequests                       | 50 / request    | Hot lists use a 5-minute cache; custom RSS fetches are capped at 30 sources with a single attempt each; `getSummaryStats` reads one 30-day window |
| Simultaneous outbound connections | 6 / request     | Parallel upstream fetches queue automatically                                                                                                     |
| KV reads                          | 100,000 / day   | Sessions, settings, stats, and RSS lists are per-key reads                                                                                        |
| KV writes                         | 1,000 / day     | Rotation beacons and stats reads use an in-memory rate limiter; only the stats write itself touches KV                                            |
| KV storage                        | 1 GB            | Stats keys carry a 90-day TTL                                                                                                                     |

KV quotas reset daily at 00:00 UTC. If a quota is exceeded, operations of that type fail
until the reset — watch Worker logs (observability is enabled) for KV error spikes.

## Configure Secrets

At minimum, set the auth secret before production deploys:

```bash
printf '<your-production-secret>' | npx wrangler secret put BETTER_AUTH_SECRET
```

Optional OAuth provider secrets:

```bash
printf '<google-secret>' | npx wrangler secret put GOOGLE_CLIENT_SECRET
printf '<microsoft-secret>' | npx wrangler secret put AUTH_MICROSOFT_ENTRA_ID_SECRET
```

## Deploy

```bash
npx wrangler whoami
npm run types:worker
npm run check
npm run deploy
```

## Route Behavior

- `/` runs through the Worker first so cached home feed data can be injected into the HTML response.
- Browser navigation such as `/settings` falls back to the SPA entry.
- API requests under `/api/*` are handled by the Worker.
- `/api/feed/home` uses Cloudflare Cache API for public home feed snapshots.
- `/ads.txt` is generated dynamically by the Worker.

## Home Feed Cache Behavior

The first request in a cold Cloudflare edge region can return static HTML while the Worker warms the home feed cache with `executionCtx.waitUntil`. Later requests in that region can receive the same SPA HTML with `window.__HOME_FEED__` already injected, avoiding an initial browser API round trip for the public home feed.
