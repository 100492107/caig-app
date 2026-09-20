#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PRIMARY_MODEL="mlx-community/Qwen3.5-9B-4bit"
FALLBACK_MODEL="mlx-community/Qwen3.5-4B-MLX-4bit"

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
"$VENV/bin/python" -m pip install --upgrade mlx-lm mlx-vlm

if [[ ! -f "$ROOT/.env.qwen.local" ]]; then
  cat > "$ROOT/.env.qwen.local" <<EOF
SUPABASE_URL=${SUPABASE_URL:-}
VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-${SUPABASE_URL:-}}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-}
QWEN_URL=http://127.0.0.1:8000
QWEN_MODEL=$PRIMARY_MODEL
QWEN_FALLBACK_MODEL=$FALLBACK_MODEL
QWEN_POLL_MS=4000
QWEN_IDLE_MS=3000
EOF
  echo "Created .env.qwen.local — add your Supabase URL and service-role key."
else
  # Upgrade only the old Cornerstone default. Preserve deliberate operator overrides.
  sed -i '' 's#mlx-community/Qwen3-8B-4bit#mlx-community/Qwen3.5-9B-4bit#g' "$ROOT/.env.qwen.local"
  if ! grep -q '^QWEN_FALLBACK_MODEL=' "$ROOT/.env.qwen.local"; then
    printf '\nQWEN_FALLBACK_MODEL=%s\n' "$FALLBACK_MODEL" >> "$ROOT/.env.qwen.local"
  fi
  echo "Updated .env.qwen.local to the Qwen3.5 9B default (existing custom values preserved)."
fi

chmod +x scripts/qwen-worker.mjs scripts/run-local-qwen.sh

echo "Local Qwen MLX stack upgraded."
echo "Primary: $PRIMARY_MODEL (~5.95 GB download)."
echo "Fallback: $FALLBACK_MODEL (~2.9 GB download)."
echo "1) Ensure .env.qwen.local has VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY"
echo "2) Terminal A: source .env.qwen.local && bash scripts/run-local-qwen.sh"
echo "3) Terminal B: bash scripts/start-local-ai-stack.sh"
echo ""
echo "For this 16 GB M1 Pro, use the 9B model normally and switch to the 4B fallback if memory pressure becomes significant."
