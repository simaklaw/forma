#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"
export FCC_OPEN_BROWSER=0

pkill -f "fcc-server" 2>/dev/null || true
pkill -f "nginx.*fcc-nginx.conf" 2>/dev/null || true

nohup fcc-server > /tmp/fcc-server.log 2>&1 &
sleep 2

sudo nginx -c "$PWD/.devcontainer/nginx.conf"
