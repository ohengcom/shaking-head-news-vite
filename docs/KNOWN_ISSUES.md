# Known Issues

## 1. Archived Next.js Tree Still Exists

The historical `app/` directory remains in the repository for migration reference. It is not
part of the active Vite runtime, but it still increases repository surface area.

## 2. Settings Route Is Still the Heaviest Authenticated Page

The statistics chart now uses a lightweight SVG renderer, so the previous `recharts` payload is
gone. The largest authenticated page is currently the settings route, which still bundles Radix
controls and motion-heavy interaction code.

## 3. Home Feed Depends on an External Upstream

If `NEWS_API_BASE_URL` returns `403`, `404`, or other upstream failures, the UI degrades to an
empty state correctly. Local `development` and `test` now deduplicate expected upstream `401`,
`403`, and `404` responses to a single warning, but production still logs the full error details.
