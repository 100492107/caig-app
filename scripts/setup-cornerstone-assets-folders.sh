#!/bin/bash
set -euo pipefail

ROOT="$HOME/CornerstoneAIAssets"

mkdir -p \
  "$ROOT/00_INBOX" \
  "$ROOT/01_CARA/01_REFERENCE" \
  "$ROOT/01_CARA/02_IMAGES/SOCIAL" \
  "$ROOT/01_CARA/02_IMAGES/CAROUSELS" \
  "$ROOT/01_CARA/02_IMAGES/FANVUE" \
  "$ROOT/01_CARA/03_VIDEOS/SIMPLE_REELS" \
  "$ROOT/01_CARA/03_VIDEOS/ADVANCED_REELS" \
  "$ROOT/01_CARA/03_VIDEOS/CAPTIONED" \
  "$ROOT/01_CARA/04_CAPTIONS" \
  "$ROOT/01_CARA/05_PUBLISHED" \
  "$ROOT/01_CARA/06_ARCHIVE" \
  "$ROOT/02_LILA/01_REFERENCE" \
  "$ROOT/02_LILA/02_IMAGES/SOCIAL" \
  "$ROOT/02_LILA/02_IMAGES/CAROUSELS" \
  "$ROOT/02_LILA/02_IMAGES/FANVUE" \
  "$ROOT/02_LILA/03_VIDEOS/SIMPLE_REELS" \
  "$ROOT/02_LILA/03_VIDEOS/ADVANCED_REELS" \
  "$ROOT/02_LILA/03_VIDEOS/CAPTIONED" \
  "$ROOT/02_LILA/04_CAPTIONS" \
  "$ROOT/02_LILA/05_PUBLISHED" \
  "$ROOT/02_LILA/06_ARCHIVE" \
  "$ROOT/03_CARA_LILA/01_REFERENCE" \
  "$ROOT/03_CARA_LILA/02_IMAGES/SOCIAL" \
  "$ROOT/03_CARA_LILA/02_IMAGES/CAROUSELS" \
  "$ROOT/03_CARA_LILA/02_IMAGES/FANVUE" \
  "$ROOT/03_CARA_LILA/03_VIDEOS/SIMPLE_REELS" \
  "$ROOT/03_CARA_LILA/03_VIDEOS/ADVANCED_REELS" \
  "$ROOT/03_CARA_LILA/03_VIDEOS/CAPTIONED" \
  "$ROOT/03_CARA_LILA/04_CAPTIONS" \
  "$ROOT/03_CARA_LILA/05_PUBLISHED" \
  "$ROOT/03_CARA_LILA/06_ARCHIVE" \
  "$ROOT/04_BRAND_ASSETS/LOGO" \
  "$ROOT/04_BRAND_ASSETS/FAVICON" \
  "$ROOT/04_BRAND_ASSETS/TEMPLATES" \
  "$ROOT/04_BRAND_ASSETS/EXPORT_PRESETS" \
  "$ROOT/05_CONTENT_PLANS" \
  "$ROOT/06_ANALYTICS" \
  "$ROOT/99_OLD_TO_SORT"

# Copy only the app's existing public brand assets when the repository is present.
REPO="$HOME/caig-local-worker"
if [ -d "$REPO/public" ]; then
  cp -f "$REPO/public/logo.png" "$ROOT/04_BRAND_ASSETS/LOGO/" 2>/dev/null || true
  cp -f "$REPO/public/favicon.png" "$ROOT/04_BRAND_ASSETS/FAVICON/" 2>/dev/null || true
  cp -f "$REPO/public/apple-touch-icon.png" "$ROOT/04_BRAND_ASSETS/FAVICON/" 2>/dev/null || true
fi

# Keep Downloads as an intake point only. We do not delete anything automatically.
cat > "$ROOT/README.txt" <<'EOF'
Cornerstone AI Assets — local content archive

00_INBOX = newly downloaded files waiting to be sorted.
01_CARA = Cara only.
02_LILA = Lila only.
03_CARA_LILA = shared account content.
04_BRAND_ASSETS = logos, favicons, templates and export settings.
05_CONTENT_PLANS = calendars, ideas and briefs.
06_ANALYTICS = performance notes and results.
99_OLD_TO_SORT = older Cornerstone files that still need classification.

Do not delete files automatically. Sort first, then archive/remove deliberately.
EOF

echo
printf 'Created: %s\n' "$ROOT"
printf 'Next: move existing Cornerstone-related files from Downloads into %s/00_INBOX and sort them deliberately.\n' "$ROOT"
