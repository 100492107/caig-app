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

QWEN_MODEL="${QWEN_MODEL:-mlx-community/Qwen3.5-9B-4bit}"
QWEN_FALLBACK_MODEL="${QWEN_FALLBACK_MODEL:-mlx-community/Qwen3.5-4B-OptiQ-4bit}"
QWEN_HOST="${QWEN_HOST:-127.0.0.1}"
QWEN_PORT="${QWEN_PORT:-8000}"
# 8002 was a retired legacy text endpoint; migrate it automatically.
if [[ "$QWEN_PORT" == "8002" ]]; then QWEN_PORT="8000"; fi
export QWEN_MODEL QWEN_FALLBACK_MODEL QWEN_HOST QWEN_PORT

if [[ ! -x .venv-qwen/bin/python ]]; then
  echo "Qwen environment not found. Run ./scripts/setup-local-qwen.sh first."
  exit 1
fi

if [[ "$(uname -m)" != "arm64" ]]; then
  echo "MLX requires Apple Silicon."
  exit 1
fi

text_model_ready() {
  local body
  body="$(curl -fsS --max-time 2 "http://${QWEN_HOST}:${QWEN_PORT}/v1/models" 2>/dev/null || true)"
  if [[ -z "$body" ]]; then return 1; fi
  # Only treat the requested primary or fallback model as healthy.
  echo "$body" | grep -Fqi "$QWEN_MODEL" && return 0
  echo "$body" | grep -Fqi "$QWEN_FALLBACK_MODEL"
}

if text_model_ready; then
  echo "Qwen text server already running on ${QWEN_HOST}:${QWEN_PORT}"
  if [[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" && -n "${VITE_SUPABASE_URL:-${SUPABASE_URL:-}}" ]]; then
    exec node scripts/qwen-heartbeat.mjs
  fi
  while text_model_ready; do sleep 30; done
  exit 0
fi

if curl -fsS --max-time 1 "http://${QWEN_HOST}:${QWEN_PORT}/v1/models" >/dev/null 2>&1; then
  body="$(curl -fsS --max-time 2 "http://${QWEN_HOST}:${QWEN_PORT}/v1/models" 2>/dev/null || true)"
  echo "Qwen endpoint is occupied by a different model. Replacing it with ${QWEN_MODEL}…"
  pkill -f "mlx_vlm.server.*${QWEN_PORT}" 2>/dev/null || true
  pkill -f "mlx_lm.server.*${QWEN_PORT}" 2>/dev/null || true
  sleep 1
fi

if ! .venv-qwen/bin/python -c "import mlx_lm" >/dev/null 2>&1; then
  echo "mlx-lm is not installed in .venv-qwen. Run: .venv-qwen/bin/python -m pip install -U mlx-lm"
  exit 1
fi

echo "Qwen text server starting on ${QWEN_HOST}:${QWEN_PORT} · model=${QWEN_MODEL}"
echo "Primary launch can take several minutes while weights load."
set +e
.venv-qwen/bin/mlx_lm.server --model "$QWEN_MODEL" --host "$QWEN_HOST" --port "$QWEN_PORT"
STATUS=$?
set -e

if [[ "$STATUS" != "0" && "$STATUS" != "130" && "$STATUS" != "143" && "$QWEN_MODEL" != "$QWEN_FALLBACK_MODEL" ]]; then
  echo "Primary Qwen model exited with status ${STATUS}. Retrying with fallback: ${QWEN_FALLBACK_MODEL}"
  exec .venv-qwen/bin/mlx_lm.server --model "$QWEN_FALLBACK_MODEL" --host "$QWEN_HOST" --port "$QWEN_PORT"
fi

exit "$STATUS"
