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

- Unit tests run under Vitest against the active Vite + Worker runtime.
- Build emits both Worker and browser artifacts successfully.
- Chromium smoke tests should pass locally with the Vite dev server.
- The full Playwright browser matrix is intended for broader compatibility verification and
  is slower than the smoke suite.

## Release Smoke Checks

- Home HTML can include `window.__HOME_FEED__` after the Cloudflare edge cache has warmed.
- The browser falls back to `/api/feed/home?locale=...` when no matching inline snapshot exists.
- Footer displays `沪ICP备2022000575号` and still links to `https://beian.miit.gov.cn/`.
- `/icons/ytkxw.png` is referenced as the favicon and Apple touch icon.
- Continuous rotation visibly changes angle instead of producing tiny random movements.
