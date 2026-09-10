#!/bin/bash
# Keeps Cornerstone local AI stack alive while the Mac is on / user is logged in.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p "$ROOT/.local-ai-runtime/logs"

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

STACK="$ROOT/scripts/start-local-ai-stack.sh"
LOG="$ROOT/.local-ai-runtime/logs/watchdog.log"
INTERVAL="${LOCAL_AI_WATCHDOG_INTERVAL:-60}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >>"$LOG"
}

log "watchdog started root=$ROOT interval=${INTERVAL}s"

# First bring-up
if [[ -x "$STACK" ]]; then
  /bin/bash "$STACK" >>"$LOG" 2>&1 || log "initial stack start returned non-zero"
else
  log "ERROR: missing $STACK"
  exit 1
fi

# Stay alive: re-run the idempotent stack starter so dead services come back
while true; do
  sleep "$INTERVAL"
  /bin/bash "$STACK" >>"$LOG" 2>&1 || log "stack refresh returned non-zero"
done
