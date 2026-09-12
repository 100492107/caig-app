#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PYTHON="${SOURCE_PYTHON:-}"
if [[ -z "$PYTHON" ]]; then
  for candidate in python3.13 python3.12 python3.11; do
    if command -v "$candidate" >/dev/null 2>&1; then PYTHON="$(command -v "$candidate")"; break; fi
  done
fi
if [[ -z "$PYTHON" ]]; then
  echo "[SOURCE SETUP] Need Python 3.11+ for current yt-dlp. Install Python 3.11+ and rerun."
  exit 1
fi

VENV="$ROOT/.venv-source"
if [[ -x "$VENV/bin/python" ]]; then
  EXISTING="$($VENV/bin/python -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
  if [[ "${EXISTING%%.*}" -eq 3 && "${EXISTING##*.}" -lt 11 ]]; then
    echo "[SOURCE SETUP] Existing $VENV uses Python $EXISTING; rebuilding with $PYTHON"
    rm -rf "$VENV"
  fi
fi
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

JS_KIND='none'
if command -v deno >/dev/null 2>&1; then
  DENO_VERSION="$(deno --version | head -n 1)"
  JS_KIND="Deno · $DENO_VERSION"
elif command -v node >/dev/null 2>&1; then
  NODE_VERSION="$(node -p 'process.versions.node')"
  NODE_MAJOR="${NODE_VERSION%%.*}"
  if [[ "$NODE_MAJOR" -ge 22 ]]; then
    JS_KIND="Node · v$NODE_VERSION"
  fi
fi

if [[ "$JS_KIND" == 'none' ]]; then
  echo "[SOURCE SETUP] No supported YouTube JavaScript runtime found."
  echo "[SOURCE SETUP] Recommended: install Deno 2.3+ or Node 22+, then rerun this setup."
  exit 1
fi

echo "[SOURCE SETUP] JavaScript runtime: $JS_KIND"
printf '[SOURCE SETUP] Python: '; "$VENV/bin/python" --version
printf '[SOURCE SETUP] yt-dlp: '; "$VENV/bin/python" -m yt_dlp --version
printf '[SOURCE SETUP] ffmpeg: '; ffmpeg -version | head -n 1
printf '[SOURCE SETUP] READY\n'
