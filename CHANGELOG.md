# Changelog

All notable changes to Shaking Head News will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Release versions use the date-based `YYYY.M.D` format.

## [Unreleased]

### Fixed

- **RSS Data Safety**: Invalid stored RSS sources are now skipped individually instead of
  collapsing the whole list, and read-modify-write flows use a strict storage read so a
  transient KV failure can no longer persist an empty list over stored sources.
- **Rate Limiting**: Rate-limited API calls now return `429` via `RateLimitError` instead of
  a generic `500`/`400`, and settings API errors keep their real status codes.

### Changed

- **Dependencies**: Refreshed all dependencies to current releases, including
  React 19.3, Vite 8.3, Wrangler 4.131, Better Auth 1.7 (whose secondary storage
  contract now includes `getAndDelete`/`increment`), Zod 4.6, Hono 4.13,
  Framer Motion 13, and `@cloudflare/workers-types` 5. TypeScript 7 and Vitest 5
  are intentionally deferred: `typescript-eslint` currently supports TypeScript
  `<6.1.0`, and `@cloudflare/vitest-pool-workers` peers Vitest `^4.1.0`.
- **Free Tier Sustainability**: Rotation reporting and stats reads use an in-memory rate
  limiter instead of KV-backed counters, halving KV writes for the hottest paths.
- **Subrequest Budget**: `getSummaryStats` reads a single 30-day window instead of three
  ranges; custom RSS fetches are capped at 30 enabled sources with one attempt each; hot
  list upstreams are cached for 5 minutes and all upstream fetches carry timeouts.
- **OPML Import**: Uploads above 512 KB are rejected with `413` before parsing.
- **Frontend**: `LazyMotion` now wraps the app root with strict mode, settings drag-reorder
  uses native HTML5 drag-and-drop, and an inline pre-paint script applies the persisted
  theme to remove the dark-mode flash.
- **Tooling**: Vitest cache directories are Windows-conditional (CI keeps its default),
  Worker tests run as a dedicated CI job on pull requests, and the unused `IMAGES` binding
  was removed from `wrangler.jsonc`.

### Removed

- **Dead Code**: Removed the unused trending pipeline, `refreshNews`, `refreshRSSFeed`,
  `checkDailyGoal`, several unused error/validation helpers, duplicate default settings,
  and the conflicting `.commitlintrc` config.

## [2026.7.3] - 2026-07-03

### Changed

- **Dependencies**: Updated the active React, Vite, Cloudflare, Hono, Radix, Vitest, Wrangler, and supporting packages to current compatible releases.
- **Routing**: Migrated the SPA entry from `BrowserRouter` route rendering to React Router 7 Data Router with lazy route modules and a route-level error boundary.
- **Testing**: Stabilized the Vitest jsdom environment with explicit storage mocks and moved the Vitest cache under `C:/temp/shaking-head-news-vite/vitest-cache`.

### Fixed

- **Security**: Resolved npm audit findings by upgrading vulnerable Hono and Vite ranges.
- **OPML Import**: Replaced regex-based OPML outline parsing with `fast-xml-parser`, added nested-outline support, and skipped duplicate URLs within the same import.
- **Unit Tests**: Fixed storage-related jsdom failures in settings and stats component tests.

## [2026.6.2] - 2026-06-02

### Added

- **Home First Paint**: Added Cloudflare Worker-first home HTML handling that can inline cached home feed data into the initial document.
- **Metadata**: Added favicon, shortcut icon, and Apple touch icon metadata using the existing app icon.

### Changed

- **Footer Compliance**: Updated the ICP display text to `沪ICP备2022000575号` while keeping the MIIT link unchanged.
- **Rotation Visibility**: Continuous random rotation now enforces an 8-degree minimum target angle and an 8-degree minimum delta between consecutive angles.
- **Cloudflare Caching**: Cached the public home feed endpoint with Cloudflare Cache API and reused valid snapshots before falling back to browser API loading.
- **Build Output**: Scoped custom Vite vendor chunking to the client build so Worker server dependencies stay in a deployable bundle.

### Fixed

- **Cloudflare Deploy**: Fixed Worker deployment validation failures caused by Worker-side vendor chunk splitting.
- **Home Load Latency**: Reduced first-load home feed delay by avoiding the initial browser `/api/feed/home` request when the HTML already contains a matching inline snapshot.

## [2026.6.1] - 2026-06-01

### Changed

- **Cloudflare Runtime**: Removed global Worker environment bridging in favor of request-scoped context access for bindings and auth configuration
- **Tooling**: Added Cloudflare Workers Vitest coverage to the standard validation flow and fixed Knip unused-dependency checks for Worker test modules
- **Build Output**: Split React, UI, and vendor chunks with Rolldown to keep the initial client entry below the default Vite warning threshold
- **Compatibility**: Updated the Worker compatibility date to `2026-06-01` and regenerated Worker binding types

### Fixed

- **RSS Safety**: Added timeout and bounded streaming reads for custom RSS feeds to avoid buffering unbounded upstream responses

## [2.3.2] - 2026-05-09

### Changed

- **Project Packaging**: Reworked README, contribution docs, roadmap, issue templates, and social metadata to improve first-time evaluation
- **Product Language**: Replaced health-outcome wording with posture-break and gentle-reminder language
- **Runtime Surface**: Cleaned the project surface so the active stack is presented as Vite SPA + Cloudflare Worker only
- **Environment Variables**: Removed public-variable fallback aliases and standardized on `VITE_*` for client-exposed build config
- **Tooling**: Added `npm run check`, `npm run lint:unused`, `npm run test:e2e:smoke`, and `npm run clean`
- **CI/CD**: Updated GitHub Actions to the current npm version, added Knip scanning, upgraded action majors, added Dependabot coverage for GitHub Actions, and fixed the Cloudflare deployment workflow to use the active Vite build path
- **Metadata**: Pointed package homepage metadata to the live Cloudflare deployment

### Removed

- **Framework Residue**: Removed stale client directives, platform ignore files, fallback environment names, and framework-specific runtime recovery checks
- **Unused Dependencies**: Removed direct packages that were only supporting deleted code paths

### Added

- **Preview Assets**: Added production-generated README screenshot and Open Graph image for repository and social previews
- **Security Policy**: Added a vulnerability reporting policy for maintainers and self-hosters

### Fixed

- **Reduced Motion**: Kept the app shell test target stable when reduced-motion mode disables animation wrappers

## [2.3.1] - 2026-03-05

### Changed

- **Version Bump**: Updated package version from `2.3.0` to `2.3.1`
- **README Refresh**: Updated project status, local development guidance, and command usage notes

### Removed

- **Redundant Test File**: Removed machine-specific duplicate test file `tests/unit/actions/stats.test-CNSHNSLI01.ts`
- **Temporary Artifacts**: Removed local debug screenshots (`tmp-*.png`) and regenerated ignored build/test output directories

## [2.3.0 (vite edition)] - 2026-02-25

### Changed

- **Runtime**: Adopted the Vite SPA + Cloudflare Worker runtime model
- **Auth**: Standardized authentication on Better Auth under `/api/auth/*`
- **Build Paths**: Standardized production output under the Cloudflare Workers build path
- **Environment Docs**: Updated `.env.example` to match currently used variables (auth, ads, analytics, monitoring)
- **Project Docs**: Rebuilt core documentation under `docs/` (setup, architecture, deployment, testing, monitoring, known issues)

### Fixed

- **Stale Labels**: Updated About page tech stack label to `Better Auth`
- **Testing Guide Script**: Updated auth env var names in `scripts/start-testing.ps1`

## [2.2.0] - 2026-01-26

### Added

- **Ad Settings**: Pro users can now toggle advertising banners in the settings page (persisted via localStorage)
- **Ad layout**: Implemented sticky, vertically centered sidebars for better ad visibility and user experience

### Changed

- **Rate Limiting**: Relaxed strict rate limits (Std: 300/min, Relaxed: 1000/min) to prevent false positives for active users
- **Layout**: Increased desktop layout spacing (gap-24) to improve visual separation between content and sidebars
- **Cleanup**: Removed redundant machine-specific configuration files and documentation

### Fixed

- **RSS Parsing**: Added strict type safety to V2EX RSS feed parsing to prevent `l.match` crashes
- **AdSense**: Fixed CSP errors and script loading issues by determining Pro status server-side
- **AdSense**: Fixed ad banners persisting after being disabled in settings by hydrating initial Pro status

### Removed

- Redundant duplicate configuration files (`*-CNSHNSLI01*`)

## [2.1.1] - 2026-01-13

### Changed

- **Repository Migration**: Migrated repository from `024812` to `ohengcom` organization
- **Pro Feature**: Pro status now stored in Cloudflare KV-backed settings storage instead of localStorage
- **Pro Unlock**: Added one-click Pro unlock button in settings for testing

### Fixed

- **Pro Status Sync**: Fixed Pro status not updating across shared page surfaces (Header, RSS page, Stats page)
- **BlurredStats**: Fixed stats page showing guest content for Pro users by passing server tier to component
- **SessionProvider**: Added SessionProvider to fix useSession hook errors

## [2.1.0] - 2025-12-01

### Changed

- **Tech Stack Upgrade**: Upgraded to React 19.2.0 and Tailwind CSS 4.1.17
- **Rotation Enhancement**: Increased minimum rotation angle from 5-10 degrees to 8-25 degrees for improved shaking effect visibility

### Fixed

- **Build Configuration**: Removed ignored deployment settings
- **Node Version**: Updated to Node.js 22.x for deployment consistency

## [2.0.0] - 2025-11-13

### Major Rewrite

Complete rewrite from a browser extension to a hosted web application.

### Added

- **Modern Tech Stack**: React 19, TypeScript
- **User Authentication**: OAuth-based sign-in
- **Cloud Sync**: Settings sync via persistent cloud-backed storage
- **RSS Management**: Add, manage, and export custom RSS feeds
- **Statistics Dashboard**: Track rotation activity with charts
- **Health Reminders**: Browser notifications for neck health
- **Internationalization**: Full Chinese and English support
- **Theme Support**: Light, dark, and system theme modes
- **Responsive Design**: Mobile-first, works on all devices
- **Performance**: Optimized assets and code splitting
- **Security**: Rate limiting, input validation, CSP headers
- **Testing**: Unit tests (Vitest), E2E tests (Playwright)
- **CI/CD**: GitHub Actions workflow
- **Monitoring**: Logging and analytics integration

### Changed

- Migrated from browser extension to web application
- Replaced Pinia with Zustand for state management
- Improved UI with Tailwind CSS 4 and Shadcn/ui
- Enhanced accessibility features

### Removed

- Browser extension functionality (now web-only)
- Local-only storage (now supports cloud sync)

## [1.x.x] - Previous Versions

See the original [WAI project](https://github.com/dukeluo/wai) for version 1.x changelog.

---

## Credits

This project is based on the excellent [WAI](https://github.com/dukeluo/wai) project by [@dukeluo](https://github.com/dukeluo).
