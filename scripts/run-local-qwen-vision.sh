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
VISION_PYTHON="$ROOT/.venv-qwen-vision/bin/python"

if [[ ! -x "$VISION_PYTHON" ]]; then
  echo "Qwen vision environment not found. Create .venv-qwen-vision with Python 3.11 and install mlx-vlm."
  exit 1
fi

if [[ "$(uname -m)" != "arm64" ]]; then
  echo "MLX vision requires Apple Silicon."
  exit 1
fi

if ! "$VISION_PYTHON" -c "import mlx_vlm" >/dev/null 2>&1; then
  echo "mlx-vlm is not installed in .venv-qwen-vision."
  echo "Install it with: $VISION_PYTHON -m pip install mlx-vlm"
  exit 1
fi

exec "$VISION_PYTHON" -m mlx_vlm.server --model "$QWEN_VISION_MODEL" --host "$QWEN_VISION_HOST" --port "$QWEN_VISION_PORT"
