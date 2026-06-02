# Current Test Plan

## Required Gates

1. Verify Worker APIs still satisfy the browser clients.
2. Verify auth callbacks resolve through `/api/auth/*`.
3. Verify RSS CRUD still persists to KV-compatible storage.
4. Verify SPA routes work with Cloudflare asset fallback.
5. Verify `npm run build` emits both Worker and client outputs.
6. Verify the home route can serve inline home feed snapshots after Cache API warmup.
7. Verify ICP footer text, favicon metadata, and visible continuous rotation behavior.
