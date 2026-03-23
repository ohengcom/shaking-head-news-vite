# Architecture

## Runtime Split

- Client: Vite SPA rendered in the browser with React Router.
- API: Cloudflare Worker powered by Hono.
- Persistence: Cloudflare KV via the `APP_SETTINGS_KV` binding.
- Auth: Better Auth mounted at `/api/auth/*`.

## Request Flow

1. Browser loads `dist/client/index.html`.
2. Client routes are handled by React Router.
3. API calls go to Worker endpoints under `/api/*`.
4. Worker actions reuse shared logic from `lib/actions/*`.
5. Worker stores user settings, stats, and RSS state in KV.

## Project Layout

- `src/`
  Client entry, routes, providers, and Next compatibility shims.
- `worker/`
  Cloudflare Worker entry and HTTP routing.
- `components/`
  Shared UI and feature components.
- `lib/actions/`
  Business logic executed by the Worker.
- `lib/api/*-client.ts`
  Browser-side fetch wrappers for Worker APIs.
- `lib/server/`
  Worker environment and request-context helpers.

## Compatibility Layer

The repository still contains reusable components originally written against Next.js APIs. To avoid a risky full component rewrite, Vite aliases local shims for:

- `next-intl`
- `next/navigation`
- `next/link`
- `next/image`
- `next/dynamic`
- `next/cache`
- `next-themes`

This keeps the active runtime Cloudflare-native while allowing controlled reuse of existing feature code.

## Legacy Files

The historical `app/` tree remains in the repository for reference, but it is excluded from TypeScript build targets and is not part of the current runtime path.
