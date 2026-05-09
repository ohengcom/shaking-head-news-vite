# Contributing

Thanks for considering a contribution. The most useful changes are small, testable, and
focused on the current Vite SPA + Cloudflare Worker runtime.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Minimum local environment:

```env
BETTER_AUTH_URL=http://localhost:3001
BETTER_AUTH_SECRET=<generated-secret>
```

Generate a local secret with:

```bash
openssl rand -hex 32
```

## Before Opening A PR

Run:

```bash
npm run lint:unused
npm run check
```

For UI changes, also run the relevant Playwright smoke test:

```bash
npm run test:e2e:smoke
```

## Good First Issue Areas

- RSS feed parsing fixtures and fallback behavior
- OPML import/export validation
- Reduced-motion and keyboard accessibility
- Cloudflare deployment docs
- README screenshots and product documentation
- Small UI polish that improves first-time understanding

## Pull Request Expectations

- Keep the PR scoped to one problem.
- Include tests when changing shared behavior.
- Update docs when changing setup, deployment, or user-facing features.
- Avoid adding new runtime dependencies unless the benefit is clear.
- Do not introduce medical or treatment claims; use posture-break and gentle-reminder language.
