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

text_model_ready() {
  local body
  body="$(curl -fsS --max-time 2 "http://${QWEN_HOST}:${QWEN_PORT}/v1/models" 2>/dev/null || true)"
  if [[ -z "$body" ]]; then return 1; fi
  # Success if Qwen3 (or similar text) is listed — VL aliases in the same payload are fine
  echo "$body" | grep -Eqi 'Qwen3|qwen2\.5-7B'
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
  if echo "$body" | grep -Eqi 'VL' && ! echo "$body" | grep -Eqi 'Qwen3'; then
    echo "Non-text model is bound to ${QWEN_PORT}. Freeing port for Qwen text…"
    pkill -f "mlx_vlm.server.*${QWEN_PORT}" 2>/dev/null || true
    pkill -f "mlx_lm.server.*${QWEN_PORT}" 2>/dev/null || true
    sleep 1
  fi
fi

if ! .venv-qwen/bin/python -c "import mlx_lm" >/dev/null 2>&1; then
  echo "mlx-lm is not installed in .venv-qwen. Run: .venv-qwen/bin/python -m pip install -U mlx-lm"
  exit 1
fi

echo "Qwen text server starting on ${QWEN_HOST}:${QWEN_PORT} · model=${QWEN_MODEL}"
echo "First launch can take several minutes while weights load."
exec .venv-qwen/bin/mlx_lm.server --model "$QWEN_MODEL" --host "$QWEN_HOST" --port "$QWEN_PORT"
