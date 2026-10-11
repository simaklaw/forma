#!/usr/bin/env bash
# Apply migrations once, in order, atomically; fail on modified applied files.
set -euo pipefail
export LC_ALL=C
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
migration_dir="$repo_root/packages/db/migrations"
: "${DATABASE_URL:?DATABASE_URL is required}"
command -v psql >/dev/null || { echo 'psql is required' >&2; exit 1; }
command -v sha256sum >/dev/null || { echo 'sha256sum is required' >&2; exit 1; }
shopt -s nullglob
files=("$migration_dir"/[0-9][0-9][0-9]_*.sql)
[[ ${#files[@]} -gt 0 ]] || { echo 'No migration files found' >&2; exit 1; }
plan_file="$(mktemp)"
trap 'rm -f "$plan_file"' EXIT
cat > "$plan_file" <<'SQL'
BEGIN;
SELECT pg_advisory_xact_lock(706021001);
CREATE TABLE IF NOT EXISTS public.forma_schema_migration (
  name text PRIMARY KEY,
  sha256 text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL
for file in "${files[@]}"; do
  migration_name="$(basename "$file")"
  [[ "$migration_name" =~ ^[0-9]{3}_[a-zA-Z0-9_]+\.sql$ ]] || { echo 'Invalid migration filename' >&2; exit 1; }
  checksum="$(sha256sum "$file" | cut -d ' ' -f 1)"
  cat >> "$plan_file" <<SQL
SELECT EXISTS (SELECT 1 FROM public.forma_schema_migration WHERE name = '$migration_name' AND sha256 <> '$checksum') AS changed \gset
\if :changed
DO \$\$ BEGIN RAISE EXCEPTION 'Checksum mismatch: $migration_name'; END \$\$;
\endif
SELECT NOT EXISTS (SELECT 1 FROM public.forma_schema_migration WHERE name = '$migration_name') AS pending \gset
\if :pending
\echo Applying $migration_name
SQL
  # 003 has its own standalone transaction wrapper. Keep the batch transaction;
  # PL/pgSQL BEGIN/END blocks (such as 006) are not matched by these expressions.
  sed -e '/^BEGIN;$/d' -e '/^COMMIT;$/d' "$file" >> "$plan_file"
  cat >> "$plan_file" <<SQL

INSERT INTO public.forma_schema_migration(name, sha256) VALUES ('$migration_name', '$checksum');
\endif
SQL
done
printf '\nCOMMIT;\n' >> "$plan_file"
psql --dbname="$DATABASE_URL" -X --no-password -v ON_ERROR_STOP=1 -f "$plan_file"
echo 'All migrations applied.'
