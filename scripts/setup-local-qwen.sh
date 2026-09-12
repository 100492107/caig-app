#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This Qwen MLX setup targets macOS."
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

if [[ ! -f "$ROOT/.env.qwen.local" ]]; then
  cat > "$ROOT/.env.qwen.local" <<EOF
SUPABASE_URL=${SUPABASE_URL:-}
VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-${SUPABASE_URL:-}}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-}
QWEN_URL=http://127.0.0.1:8000
QWEN_MODEL=mlx-community/Qwen3-8B-4bit
QWEN_POLL_MS=4000
QWEN_IDLE_MS=3000
EOF
  echo "Created .env.qwen.local — add your Supabase URL and service-role key."
else
  echo "Keeping existing .env.qwen.local (not overwritten)."
fi

chmod +x scripts/qwen-worker.mjs scripts/run-local-qwen.sh

echo "Local Qwen MLX stack installed."
echo "Configured public model: mlx-community/Qwen3-8B-4bit (~4.62 GB model files)."
echo "1) Ensure .env.qwen.local has VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY"
echo "2) Terminal A: source .env.qwen.local && bash scripts/run-local-qwen.sh"
echo "3) Terminal B: bash scripts/start-local-ai-stack.sh"
echo ""
echo "This is the starter model for your 16 GB M1 Pro. It is public, Apache-2.0, and designed for MLX/Apple Silicon."
