#!/usr/bin/env bash
# FitPulse — one-shot sync security setup.
#
# Generates a shared secret token and writes it into:
#   apps/api/.env     -> SYNC_API_TOKEN (server)
#   apps/mobile/.env  -> EXPO_PUBLIC_SYNC_API_TOKEN (client)
#
# Both files are git-ignored, so the token never reaches the repository.
# Safe to re-run: only token lines are replaced, other values are kept.
set -euo pipefail
cd "$(dirname "$0")/.."

TOKEN="$(openssl rand -hex 32 2>/dev/null || od -An -N32 -tx1 /dev/urandom | tr -d ' \n')"

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
  printf 'DATABASE_URL=postgresql://fitpulse:fitpulse@localhost:5432/fitpulse\n' > "$API_ENV"
fi
upsert "$API_ENV" SYNC_API_TOKEN "$TOKEN"

MOBILE_ENV="apps/mobile/.env"
upsert "$MOBILE_ENV" EXPO_PUBLIC_SYNC_API_URL "http://10.0.2.2:8787"
upsert "$MOBILE_ENV" EXPO_PUBLIC_SYNC_API_TOKEN "$TOKEN"

echo "OK: token written to $API_ENV and $MOBILE_ENV"
echo "    (both files are git-ignored — safe to keep local)"
