# Architecture

## Runtime Model

- Client: Vite SPA rendered in the browser with React Router 7 Data Router
- API: Cloudflare Worker powered by Hono
- Persistence: Cloudflare KV via the `APP_SETTINGS_KV` binding
- Auth: Better Auth mounted at `/api/auth/*`
- Observability: Cloudflare Workers observability enabled in `wrangler.jsonc`

## Request Flow

1. Cloudflare routes `/` through the Worker first via `assets.run_worker_first`.
2. The Worker fetches the SPA HTML from the `ASSETS` binding.
3. If a valid home feed snapshot exists in Cache API, the Worker injects it as `window.__HOME_FEED__` before returning HTML.
4. React Router Data Router handles client-side navigation, lazy route modules, protected route wrappers, and route-level error boundaries after hydration.
5. API calls go to Worker endpoints under `/api/*`.
6. Worker routes delegate to shared logic in `lib/actions/*`.
7. Persistent settings, stats, and RSS state are stored in KV.

## Home Feed Cache

The public home feed is exposed at `/api/feed/home?locale=zh|en`. The Worker stores successful responses in Cloudflare Cache API for one hour with stale-while-revalidate metadata. The browser first checks the inline `window.__HOME_FEED__` snapshot for the active locale and only calls the API when the snapshot is missing, stale for the requested locale, or invalid.

Cache API is edge-local, so a cold region can return static HTML while the Worker warms the feed cache in the background.

## Project Layout

- `src/`: active browser runtime, routes, providers, and Vite entrypoints
- `src/app/App.tsx`: SPA shell plus the React Router Data Router configuration
- `src/styles/globals.css`: active shared stylesheet for the SPA
- `worker/`: Cloudflare Worker entry and HTTP routing
- `worker-configuration.d.ts`: generated Worker binding types from `wrangler types`
- `components/`: shared UI and feature components used by the SPA
- `lib/actions/`: Worker-side business logic
- `lib/api/*-client.ts`: browser fetch wrappers for Worker APIs
- `lib/server/`: request-context and Worker environment helpers
- `lib/i18n.ts`: local i18n bridge for the active runtime
- `lib/router.ts`: local router helpers built on top of React Router
- `lib/link.tsx`: local link wrapper used by shared components

## Routing

The browser entry creates a single `createBrowserRouter` instance outside the React tree and
renders it with `RouterProvider`. Page routes are lazy-loaded through route modules, while the
shared app shell keeps layout, providers, and posture-rotation behavior centralized.

Settings, stats, and RSS routes still use the local `RequireAuth` wrapper so the product's current
client-side sign-in flow stays unchanged.

## Design Intent

This repository has a single production runtime: `Vite + React Router + Cloudflare Worker`.
Shared code depends on local runtime modules directly so the deployment target stays obvious to
contributors.

## Worker Types

Worker bindings are generated with:

```bash
npm run types:worker
```

Regenerate this file after changing `wrangler.jsonc` or `.env.example`.
