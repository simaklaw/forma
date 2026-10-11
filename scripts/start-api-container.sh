#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required for the API container}"
: "${JWT_SECRET:?JWT_SECRET is required for the API container}"
exec "$@"
