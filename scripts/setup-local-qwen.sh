#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PRIMARY_MODEL="mlx-community/Qwen3.5-9B-4bit"
FALLBACK_MODEL="mlx-community/Qwen3.5-4B-4bit"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This Qwen MLX setup targets macOS."
  exit 1
fi

ARCH="$(uname -m)"
if [[ "$ARCH" != "arm64" ]]; then
  echo "This Qwen MLX setup requires Apple Silicon (arm64). Detected: $ARCH"
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required. Install it with Homebrew: brew install python"
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required: https://brew.sh"
  exit 1
fi

# Qwen3.5 requires the current MLX stack. The current MLX release requires Python 3.10+.
PYTHON_BIN=""
for candidate in python3.13 python3.12 python3.11 python3; do
  if command -v "$candidate" >/dev/null 2>&1; then
    minor="$("$candidate" -c 'import sys; print(sys.version_info.minor)' 2>/dev/null || echo 0)"
    if [[ "${minor:-0}" -ge 10 ]]; then PYTHON_BIN="$(command -v "$candidate")"; break; fi
  fi
done

if [[ -z "$PYTHON_BIN" ]]; then
  echo "Python 3.10+ is required for the current MLX stack. Installing Homebrew Python 3.12…"
  brew install python@3.12
  PYTHON_BIN="$(brew --prefix python@3.12)/bin/python3.12"
fi

PYTHON_VERSION="$("$PYTHON_BIN" -c 'import sys; print(".".join(map(str,sys.version_info[:3])))')"
echo "Using Python ${PYTHON_VERSION} for the Qwen environment."

VENV="$ROOT/.venv-qwen"
if [[ -x "$VENV/bin/python" ]]; then
  VENV_MINOR="$("$VENV/bin/python" -c 'import sys; print(sys.version_info.minor)' 2>/dev/null || echo 0)"
  if [[ "${VENV_MINOR:-0}" -lt 10 ]]; then
    echo "Existing .venv-qwen uses Python ${VENV_MINOR}. Recreating it with Python 3.10+…"
    rm -rf "$VENV"
  fi
fi

if [[ ! -x "$VENV/bin/python" ]]; then
  "$PYTHON_BIN" -m venv "$VENV"
fi

"$VENV/bin/python" -m pip install --upgrade pip
"$VENV/bin/python" -m pip install --upgrade "mlx-lm==0.31.3" mlx-vlm

if [[ ! -f "$ROOT/.env.qwen.local" ]]; then
  cat > "$ROOT/.env.qwen.local" <<EOF
SUPABASE_URL=${SUPABASE_URL:-}
VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-${SUPABASE_URL:-}}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-}
QWEN_URL=http://127.0.0.1:8000
QWEN_MODEL=$PRIMARY_MODEL
QWEN_FALLBACK_MODEL=$FALLBACK_MODEL
QWEN_POLL_MS=4000
QWEN_IDLE_MS=3000
EOF
  echo "Created .env.qwen.local — add your Supabase URL and service-role key."
else
  # Migrate known legacy configuration while preserving unrelated operator settings.
  sed -i '' 's#mlx-community/Qwen3-8B-4bit#mlx-community/Qwen3.5-9B-4bit#g' "$ROOT/.env.qwen.local"
  sed -i '' 's#mlx-community/Qwen3.5-4B-OptiQ-4bit#mlx-community/Qwen3.5-4B-4bit#g' "$ROOT/.env.qwen.local"
  sed -i '' 's#127\.0\.0\.1:8002#127.0.0.1:8000#g' "$ROOT/.env.qwen.local"
  sed -i '' 's#^QWEN_PORT=8002$#QWEN_PORT=8000#' "$ROOT/.env.qwen.local"
  if ! grep -q '^QWEN_MODEL=' "$ROOT/.env.qwen.local"; then
    printf '\nQWEN_MODEL=%s\n' "$PRIMARY_MODEL" >> "$ROOT/.env.qwen.local"
  fi
  if grep -q '^QWEN_FALLBACK_MODEL=mlx-community/Qwen3.5-4B-OptiQ-4bit$' "$ROOT/.env.qwen.local"; then
    sed -i '' "s#^QWEN_FALLBACK_MODEL=.*#QWEN_FALLBACK_MODEL=$FALLBACK_MODEL#" "$ROOT/.env.qwen.local"
  elif ! grep -q '^QWEN_FALLBACK_MODEL=' "$ROOT/.env.qwen.local"; then
    printf 'QWEN_FALLBACK_MODEL=%s\n' "$FALLBACK_MODEL" >> "$ROOT/.env.qwen.local"
  fi
  echo "Updated .env.qwen.local to the current Qwen3.5 configuration."
fi

echo "Local Qwen MLX stack upgraded."
chmod +x scripts/qwen-worker.mjs scripts/run-local-qwen.sh

echo "Local Qwen MLX stack upgraded."
echo "Primary: $PRIMARY_MODEL (~5.95 GB download)."
echo "Fallback: $FALLBACK_MODEL (~3.06 GB download)."
echo "1) Ensure .env.qwen.local has VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY"
echo "2) Terminal A: source .env.qwen.local && bash scripts/run-local-qwen.sh"
echo "3) Terminal B: bash scripts/start-local-ai-stack.sh"
echo ""
echo "For this 16 GB M1 Pro, use the 9B model normally and switch to the 4B fallback if memory pressure becomes significant."
