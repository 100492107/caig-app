#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.cornerstone.local-ai"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
WATCHDOG="$ROOT/scripts/local-ai-watchdog.sh"
STACK="$ROOT/scripts/start-local-ai-stack.sh"

mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "$ROOT/.local-ai-runtime/logs"

chmod +x "$STACK" 2>/dev/null || true
chmod +x "$WATCHDOG" 2>/dev/null || true
chmod +x "$ROOT/scripts/run-local-qwen.sh" 2>/dev/null || true
chmod +x "$ROOT/scripts/run-local-qwen-vision.sh" 2>/dev/null || true
chmod +x "$ROOT/scripts/run-local-whisper.sh" 2>/dev/null || true

# Ensure env file exists (workers need it)
if [[ ! -f "$ROOT/.env.qwen.local" && -f "$HOME/Business/caig-local-worker/.env.qwen.local" ]]; then
  cp "$HOME/Business/caig-local-worker/.env.qwen.local" "$ROOT/.env.qwen.local"
  echo "Copied .env.qwen.local from caig-local-worker"
fi

if [[ ! -f "$ROOT/.env.qwen.local" ]]; then
  echo "WARNING: $ROOT/.env.qwen.local is missing."
  echo "Workers need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in that file."
fi

cat >"$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${WATCHDOG}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${ROOT}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOME</key>
    <string>${HOME}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProcessType</key>
  <string>Background</string>
  <key>StandardOutPath</key>
  <string>${ROOT}/.local-ai-runtime/logs/launchd-stdout.log</string>
  <key>StandardErrorPath</key>
  <string>${ROOT}/.local-ai-runtime/logs/launchd-stderr.log</string>
  <key>ThrottleInterval</key>
  <integer>30</integer>
</dict>
</plist>
EOF

UID_NUM="$(id -u)"
DOMAIN="gui/${UID_NUM}"

# Unload old agent if present
launchctl bootout "$DOMAIN" "$PLIST" 2>/dev/null || true
launchctl unload "$PLIST" 2>/dev/null || true

# Load and start
launchctl bootstrap "$DOMAIN" "$PLIST"
launchctl enable "$DOMAIN/${LABEL}" 2>/dev/null || true
launchctl kickstart -k "$DOMAIN/${LABEL}"

echo ""
echo "Cornerstone local AI autostart installed."
echo "  LaunchAgent: $PLIST"
echo "  Watchdog:    $WATCHDOG"
echo "  Stack:       $STACK"
echo ""
echo "It will:"
echo "  • start at login"
echo "  • stay running in the background"
echo "  • re-check services every 60s and restart anything that died"
echo ""
echo "Useful commands:"
echo "  launchctl print gui/\$(id -u)/${LABEL} | head -40"
echo "  tail -f $ROOT/.local-ai-runtime/logs/watchdog.log"
echo "  curl -sS http://127.0.0.1:8000/v1/models | head -c 120; echo"
echo "  curl -sS http://127.0.0.1:8001/v1/models | head -c 120; echo"
echo "  curl -sS http://127.0.0.1:8787/health; echo"
echo ""
echo "To stop autostart:"
echo "  launchctl bootout gui/\$(id -u) $PLIST"
