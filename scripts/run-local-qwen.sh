#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.qwen.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.qwen.local
  set +a
fi

QWEN_MODEL="${QWEN_MODEL:-mlx-community/Qwen3-8B-4bit}"
QWEN_HOST="${QWEN_HOST:-127.0.0.1}"
QWEN_PORT="${QWEN_PORT:-8000}"
export QWEN_MODEL QWEN_HOST QWEN_PORT

if [[ ! -x .venv-qwen/bin/python ]]; then
  echo "Qwen environment not found. Run ./scripts/setup-local-qwen.sh first."
  exit 1
fi

if [[ "$(uname -m)" != "arm64" ]]; then
  echo "MLX requires Apple Silicon."
  exit 1
fi

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" || -z "${VITE_SUPABASE_URL:-${SUPABASE_URL:-}}" ]]; then
  echo "Missing Supabase environment. Add VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY to .env.qwen.local."
  exit 1
fi

qwen_endpoint_ready() {
  curl -fsS --max-time 2 --retry 1 --retry-delay 1 "http://${QWEN_HOST}:${QWEN_PORT}/v1/models" >/dev/null 2>&1
}

# Give an existing local Qwen server time to answer before ever attempting
# to bind the port ourselves. This avoids a startup race with an already
# running MLX server.
for attempt in {1..8}; do
  if qwen_endpoint_ready; then
    echo "Qwen local server already running on ${QWEN_HOST}:${QWEN_PORT} · attaching heartbeat"
    node scripts/qwen-heartbeat.mjs
    exit $?
  fi
  sleep 1
done

HB_PID=""
cleanup() {
  if [[ -n "$HB_PID" ]]; then
    kill "$HB_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

node scripts/qwen-heartbeat.mjs &
HB_PID=$!

echo "Qwen local server starting on ${QWEN_HOST}:${QWEN_PORT} · heartbeat enabled"
.venv-qwen/bin/mlx_lm.server --model "$QWEN_MODEL" --host "$QWEN_HOST" --port "$QWEN_PORT"
