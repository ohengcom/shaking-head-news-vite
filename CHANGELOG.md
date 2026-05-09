# Changelog

All notable changes to Shaking Head News will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Runtime Surface**: Cleaned the project surface so the active stack is presented as Vite SPA + Cloudflare Worker only
- **Environment Variables**: Removed public-variable fallback aliases and standardized on `VITE_*` for client-exposed build config
- **Tooling**: Added `npm run check`, `npm run lint:unused`, `npm run test:e2e:smoke`, and `npm run clean`
- **CI/CD**: Updated GitHub Actions to the current npm version, added Knip scanning, and fixed the Cloudflare deployment workflow to use the active Vite build path

### Removed

- **Framework Residue**: Removed stale client directives, platform ignore files, fallback environment names, and framework-specific runtime recovery checks
- **Unused Dependencies**: Removed direct packages that were only supporting deleted code paths

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
