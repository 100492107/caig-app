#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/com.cornerstone.local-ai.plist"
mkdir -p "$(dirname "$PLIST")"

cat >"$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.cornerstone.local-ai</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$ROOT/scripts/start-local-ai-stack.sh</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProcessType</key>
  <string>Background</string>
  <key>StandardOutPath</key>
  <string>$ROOT/.local-ai-runtime/launchd.log</string>
  <key>StandardErrorPath</key>
  <string>$ROOT/.local-ai-runtime/launchd-error.log</string>
  <key>ThrottleInterval</key>
  <integer>10</integer>
</dict>
</plist>
EOF

chmod +x "$ROOT/scripts/start-local-ai-stack.sh"
chmod +x "$PLIST" 2>/dev/null || true

launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl kickstart -k "gui/$(id -u)/com.cornerstone.local-ai"

echo "Cornerstone local AI autostart installed."
echo "LaunchAgent: $PLIST"
echo "Stack script: $ROOT/scripts/start-local-ai-stack.sh"
