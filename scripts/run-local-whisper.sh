#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -x "$ROOT/.venv-caption/bin/python" ]]; then
  echo "Local Whisper is not installed yet. Run: npm run caption:whisper:install"
  exit 1
fi

# Prefer the unified Qwen env for Supabase credentials, then overlay caption-specific settings.
if [[ -f "$ROOT/.env.qwen.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.qwen.local"
  set +a
fi
if [[ -f "$ROOT/.env.caption.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.caption.local"
  set +a
fi

export WHISPER_URL="${WHISPER_URL:-http://127.0.0.1:8787}"
export WHISPER_MODEL="${WHISPER_MODEL:-mlx-community/whisper-large-v3-turbo}"

exec "$ROOT/.venv-caption/bin/python" scripts/mlx-whisper-server.py
