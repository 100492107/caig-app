#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This setup script targets macOS."
  exit 1
fi

ARCH="$(uname -m)"
if [[ "$ARCH" != "arm64" ]]; then
  echo "This Qwen MLX setup requires Apple Silicon (arm64). Detected: $ARCH"
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required. Install it with Homebrew: brew install python"
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required: https://brew.sh"
  exit 1
fi

VENV="$ROOT/.venv-qwen"
python3 -m venv "$VENV"
"$VENV/bin/python" -m pip install --upgrade pip
"$VENV/bin/python" -m pip install --upgrade mlx-lm

cat > "$ROOT/.env.qwen.local" <<EOF
SUPABASE_URL=${SUPABASE_URL:-}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-}
QWEN_URL=http://127.0.0.1:8000
QWEN_MODEL=orcarouter/Qwen3.8-27B-Uncensored-MLX
QWEN_POLL_MS=4000
QWEN_IDLE_MS=3000
EOF

chmod +x scripts/qwen-worker.mjs scripts/run-local-qwen.sh

echo "Local Qwen3.8 MLX stack installed."
echo "1) Put your Supabase URL and service-role key into .env.qwen.local"
echo "2) Apply supabase/migrations/20260818090000_local_ai_jobs.sql"
echo "3) Terminal A: source .env.qwen.local && npm run qwen:server"
echo "4) Terminal B: source .env.qwen.local && npm run qwen:worker"
echo "5) Open CAIG -> Local AI and queue the test job."
echo ""
echo "Your Mac has 16 GB unified memory. Start with the configured checkpoint as supplied by the model author; if macOS reports memory pressure or the server cannot load the checkpoint, stop and choose a smaller MLX quantisation rather than forcing swap-heavy inference."
