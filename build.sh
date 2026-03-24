#!/bin/bash
# build.sh — Builds all games into docs/ for GitHub Pages deployment.
#
# Usage: bash build.sh
# Output: docs/index.html (hub), docs/type-trainer.html, docs/opposites.html

set -euo pipefail

GAME_DIR="games/type-trainer"
DOCS_DIR="docs"

# JS files in dependency order (relative to GAME_DIR)
JS_FILES=(
  "js/utils.js"
  "js/audio.js"
  "js/storage.js"
  "js/stages.js"
  "js/adaptive.js"
  "js/keyboard.js"
  "js/play.js"
  "js/main.js"
)

echo "=== Kids Games Build ==="
echo ""

# --- Preflight checks ---
if [ ! -f "hub.html" ]; then
  echo "Error: hub.html not found. Run this script from the project root." >&2
  exit 1
fi

if [ ! -f "$GAME_DIR/index.html" ]; then
  echo "Error: $GAME_DIR/index.html not found." >&2
  exit 1
fi

if [ ! -f "$GAME_DIR/css/style.css" ]; then
  echo "Error: $GAME_DIR/css/style.css not found." >&2
  exit 1
fi

for f in "${JS_FILES[@]}"; do
  if [ ! -f "$GAME_DIR/$f" ]; then
    echo "Error: $GAME_DIR/$f not found." >&2
    exit 1
  fi
done

if [ ! -f "games/opposites/index.html" ]; then
  echo "Error: games/opposites/index.html not found." >&2
  exit 1
fi

echo "All source files found."
echo ""

# --- Create docs directory ---
mkdir -p "$DOCS_DIR"

# ==========================================================================
# BUILD 1: Type Trainer (inline CSS + JS into single HTML)
# ==========================================================================
echo "--- Building Type Trainer ---"

JS_TEMP=$(mktemp)
trap "rm -f '$JS_TEMP'" EXIT

for f in "${JS_FILES[@]}"; do
  echo "  Inlining $GAME_DIR/$f"
  echo "// --- $(basename "$f") ---" >> "$JS_TEMP"

  # Strip import/export statements using awk for multi-line import support.
  awk '
    /^import / || /^import\{/ {
      if ($0 ~ /;/) { next }
      while ((getline line) > 0) {
        if (line ~ /;/) break
      }
      next
    }
    /^export\s*\{\s*\}\s*;?\s*$/ { next }
    /^export default / {
      sub(/^export default /, "")
      print
      next
    }
    /^export / {
      sub(/^export /, "")
      print
      next
    }
    { print }
  ' "$GAME_DIR/$f" >> "$JS_TEMP"

  echo "" >> "$JS_TEMP"
done

echo ""
echo "Fixing import aliases..."

# startPlayGame -> startGame (play.js exports startGame)
sed -i.bak \
  -e 's/startPlayGame(/startGame(/g' \
  "$JS_TEMP" && rm -f "$JS_TEMP.bak"

if grep -v '^\s*//' "$JS_TEMP" | grep -q 'startPlayGame('; then
  echo "  [WARN] 'startPlayGame(' call site still present after replacement"
else
  echo "  [ok] startPlayGame -> startGame"
fi

CSS_FILE="$GAME_DIR/css/style.css"

echo ""
echo "Assembling type-trainer HTML..."

awk -v css_file="$CSS_FILE" -v js_file="$JS_TEMP" '
  /<link[^>]*style\.css[^>]*>/ {
    print "  <style>"
    while ((getline line < css_file) > 0) {
      print line
    }
    close(css_file)
    print "  </style>"
    next
  }
  /<script[^>]*type="module"[^>]*src=.*main\.js/ || /<script[^>]*src=.*main\.js[^>]*type="module"/ {
    print "  <script>"
    while ((getline line < js_file) > 0) {
      print line
    }
    close(js_file)
    print "  </script>"
    next
  }
  { print }
' "$GAME_DIR/index.html" > "$DOCS_DIR/type-trainer.html"

# --- Sanity checks ---
TT_OUTPUT="$DOCS_DIR/type-trainer.html"
echo ""

if [ ! -f "$TT_OUTPUT" ]; then
  echo "Error: Type Trainer build failed — output file not created." >&2
  exit 1
fi

TT_SIZE=$(wc -c < "$TT_OUTPUT" | tr -d ' ')
echo "Type Trainer built: $TT_OUTPUT ($TT_SIZE bytes)"

CHECKS_PASSED=0
CHECKS_TOTAL=4

if grep -q '<style>' "$TT_OUTPUT"; then
  echo "  [ok] CSS inlined"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "  [FAIL] CSS not inlined"
fi

if grep -q '// --- audio.js ---' "$TT_OUTPUT"; then
  echo "  [ok] JS inlined"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "  [FAIL] JS not inlined"
fi

IMPORT_COUNT=$(grep -c '^import ' "$TT_OUTPUT" 2>/dev/null || true)
if [ "$IMPORT_COUNT" = "0" ] || [ -z "$IMPORT_COUNT" ]; then
  echo "  [ok] No residual import statements"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "  [WARN] Found $IMPORT_COUNT residual 'import' statement(s)"
  grep -n '^import ' "$TT_OUTPUT" | head -5
fi

EXPORT_COUNT=$(grep -c '^export ' "$TT_OUTPUT" 2>/dev/null || true)
if [ "$EXPORT_COUNT" = "0" ] || [ -z "$EXPORT_COUNT" ]; then
  echo "  [ok] No residual export statements"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "  [WARN] Found $EXPORT_COUNT residual 'export' statement(s)"
  grep -n '^export ' "$TT_OUTPUT" | head -5
fi

echo "Sanity checks: $CHECKS_PASSED/$CHECKS_TOTAL passed"

if grep -q 'href="css/style.css"' "$TT_OUTPUT"; then
  echo "  [WARN] Original <link> to style.css still present"
fi
if grep -q 'type="module"' "$TT_OUTPUT"; then
  echo "  [WARN] Original <script type=\"module\"> still present"
fi

# ==========================================================================
# BUILD 2: Opposites Game (simple copy)
# ==========================================================================
echo ""
echo "--- Building Opposites Game ---"
cp games/opposites/index.html "$DOCS_DIR/opposites.html"
OPP_SIZE=$(wc -c < "$DOCS_DIR/opposites.html" | tr -d ' ')
echo "Opposites copied: $DOCS_DIR/opposites.html ($OPP_SIZE bytes)"

# ==========================================================================
# BUILD 3: Landing Page (simple copy)
# ==========================================================================
echo ""
echo "--- Building Landing Page ---"
cp hub.html "$DOCS_DIR/index.html"
HUB_SIZE=$(wc -c < "$DOCS_DIR/index.html" | tr -d ' ')
echo "Landing page copied: $DOCS_DIR/index.html ($HUB_SIZE bytes)"

# ==========================================================================
# Summary
# ==========================================================================
echo ""
echo "=== Build Complete ==="
echo "  $DOCS_DIR/index.html          — Landing page"
echo "  $DOCS_DIR/type-trainer.html   — Type Trainer"
echo "  $DOCS_DIR/opposites.html      — Opposites Game"
echo ""
echo "Test by opening docs/index.html in a browser."
