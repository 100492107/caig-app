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

QWEN_VISION_MODEL="${QWEN_VISION_MODEL:-mlx-community/Qwen2.5-VL-3B-Instruct-4bit}"
QWEN_VISION_HOST="${QWEN_VISION_HOST:-127.0.0.1}"
QWEN_VISION_PORT="${QWEN_VISION_PORT:-8001}"

if [[ ! -x .venv-qwen/bin/python ]]; then
  echo "Qwen environment not found. Run ./scripts/setup-local-qwen.sh first."
  exit 1
fi

if [[ "$(uname -m)" != "arm64" ]]; then
  echo "MLX vision requires Apple Silicon."
  exit 1
fi

if ! .venv-qwen/bin/python -c "import mlx_vlm" >/dev/null 2>&1; then
  echo "mlx-vlm is not installed in .venv-qwen."
  echo "Install it with: .venv-qwen/bin/pip install mlx-vlm"
  exit 1
fi

exec .venv-qwen/bin/python -m mlx_vlm.server --model "$QWEN_VISION_MODEL" --host "$QWEN_VISION_HOST" --port "$QWEN_VISION_PORT"
