#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo apt-get install -y --no-install-recommends nginx

curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

uv tool install --force git+https://github.com/Alishahryar1/free-claude-code.git
npm install --global pnpm@9.15.0

pnpm install --frozen-lockfile

chmod +x .devcontainer/start.sh
