#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PYTHON="$ROOT/.venv-source/bin/python"
if [[ ! -x "$PYTHON" ]]; then
  echo "[SOURCE] creating .venv-source"
  python3 -m venv "$ROOT/.venv-source"
fi

"$PYTHON" -m pip install --upgrade pip
"$PYTHON" -m pip install -r "$ROOT/scripts/requirements-caption-local.txt"

echo "[SOURCE] ready: $PYTHON"
echo "[SOURCE] yt-dlp: $("$PYTHON" -m yt_dlp --version)"
