# Architecture Overview

## Runtime Model

- Primary runtime: Next.js App Router (`app/`)
- Secondary runtime path: vinext + Vite (`vite.config.ts`)
- The project currently keeps both build paths for migration and compatibility validation.

## Core Modules

- UI & pages: `app/`, `components/`
- Server actions: `lib/actions/`
- Data access layer: `lib/dal/`
- Auth:
  - Server: `lib/auth.ts`
  - Client adapter: `lib/auth-client.ts`
  - Route handler: `app/api/auth/[...all]/route.ts`
- Storage: `lib/storage.ts` (Upstash Redis + in-memory fallback)
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
  - Settings, stats, RSS source definitions via `StorageKeys` in Redis

## Security & Middleware

- Middleware/proxy logic in `proxy.ts`:
  - Auth gate for protected routes (`/settings`, `/stats`, `/rss`)
  - Security headers
  - API CORS handling
