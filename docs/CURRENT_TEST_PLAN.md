# Current Test Plan

## Scope

- Auth flow (guest -> login -> logout)
- Tier-specific rendering (guest/member/pro)
- RSS source management
- Stats and health reminder behavior
- Build-path regression (Next.js + vinext)

## Steps

1. `npm run type-check`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
5. `npm run build:vinext`
6. Manual smoke test:
   - `/`
   - `/login`
   - `/settings`
   - `/rss`
   - `/stats`

## Environment for Test

Required:

- `BETTER_AUTH_SECRET`
- At least one OAuth provider config for login testing

Recommended:

- `APP_SETTINGS_KV` binding available when testing persistence
