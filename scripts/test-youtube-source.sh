#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PYTHON="${YOUTUBE_PYTHON:-$ROOT/.venv-source/bin/python}"
URL="${1:-}"
if [[ -z "$URL" ]]; then echo "Usage: bash scripts/test-youtube-source.sh <youtube-url>"; exit 2; fi
if [[ ! -x "$PYTHON" ]]; then echo "[YOUTUBE TEST] Missing $PYTHON. Run npm run source:setup first."; exit 1; fi
command -v ffmpeg >/dev/null || { echo '[YOUTUBE TEST] ffmpeg missing.'; exit 1; }
printf '[YOUTUBE TEST] yt-dlp '; "$PYTHON" -m yt_dlp --version
printf '[YOUTUBE TEST] ffmpeg '; ffmpeg -version | head -n 1
TMP="$(mktemp -d /tmp/cornerstone-youtube-test.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT
"$PYTHON" -m yt_dlp --no-playlist --no-part --restrict-filenames --format 'bv*+ba/b' --merge-output-format mp4 --output "$TMP/source.%(ext)s" "$URL"
FILE="$(find "$TMP" -maxdepth 1 -type f \( -name 'source.mp4' -o -name 'source.mkv' -o -name 'source.webm' -o -name 'source.mov' -o -name 'source.m4v' \) | head -n 1)"
[[ -n "$FILE" ]] || { echo '[YOUTUBE TEST] FAIL: no playable file produced.'; exit 1; }
printf '[YOUTUBE TEST] downloaded '; ls -lh "$FILE"
ffprobe -v error -show_entries format=duration,format_name,size -of default=noprint_wrappers=1 "$FILE"
printf '[YOUTUBE TEST] PASS: acquisition + container verification succeeded.\n'
