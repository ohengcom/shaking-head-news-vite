# Known Issues

## 1. Legacy Next Source Still Exists

The old `app/` directory remains in the repository for reference and gradual extraction. It is no longer part of the active runtime path.

## 2. Stats Route Is Still the Heaviest Client Chunk

Route-level splitting is in place, but the statistics page still carries charting dependencies and remains the largest lazy-loaded browser chunk.

## 3. Optional Monitoring Integrations Need Explicit Setup

Analytics and Sentry helpers are present, but they stay inactive until matching `VITE_*` environment variables are configured.
