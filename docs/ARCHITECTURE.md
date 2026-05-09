# Architecture

## Runtime Model

- Client: Vite SPA rendered in the browser with React Router
- API: Cloudflare Worker powered by Hono
- Persistence: Cloudflare KV via the `APP_SETTINGS_KV` binding
- Auth: Better Auth mounted at `/api/auth/*`
- Observability: Cloudflare Workers observability enabled in `wrangler.jsonc`

## Request Flow

1. The browser loads `dist/client/index.html`.
2. React Router handles client-side navigation.
3. API calls go to Worker endpoints under `/api/*`.
4. Worker routes delegate to shared logic in `lib/actions/*`.
5. Persistent settings, stats, and RSS state are stored in KV.

## Project Layout

- `src/`: active browser runtime, routes, providers, and Vite entrypoints
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
