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

QWEN_MODEL="${QWEN_MODEL:-orcarouter/Qwen3.8-27B-Uncensored-MLX}"
QWEN_HOST="${QWEN_HOST:-127.0.0.1}"
QWEN_PORT="${QWEN_PORT:-8000}"

if [[ ! -x .venv-qwen/bin/python ]]; then
  echo "Qwen environment not found. Run ./scripts/setup-local-qwen.sh first."
  exit 1
fi

if [[ "$(uname -m)" != "arm64" ]]; then
  echo "MLX requires Apple Silicon."
  exit 1
fi

exec .venv-qwen/bin/python -m mlx_lm.server --model "$QWEN_MODEL" --host "$QWEN_HOST" --port "$QWEN_PORT"
