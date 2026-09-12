#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PYTHON="${SOURCE_PYTHON:-}"
if [[ -z "$PYTHON" ]]; then
  for candidate in python3.12 python3.11 python3.10; do
    if command -v "$candidate" >/dev/null 2>&1; then PYTHON="$(command -v "$candidate")"; break; fi
done
fi
if [[ -z "$PYTHON" ]]; then
  echo "[SOURCE SETUP] Need Python 3.10+ (3.11+ recommended) for current yt-dlp. Install Python 3.11+ and rerun."
  exit 1
fi

VENV="$ROOT/.venv-source"
if [[ ! -x "$VENV/bin/python" ]]; then
  echo "[SOURCE SETUP] Creating $VENV with $PYTHON"
  "$PYTHON" -m venv "$VENV"
fi

"$VENV/bin/python" -m pip install --upgrade pip >/dev/null
"$VENV/bin/python" -m pip install --upgrade "yt-dlp[default]" >/dev/null

if ! command -v ffmpeg >/dev/null 2>&1 || ! command -v ffprobe >/dev/null 2>&1; then
  echo "[SOURCE SETUP] ffmpeg/ffprobe missing. Install ffmpeg and rerun."
  exit 1
fi

printf '[SOURCE SETUP] Python: '; "$VENV/bin/python" --version
printf '[SOURCE SETUP] yt-dlp: '; "$VENV/bin/python" -m yt_dlp --version
printf '[SOURCE SETUP] ffmpeg: '; ffmpeg -version | head -n 1
printf '[SOURCE SETUP] READY\n'
