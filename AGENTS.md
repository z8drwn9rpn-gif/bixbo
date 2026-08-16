# BIXBO repository guidance

BIXBO production is owned and deployed independently:

- Source: GitHub `z8drwn9rpn-gif/bixbo`
- Hosting: Cloudflare Workers
- Production branch: `main`
- Database, Auth, Realtime, backups and Edge Functions: BIXBO-owned Supabase project `wgdydwttzsveevkljkmr`

## Change safety

- Keep `main` deployable. Prefer small, reviewable changes and run the full BIXBO checks before merging.
- Do not force-push or rewrite published history unless explicitly required for recovery.
- Preserve health data compatibility and migration history; use corrective migrations instead of editing already-applied migrations.
- Never commit service-role keys, VAPID private keys, cron secrets, or other server secrets.
- Only public browser configuration may use `VITE_*` variables.
- Do not reintroduce any retired external backend project, builder dependency or credentials into active application code.
