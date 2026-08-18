#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This setup script targets macOS."
  exit 1
fi

if [[ "$(uname -m)" != "arm64" ]]; then
  echo "This MLX caption setup expects an Apple Silicon Mac (arm64)."
  echo "For Intel Macs, keep the FFmpeg worker and use a different local Whisper backend."
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required. Install it from https://brew.sh and rerun this script."
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
"$VENV/bin/python" -m pip install -r scripts/requirements-caption-local.txt

cat > "$ROOT/.env.caption.local" <<EOF
SUPABASE_URL=${SUPABASE_URL:-}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-}
FFMPEG_BIN=$(command -v ffmpeg)
WHISPER_URL=http://127.0.0.1:8787
WHISPER_MODEL=mlx-community/whisper-large-v3-turbo
EOF

echo "Local caption stack installed."
echo "1) Put your Supabase URL and service-role key into .env.caption.local"
echo "2) Apply the caption migration in Supabase"
echo "3) Terminal A: source .env.caption.local && npm run caption:whisper"
echo "4) Terminal B: source .env.caption.local && npm run caption:worker"
echo "5) Open CAIG → Caption Studio and queue a render."
