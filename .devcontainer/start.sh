#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"
export FCC_OPEN_BROWSER=0

# FCC Code Sessions uses the local Codex CLI.
if ! command -v codex >/dev/null 2>&1; then
  npm install --global @openai/codex
fi

# Stop previous instances cleanly so Codespace restarts are idempotent.
pkill -f "fcc-server" 2>/dev/null || true
sudo nginx -s quit 2>/dev/null || true
sleep 1

nohup fcc-server > /tmp/fcc-server.log 2>&1 &

for i in {1..30}; do
  if curl --fail --silent http://127.0.0.1:8082/health >/dev/null; then
    break
  fi
  if ! kill -0 "$!" 2>/dev/null; then
    echo "FCC server exited unexpectedly"
    cat /tmp/fcc-server.log || true
    exit 1
  fi
  sleep 1
done

if ! curl --fail --silent http://127.0.0.1:8082/health >/dev/null; then
  echo "FCC server did not become healthy"
  cat /tmp/fcc-server.log || true
  exit 1
fi

sudo nginx -t -c "$PWD/.devcontainer/nginx.conf"
sudo nginx -c "$PWD/.devcontainer/nginx.conf"

for i in {1..10}; do
  if curl --fail --silent http://127.0.0.1:8080/health >/dev/null; then
    exit 0
  fi
  sleep 1
done

echo "FCC proxy did not become healthy"
cat /tmp/fcc-server.log || true
exit 1
