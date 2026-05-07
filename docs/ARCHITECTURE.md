# Architecture

## Runtime Split

- Client: Vite SPA rendered in the browser with React Router
- API: Cloudflare Worker powered by Hono
- Persistence: Cloudflare KV via the `APP_SETTINGS_KV` binding
- Auth: Better Auth mounted at `/api/auth/*`

## Request Flow

1. The browser loads `dist/client/index.html`.
2. React Router handles client-side navigation.
3. API calls go to Worker endpoints under `/api/*`.
4. Worker routes delegate to shared logic in `lib/actions/*`.
5. Persistent settings, stats, and RSS state are stored in KV.

## Project Layout

- `src/`: active browser runtime, routes, providers, and Vite-only entrypoints
- `src/styles/globals.css`: active shared stylesheet for the Vite app
- `worker/`: Cloudflare Worker entry and HTTP routing
- `components/`: shared UI and feature components used by the active SPA
- `lib/actions/`: Worker-side business logic
- `lib/api/*-client.ts`: browser fetch wrappers for Worker APIs
- `lib/server/`: request-context and Worker environment helpers
- `app/`: archived Next.js tree retained only for migration reference

## Compatibility Layer

Some shared components still import a subset of Next-flavored APIs. The active Vite runtime
maps those imports to local shims for:

- `next-intl`
- `next/navigation`
- `next/link`
- `next/cache`
- `next-themes`

These shims keep the current runtime Cloudflare-native while allowing incremental cleanup of
older component code.
