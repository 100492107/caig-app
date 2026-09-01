#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# launchd has a minimal PATH. Prefer the Homebrew Node installations used by
# this Mac, then fall back to the system PATH.
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" ]]; then
  NODE_BIN="/usr/local/bin/node"
fi

# Load CAIG's local worker credentials first. The current CAIG repo env wins
# when present; the established caig-local-worker env is the compatibility
# source for the existing worker stack.
if [[ -f .env.qwen.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.qwen.local
  set +a
elif [[ -f "$HOME/Business/caig-local-worker/.env.qwen.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$HOME/Business/caig-local-worker/.env.qwen.local"
  set +a
fi

NEW_LIFE_ROOT="${NEW_LIFE_ROOT:-$HOME/new-life-game}"
STATE_DIR="$ROOT/.local-ai-runtime"
LOG_DIR="$STATE_DIR/logs"
mkdir -p "$LOG_DIR"

export QWEN_MODEL="${QWEN_MODEL:-mlx-community/Qwen3-8B-4bit}"
export QWEN_HOST="${QWEN_HOST:-127.0.0.1}"
export QWEN_PORT="${QWEN_PORT:-8000}"
export QWEN_VISION_MODEL="${QWEN_VISION_MODEL:-mlx-community/Qwen2.5-VL-3B-Instruct-4bit}"
export QWEN_VISION_HOST="${QWEN_VISION_HOST:-127.0.0.1}"
export QWEN_VISION_PORT="${QWEN_VISION_PORT:-8001}"

is_running() {
  local pattern="$1"
  pgrep -f "$pattern" >/dev/null 2>&1
}

port_ready() {
  local host="$1" port="$2"
  curl -fsS --max-time 2 "http://${host}:${port}/v1/models" >/dev/null 2>&1
}

start_bg() {
  local name="$1" pattern="$2" logfile="$3"; shift 3
  if is_running "$pattern"; then
    echo "[LOCAL AI] $name already running"
    return 0
  fi
  echo "[LOCAL AI] starting $name"
  nohup "$@" >>"$LOG_DIR/$logfile" 2>&1 < /dev/null &
  echo $! >"$STATE_DIR/$name.pid"
}

if port_ready "$QWEN_HOST" "$QWEN_PORT"; then
  echo "[LOCAL AI] Qwen already online on ${QWEN_HOST}:${QWEN_PORT}"
else
  start_bg "qwen" "mlx_lm.server.*${QWEN_PORT}" "qwen.log" bash "$ROOT/scripts/run-local-qwen.sh"
fi

if [[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" && -n "${VITE_SUPABASE_URL:-${SUPABASE_URL:-}}" ]]; then
  if ! is_running "scripts/qwen-heartbeat.mjs"; then
    start_bg "qwen-heartbeat" "scripts/qwen-heartbeat.mjs" "qwen-heartbeat.log" env QWEN_MODEL="$QWEN_MODEL" QWEN_URL="http://${QWEN_HOST}:${QWEN_PORT}" "$NODE_BIN" "$ROOT/scripts/qwen-heartbeat.mjs"
  fi
else
  echo "[LOCAL AI] heartbeat skipped: Supabase worker credentials not loaded"
fi

if port_ready "$QWEN_VISION_HOST" "$QWEN_VISION_PORT"; then
  echo "[LOCAL AI] Qwen Vision already online on ${QWEN_VISION_HOST}:${QWEN_VISION_PORT}"
else
  start_bg "qwen-vision" "mlx_vlm.server.*${QWEN_VISION_PORT}" "qwen-vision.log" bash "$ROOT/scripts/run-local-qwen-vision.sh"
fi

if [[ -x "$ROOT/.venv-caption/bin/python" ]]; then
  if curl -fsS --max-time 2 "http://127.0.0.1:8787/health" >/dev/null 2>&1; then
    echo "[LOCAL AI] Whisper already online on 127.0.0.1:8787"
  else
    start_bg "whisper" "mlx-whisper-server.py" "whisper.log" bash "$ROOT/scripts/run-local-whisper.sh"
  fi
else
  echo "[LOCAL AI] Whisper skipped: .venv-caption is not installed"
fi

if [[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  start_bg "qwen-worker" "scripts/qwen-worker.mjs" "qwen-worker.log" env QWEN_URL="http://${QWEN_HOST}:${QWEN_PORT}" QWEN_MODEL="$QWEN_MODEL" "$NODE_BIN" --env-file=.env.qwen.local --import ./scripts/qwen-format-archaeology.mjs "$ROOT/scripts/qwen-worker.mjs"
  start_bg "scene-worker" "scripts/qwen-scene-worker.mjs" "scene-worker.log" env PATH="$PATH" "$NODE_BIN" --env-file=.env.qwen.local "$ROOT/scripts/qwen-scene-worker.mjs"
  if [[ -x "$ROOT/.venv-caption/bin/python" ]]; then
    start_bg "caption-worker" "scripts/caption-worker.mjs" "caption-worker.log" env PATH="$PATH" "$NODE_BIN" --env-file=.env.qwen.local "$ROOT/scripts/caption-worker.mjs"
  fi
else
  echo "[LOCAL AI] CAIG workers skipped: SUPABASE_SERVICE_ROLE_KEY not loaded"
fi

if [[ -f "$NEW_LIFE_ROOT/.env.new-life-coach" && -f "$NEW_LIFE_ROOT/new-life-coach-worker.mjs" ]]; then
  if is_running "new-life-coach-worker.mjs"; then
    echo "[LOCAL AI] New Life coach already running"
  else
    echo "[LOCAL AI] starting New Life coach with shared Qwen model"
    NEW_LIFE_ROOT="$NEW_LIFE_ROOT" PATH="$PATH" nohup bash "$ROOT/scripts/start-new-life-coach-shared.sh" >>"$LOG_DIR/new-life-coach.log" 2>&1 < /dev/null &
    echo $! >"$STATE_DIR/new-life-coach.pid"
  fi
else
  echo "[LOCAL AI] New Life coach skipped: set NEW_LIFE_ROOT and create .env.new-life-coach"
fi

echo "[LOCAL AI] shared stack requested"
echo "[LOCAL AI] Qwen: ${QWEN_HOST}:${QWEN_PORT} · Vision: ${QWEN_VISION_HOST}:${QWEN_VISION_PORT}"
