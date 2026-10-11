# Deploy FitPulse API on Fly.io and exercise videos on R2

Run commands from the repository root. The repository supplies deployment files;
creating resources, setting secrets and deploying requires your Fly/Cloudflare accounts.
Use your own unique app and database names in every command below and in `fly.toml`.

## Requirements

- Fly CLI installed using https://fly.io/docs/flyctl/install/ and `fly auth login`.
- PostgreSQL 16 client (`psql`), Bash and `sha256sum` for migrations.
- Cloudflare R2 account and an upload tool such as rclone.
- Local MP4 files and a public R2/custom domain for videos.

The Docker image uses Node 22 and pnpm 9.15.0, installs the API workspace graph
including tsx, runs as the `node` user, and excludes local env files from the build.
It refuses to start without `DATABASE_URL` and `JWT_SECRET`.

## 1. Create the Fly app and database

For new resources (skip creation if they already exist):

```bash
fly apps create fitpulse-api
fly postgres create --name fitpulse-pg --region waw
fly postgres attach fitpulse-pg -a fitpulse-api
```

Attachment sets `DATABASE_URL` on the API app. Retain the database connection
credentials privately; `fly secrets list` lists names, not secret values.
Use a runtime database role without SUPERUSER or BYPASSRLS privileges: the API
sets `app.current_user_id` for each transaction and relies on row-level security.
The migration connection must have DDL permissions for all application schemas.

## 2. Apply database migrations before serving traffic

In a separate terminal, open a local tunnel to the Fly Postgres instance:

```bash
fly proxy 15432:5432 -a fitpulse-pg
```

Set `DATABASE_URL` locally to the migration connection string, replacing its
private Fly hostname/port with `127.0.0.1:15432`, then run:

```bash
./scripts/apply-db-migrations.sh
```

The runner applies `001` through `006` in filename order, within one transaction,
with an advisory lock and checksums in `public.forma_schema_migration`.
A second run skips applied files; modified applied files fail. Any SQL error
rolls back the whole pending batch. Standalone BEGIN/COMMIT wrappers in the current
SQL files are removed by the runner; new migrations must support transactional DDL.

For a database previously initialized manually, verify its migration history
before adopting this runner. It does not infer or stamp an existing schema;
untracked existing tables cause a rollback rather than being silently accepted.
Take a database backup before migrating an existing deployment.

Confirm strict RLS is enabled on at least 10 tables (current schema has 12):

```bash
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atc \
  "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relrowsecurity AND c.relforcerowsecurity AND n.nspname IN ('platform','workout','engagement','nutrition');"
```

If runtime and migration roles differ, grant the runtime role USAGE on application
schemas, SELECT/INSERT/UPDATE/DELETE on application tables and USAGE/SELECT on
sequences after migration. Do not grant access to the migration ledger.

## 3. Set secrets and deploy

Create JWT_SECRET once and retain it; changing it invalidates existing tokens.
Stage secrets to avoid restarting the app before configuration is complete:

```bash
fly secrets set --stage JWT_SECRET="$(openssl rand -hex 32)" -a fitpulse-api
```

For enabled login providers, configure their server-side credentials:

```bash
fly secrets set --stage -a fitpulse-api \
  OIDC_MAILRU_CLIENT_ID='<client-id>' \
  OIDC_MAILRU_CLIENT_SECRET='<client-secret>' \
  OIDC_VK_CLIENT_ID='<client-id>' \
  OIDC_VK_PUBLIC_KEY="$(cat /private/path/vk-public-key.pem)"

fly deploy -a fitpulse-api
```

These names match `apps/api/src/oidc.ts`. Register `fitpulse://oauth` with the
providers. Mobile public IDs go in Expo env; provider secrets and JWT_SECRET do not.
Fly routes HTTPS to port 8787 and checks `/health`. A successful health response
checks the API process/configuration, not database connectivity; verify registration
and sync as well.

## 4. Mobile configuration

In the local, uncommitted `apps/mobile/.env`:

```dotenv
EXPO_PUBLIC_SYNC_API_URL=https://fitpulse-api.fly.dev
```

Use the actual hostname from your Fly app. Expo public env values are embedded at
bundle time: restart development bundling or publish a new client build/update.

## 5. R2 video hosting and manifest

Create an R2 bucket, configure a public custom domain (or R2.dev for testing), and
configure rclone with an upload token scoped to that bucket. Keep tokens outside git.

```bash
# Upload MP4s recursively, preserving paths and accepting uppercase extensions.
rclone copy /path/to/videos r2:fitpulse-exercise-media/videos \
  --include '*.[mM][pP]4' --mime-type video/mp4

EXERCISE_VIDEO_RAW_BASE=https://your-public-domain.example/videos \
  node scripts/import-exercise-videos.mjs /path/to/videos
```

This upload command copies all MP4 files in the source directory. The importer
maps matching exercise IDs to URLs, prints up to 15 sample filenames, and leaves
an existing manifest intact if nothing matches. It does not upload files.
Check a generated URL, commit the manifest, and rebuild/update the mobile bundle.
See [exercise-video-pipeline.md](exercise-video-pipeline.md) for dataset attribution
settings. Neither the client nor API needs R2 credentials for public playback.

## 6. Smoke checks

```bash
curl --fail-with-body https://fitpulse-api.fly.dev/health
# Expect ok:true, store:"postgres", auth:"jwt".

curl --fail-with-body https://fitpulse-api.fly.dev/api/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"auth_subject":"deploy-smoke-test"}'
# Creates a synthetic user; keep its returned token private.

curl -I 'https://your-public-domain.example/videos/a-matched-file.mp4'
# Expect 200 and Content-Type: video/mp4.
curl --fail -H 'Range: bytes=0-1023' -o /dev/null -w '%{http_code}\n' \
  'https://your-public-domain.example/videos/a-matched-file.mp4'
# Expect 206 for seeking/range playback.
```

Use the returned test-user JWT for an authenticated sync request. The repository's
`Verify sync setup (E2E)` workflow covers unauthorized access, cross-user isolation,
replay handling and projections against a disposable database. Check provider login
and video playback on the device separately.
