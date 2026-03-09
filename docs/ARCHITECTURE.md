# Architecture Overview

## Runtime Model

- Primary runtime: vinext + Vite on Cloudflare Workers (`vite.config.ts`, `worker/index.ts`)
- Compatibility runtime: Next.js App Router (`app/` with `*:next` scripts only)
- Development, build, Playwright, and deployment now default to the vinext path.

## Core Modules

- UI & pages: `app/`, `components/`
- Server actions: `lib/actions/`
- Data access layer: `lib/dal/`
- Auth:
  - Server: `lib/auth.ts`
  - Client adapter: `lib/auth-client.ts`
  - Route handler: `app/api/auth/[...all]/route.ts`
- Storage: `lib/storage.ts` (Cloudflare KV binding + recent-write cache)
- Tier gating:
  - Config: `lib/config/features.ts`
  - Server helper: `lib/tier-server.ts`
  - Client hook: `hooks/use-user-tier.ts`
- i18n:
  - Request config: `i18n.ts`
  - Messages: `messages/*.json`

## Auth Flow

1. User clicks social login on `/login`.
2. Client calls `signIn()` from `lib/auth-client.ts`.
3. Better Auth handles OAuth callback under `/api/auth/[...all]`.
4. Server-side `auth()` returns normalized session object.
5. User settings bootstrap runs on first authenticated access.

## Data Flow

- News sources:
  - Daily/API news from `lib/actions/news.ts`
  - Trending/hot-list from `lib/api/*`
  - Custom RSS from user-managed feeds
- Persistent user state:
  - Settings, stats, RSS source definitions via `StorageKeys` in Cloudflare KV

## Security & Middleware

- Middleware/proxy logic in `proxy.ts`:
  - Security headers
  - Applied only to non-API page requests
