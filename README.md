# BIXBO — My Health Diary

BIXBO is a personal health diary for tracking pain, cycle data, bowel symptoms, food, sexual activity, temperature, weight, medication, appointments, to-dos and private notes.

## Production architecture

BIXBO production uses this owned stack:

- **Source control:** GitHub — `z8drwn9rpn-gif/bixbo`
- **Frontend / app hosting:** Cloudflare Workers
- **Production URL:** `https://bixbo.z8drwn9rpn.workers.dev`
- **Database, Auth, Realtime, backups and Edge Functions:** the BIXBO-owned Supabase project
- **Supabase project ref:** `wgdydwttzsveevkljkmr`
- **Web Push:** VAPID + Supabase Edge Functions (`push-subscription`, `send-due-push`)
- **MCP:** BIXBO-owned server routes authenticated against the same Supabase project

The application build, runtime, authentication, MCP, production data, backups and push delivery are provided by the repository, Cloudflare and the BIXBO-owned Supabase project. Historical applied migration files are preserved verbatim for database reproducibility.

## Environment variables

Cloudflare build variables used by the frontend:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_VAPID_PUBLIC_KEY
VITE_LEGAL_CONTROLLER_NAME
VITE_LEGAL_CONTROLLER_ADDRESS
VITE_LEGAL_PRIVACY_EMAIL
```

The three `VITE_LEGAL_*` values are public legal-notice fields, not secrets. They must contain the real controller identity before public/commercial distribution.

Server-only VAPID private material belongs in Supabase Edge Function secrets and must never be committed to GitHub or exposed through `VITE_*` variables.

## Deployment

Production branch: `main`.

### Supabase

Supabase production changes are owned by GitHub. `.github/workflows/deploy-supabase.yml` runs automatically when files under `supabase/` reach `main`, and it can also be started manually. The workflow previews and applies pending migrations, deploys the three tracked Edge Functions, and verifies migration/function visibility afterwards.

Required GitHub Actions repository secrets:

```text
SUPABASE_ACCESS_TOKEN
SUPABASE_DB_PASSWORD
```

The production project reference is intentionally committed in the workflow because it is an identifier, not a secret.

### Cloudflare

The application build is reproducible from this repository with:

```sh
bun run build
```

and the Worker is deployable with the repository-pinned Wrangler using:

```sh
bunx wrangler deploy
```

GitHub Actions already holds the scoped Cloudflare deployment credentials under:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

Cloudflare deployment automation should only be enabled after all public frontend build variables listed above are represented in the GitHub release configuration. This prevents a GitHub-built release from silently replacing a working production build with missing VAPID or legal identity configuration.

## Development

This repository uses **Bun** as its package manager (`bun.lock` + `bunfig.toml`).

```sh
git clone <this-repository-url>
cd bixbo
bun install --frozen-lockfile
bun run dev
```

Quality checks:

```sh
bun run check
```

The quality gate includes architecture, UI emoji, English-source UI and external-builder-independence audits in addition to TypeScript, lint, regression tests, production build, bundle budget, SSR smoke and browser E2E.

## Supabase migrations

Production schema changes are stored under `supabase/migrations/`. Historical migrations are kept intact; newer corrective migrations define the final state for the owned BIXBO Supabase project.

The scheduled reminder job `bixbo-send-due-push` calls the owned project Edge Function every minute. Do not hard-code service-role keys, VAPID private keys, or cron secrets in source control.
