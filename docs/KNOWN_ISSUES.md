# Known Issues

## 1. Settings Route Is Still the Heaviest Authenticated Page

The statistics chart now uses a lightweight SVG renderer, so the previous `recharts` payload is
gone. The largest authenticated page is currently the settings route, which still bundles Radix
controls and motion-heavy interaction code.

## 2. Home Feed Depends on an External Upstream

If `NEWS_API_BASE_URL` returns `403`, `404`, or other upstream failures, the UI degrades to an
empty state correctly. Local `development` and `test` deduplicate expected upstream `401`, `403`,
and `404` responses to a single warning, but production still logs the full error details.

## 3. Pro Is a Self-Hosted Preview

The Pro tier is currently a feature preview flag stored in user settings. There is no billing or
entitlement provider in this repository. Self-hosted deployers can keep the preview, wire it to
their own entitlement system, or remove the toggle route.

## 4. RSS Parsing Is Best-Effort

RSS parsing uses `fast-xml-parser`, but OPML import still uses simple outline extraction. This is
acceptable for personal feeds, but a public multi-user deployment should add stricter file limits,
streaming safeguards, and a more complete OPML parser.

## 5. Home Feed Cache Is Edge-Local

The public home feed snapshot uses Cloudflare Cache API. Cache entries are local to the edge region, so the first request in a new region may receive static HTML and then fall back to `/api/feed/home` while the Worker warms the cache in the background.
