#!/usr/bin/env bash
# FitPulse — one-shot sync security setup.
#
# Generates secrets and writes them into (git-ignored) env files:
#   apps/api/.env     -> SYNC_API_TOKEN (shared bearer, legacy), JWT_SECRET (per-user auth)
#   apps/mobile/.env  -> EXPO_PUBLIC_SYNC_API_URL, EXPO_PUBLIC_SYNC_API_TOKEN (legacy client)
#
# Safe to re-run: only these keys are replaced, other values are kept.
set -euo pipefail
cd "$(dirname "$0")/.."

gen() {
  openssl rand -hex 32 2>/dev/null || od -An -N32 -tx1 /dev/urandom 2>/dev/null | tr -d ' \n'
}

TOKEN="$(gen)"
JWT_SECRET="$(gen)"

if [ -z "$TOKEN" ] || [ -z "$JWT_SECRET" ]; then
  echo "ERROR: could not generate secrets (no openssl, no /dev/urandom)." >&2
  echo "       Install openssl and re-run: pnpm sync:setup" >&2
  exit 1
fi

upsert() {
  local file="$1" key="$2" value="$3"
  touch "$file"
  if grep -q "^${key}=" "$file"; then
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$file" && rm -f "$file.bak"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

API_ENV="apps/api/.env"
if [ ! -f "$API_ENV" ]; then
  printf 'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fitpulse\n' > "$API_ENV"
fi
upsert "$API_ENV" SYNC_API_TOKEN "$TOKEN"
upsert "$API_ENV" JWT_SECRET "$JWT_SECRET"

MOBILE_ENV="apps/mobile/.env"
upsert "$MOBILE_ENV" EXPO_PUBLIC_SYNC_API_URL "http://10.0.2.2:8787"
upsert "$MOBILE_ENV" EXPO_PUBLIC_SYNC_API_TOKEN "$TOKEN"

echo "OK: secrets written to $API_ENV and $MOBILE_ENV"
echo "    (both files are git-ignored — safe to keep local)"
