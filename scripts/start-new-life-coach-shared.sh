#!/bin/bash
set -euo pipefail

NEW_LIFE_ROOT="${NEW_LIFE_ROOT:-$HOME/Business/Archive/new-life-game}"
if [[ ! -f "$NEW_LIFE_ROOT/.env.new-life-coach" ]]; then
  echo "[NEW LIFE] Missing $NEW_LIFE_ROOT/.env.new-life-coach"
  exit 1
fi
if [[ ! -f "$NEW_LIFE_ROOT/new-life-coach-worker.mjs" ]]; then
  echo "[NEW LIFE] Missing $NEW_LIFE_ROOT/new-life-coach-worker.mjs"
  exit 1
fi

cd "$NEW_LIFE_ROOT"
set -a
# shellcheck disable=SC1091
source .env.new-life-coach
set +a

# Force the shared CAIG/New Life model service; application data remains isolated.
export QWEN_URL="http://127.0.0.1:8000"
export QWEN_MODEL="mlx-community/Qwen3-8B-4bit"

exec node new-life-coach-worker.mjs
