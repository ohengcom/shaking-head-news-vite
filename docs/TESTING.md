# Testing

## Validation Commands

- `npm run lint`
- `npm run lint:unused`
- `npm run types:worker`
- `npm run type-check`
- `npm test`
- `npm run build`
- `npm run test:e2e:smoke`
- `npm run test:e2e`

## Recommended Local Order

For routine development:

```bash
npm run check
npm run test:e2e:smoke
```

For release verification:

```bash
npm run lint:unused
npm run types:worker
npm run check
npm run test:e2e
```

## Expectations

- Unit tests run under Vitest without depending on the archived Next.js runtime.
- Build emits both Worker and browser artifacts successfully.
- Chromium smoke tests should pass locally with the Vite dev server.
- The full Playwright browser matrix is intended for broader compatibility verification and
  is slower than the smoke suite.
