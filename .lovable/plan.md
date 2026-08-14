# BIXBO current project state

BIXBO production is independent of Lovable Cloud.

## Production architecture

- Source of truth: GitHub repository `z8drwn9rpn-gif/bixbo`
- Production hosting: Cloudflare Workers
- Production branch: `main`
- Backend, Auth, Realtime, backups and Edge Functions: BIXBO-owned Supabase project `wgdydwttzsveevkljkmr`
- Web Push: VAPID + Supabase Edge Functions `push-subscription` and `send-due-push`

## Guardrails

- Do not reconnect production data, authentication, storage, backups, Edge Functions or push delivery to Lovable Cloud.
- Do not restore the previous Supabase project or any old Lovable Cloud endpoint.
- Do not put service-role keys, VAPID private keys or cron secrets in GitHub or frontend `VITE_*` variables.
- Preserve existing migrations and user-data compatibility unless a migration is explicitly required.
- Keep the repository buildable with `bun run check` and deployable through Cloudflare.
- Lovable may remain only as an optional editor/compatibility layer; production must continue to work without Lovable Cloud.

## Current migration status

The production app is already using the owned Supabase project and Cloudflare. Remaining Lovable-named files or packages should only be removed when their runtime/editor compatibility role is understood and a full CI check passes afterward.
