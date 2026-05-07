# Known Issues

## 1. Archived Next.js Tree Still Exists

The historical `app/` directory remains in the repository for migration reference. It is not
part of the active Vite runtime, but it still increases repository surface area and can confuse
new contributors.

## 2. Settings Route Is Still the Heaviest Authenticated Page

The statistics chart now uses a lightweight SVG renderer, so the previous `recharts` payload is
gone. The largest authenticated page is currently the settings route, which still bundles Radix
controls and motion-heavy interaction code.

## 3. Home Feed Depends on an External Upstream

If `NEWS_API_BASE_URL` returns `403`, `404`, or other upstream failures, the UI degrades to an
empty state correctly. Local `development` and `test` now deduplicate expected upstream `401`,
`403`, and `404` responses to a single warning, but production still logs the full error details.

## 4. Pro Is a Self-Hosted Preview

The Pro tier is currently a feature preview flag stored in user settings. There is no billing or
entitlement provider in this repository. Self-hosted deployers can keep the preview, wire it to
their own entitlement system, or remove the toggle route.

## 5. RSS Parsing Is Best-Effort

RSS parsing uses `fast-xml-parser`, but OPML import still uses simple outline extraction. This is
acceptable for personal feeds, but a public multi-user deployment should add stricter file limits,
streaming safeguards, and a more complete OPML parser.
