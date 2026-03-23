# Testing

## Validation Commands

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build`
- `npm run test:e2e`

## Current Expectations

- Unit tests should pass under Vitest without relying on Next.js runtime APIs.
- Build should produce both Worker and client bundles successfully.
- SPA routes should resolve through the Cloudflare asset fallback configuration.

## Fast Local Loop

```bash
npm test
npm run build
```

## Before Deploy

Run at least:

```bash
npm run lint
npm run type-check
npm test
npm run build
```
