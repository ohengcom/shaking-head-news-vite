# Testing Guide

## Command Matrix

- Unit tests: `npm run test`
- Type check: `npm run type-check`
- Lint: `npm run lint`
- Next build: `npm run build`
- vinext build: `npm run build:vinext`
- E2E tests: `npm run test:e2e`

## Baseline Status (2026-02-25)

Executed locally on this repository state:

- `npm run type-check` -> PASS
- `npm run lint` -> PASS
- `npm run build` -> PASS
- `npm run build:vinext` -> PASS (with warnings)
- `npm run test` -> FAIL
  - 10 test files total
  - 2 files failed
  - 19 tests failed

## Current Failing Areas

1. `tests/unit/actions/stats.test.ts`
   - Mock of `@/lib/storage` does not include `getMultipleStorageItems`, but production code now uses it.
2. `tests/unit/actions/news.test.ts`
   - RSS related test expectations/mocks do not fully match current implementation behavior.

Details are tracked in `docs/KNOWN_ISSUES.md`.

## Suggested Test Workflow

1. Run `npm run type-check && npm run lint` on every change.
2. Run focused unit tests for changed modules.
3. Run `npm run build` before merge.
4. Run `npm run build:vinext` when touching runtime/config/auth/i18n paths.
5. Run Playwright E2E before release.
