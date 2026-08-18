#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This setup script targets macOS."
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required: https://brew.sh"
  exit 1
fi

brew list ffmpeg >/dev/null 2>&1 || brew install ffmpeg

PYTHON="python3"
if ! command -v "$PYTHON" >/dev/null 2>&1; then
  brew install python
fi

VENV="$ROOT/.venv-caption"
"$PYTHON" -m venv "$VENV"
"$VENV/bin/python" -m pip install --upgrade pip
"$VENV/bin/python" -m pip install mlx-whisper

cat > "$ROOT/.env.caption.local" <<EOF
SUPABASE_URL=${SUPABASE_URL:-}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-}
FFMPEG_BIN=$(command -v ffmpeg)
WHISPER_URL=http://127.0.0.1:8787
WHISPER_MODEL=mlx-community/whisper-large-v3-turbo
EOF

chmod +x "$ROOT/scripts/caption-worker.mjs" "$ROOT/scripts/mlx-whisper-server.py" 2>/dev/null || true

echo "Local caption stack installed."
echo "1) Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.caption.local"
echo "2) Run: $VENV/bin/python scripts/mlx-whisper-server.py"
echo "3) In another terminal run: npm run caption:worker"
echo "4) Open CAIG → Caption Studio and queue a render."
