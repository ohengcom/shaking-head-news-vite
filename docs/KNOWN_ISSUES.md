# Known Issues (as of 2026-02-25)

## 1. Unit Test Suite Is Not Fully Green

- `tests/unit/actions/stats.test.ts`
  - Mock setup does not include `getMultipleStorageItems`, but `lib/actions/stats.ts` now uses it.
- `tests/unit/actions/news.test.ts`
  - RSS test fixtures/mocks are not fully aligned with current `getRSSNews` / `getUserCustomNews` behavior.

Impact:

- CI quality signal is degraded until these tests are updated.

## 2. vinext Build Warnings Remain

- `npm run build:vinext` succeeds, but reports warnings such as:
  - unsupported `next.config` options by vinext
  - large chunk warnings
  - sourcemap location warnings

Impact:

- Does not block build output, but indicates migration work remains for clean parity.

## 3. Legacy Duplicate Artifact in Tests

- `tests/unit/actions/stats.test-CNSHNSLI01.ts` appears to be a machine-suffixed duplicate file.

Impact:

- Not executed by current Vitest include pattern, but should be cleaned up to reduce confusion.
