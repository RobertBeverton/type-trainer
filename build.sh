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

for f in "shared/tokens.css" "shared/shell.html" "shared/shell.css" "shared/shell.js" "shared/storage.js"; do
  if [ ! -f "$f" ]; then
    echo "Error: $f not found." >&2
    exit 1
  fi
done

echo "All source files found."
echo ""

# --- Create docs directory ---
mkdir -p "$DOCS_DIR"

# ==========================================================================
# BUILD 1: Type Trainer (inline CSS + JS into single HTML)
# ==========================================================================
echo "--- Building Type Trainer ---"

JS_TEMP=$(mktemp)
CSS_TEMP=$(mktemp)
SHELL_JS_TEMP=$(mktemp)
JS_COMBINED=$(mktemp)
trap "rm -f '$JS_TEMP' '$CSS_TEMP' '$SHELL_JS_TEMP' '$JS_COMBINED'" EXIT

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

# --- Concatenate shared tokens + shell CSS + game CSS ---
cat shared/tokens.css shared/shell.css "$GAME_DIR/css/style.css" > "$CSS_TEMP"

# --- Build combined shell JS (storage + shell wrapped in IIFE) ---
echo "(function() { 'use strict';" > "$SHELL_JS_TEMP"
cat shared/storage.js >> "$SHELL_JS_TEMP"
# Strip IIFE open/close from shell.js (we wrap them together)
sed -e 's/^(function() {$//' -e "s/^  'use strict';$//" -e 's/^})();$//' shared/shell.js >> "$SHELL_JS_TEMP"
echo "})();" >> "$SHELL_JS_TEMP"

# Prepend shell to game JS
cat "$SHELL_JS_TEMP" "$JS_TEMP" > "$JS_COMBINED"

echo ""
echo "Assembling type-trainer HTML..."

awk -v css_file="$CSS_TEMP" -v js_file="$JS_COMBINED" -v shell_file="shared/shell.html" '
  /<link[^>]*shared\/tokens\.css[^>]*>/ { next }
  /<link[^>]*shared\/shell\.css[^>]*>/ { next }
  /<link[^>]*style\.css[^>]*>/ {
    print "  <style>"
    while ((getline line < css_file) > 0) { print line }
    close(css_file)
    print "  </style>"
    next
  }
  /<body/ {
    print
    while ((getline line < shell_file) > 0) { print line }
    close(shell_file)
    next
  }
  /<script[^>]*type="module"[^>]*src=.*main\.js/ || /<script[^>]*src=.*main\.js[^>]*type="module"/ {
    print "  <script>"
    while ((getline line < js_file) > 0) { print line }
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
CHECKS_TOTAL=5

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

if grep -q 'kg-shell' "$TT_OUTPUT"; then
  echo "  [ok] Shell bar injected"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "  [FAIL] Shell bar not found"
fi

echo "Sanity checks: $CHECKS_PASSED/$CHECKS_TOTAL passed"

if grep -q 'href="css/style.css"' "$TT_OUTPUT"; then
  echo "  [WARN] Original <link> to style.css still present"
fi
if grep -q 'type="module"' "$TT_OUTPUT"; then
  echo "  [WARN] Original <script type=\"module\"> still present"
fi

# NOTE: Opposites and hub source HTML must have exactly one <style> tag.
# Shared tokens are injected immediately after the opening <style> tag.

# ==========================================================================
# BUILD 2: Opposites Game (inline shared tokens)
# ==========================================================================
echo ""
echo "--- Building Opposites Game ---"
awk -v tokens_file="shared/tokens.css" -v shell_css="shared/shell.css" \
    -v shell_html="shared/shell.html" -v shell_js="$SHELL_JS_TEMP" '
  /<link[^>]*shared\/tokens\.css[^>]*>/ { next }
  /<link[^>]*shared\/shell\.css[^>]*>/ { next }
  /<style>/ {
    print
    while ((getline line < tokens_file) > 0) { print line }
    close(tokens_file)
    while ((getline line < shell_css) > 0) { print line }
    close(shell_css)
    next
  }
  /<body/ {
    print
    while ((getline line < shell_html) > 0) { print line }
    close(shell_html)
    next
  }
  /<\/body>/ {
    print "  <script>"
    while ((getline line < shell_js) > 0) { print line }
    close(shell_js)
    print "  </script>"
    print
    next
  }
  { print }
' games/opposites/index.html > "$DOCS_DIR/opposites.html"
OPP_SIZE=$(wc -c < "$DOCS_DIR/opposites.html" | tr -d ' ')
echo "Opposites built: $DOCS_DIR/opposites.html ($OPP_SIZE bytes)"

if grep -q 'kg-shell' "$DOCS_DIR/opposites.html"; then
  echo "  [ok] Shell bar injected in opposites"
else
  echo "  [WARN] Shell bar missing from opposites"
fi

# ==========================================================================
# BUILD 3: Landing Page (inline shared tokens)
# ==========================================================================
echo ""
echo "--- Building Landing Page ---"
awk -v tokens_file="shared/tokens.css" -v shell_css="shared/shell.css" \
    -v shell_html="shared/shell.html" -v shell_js="$SHELL_JS_TEMP" '
  /<link[^>]*shared\/tokens\.css[^>]*>/ { next }
  /<link[^>]*shared\/shell\.css[^>]*>/ { next }
  /<style>/ {
    print
    while ((getline line < tokens_file) > 0) { print line }
    close(tokens_file)
    while ((getline line < shell_css) > 0) { print line }
    close(shell_css)
    next
  }
  /<body/ {
    print
    while ((getline line < shell_html) > 0) { print line }
    close(shell_html)
    next
  }
  /<\/body>/ {
    print "  <script>"
    while ((getline line < shell_js) > 0) { print line }
    close(shell_js)
    print "  </script>"
    print
    next
  }
  { print }
' hub.html > "$DOCS_DIR/index.html"
HUB_SIZE=$(wc -c < "$DOCS_DIR/index.html" | tr -d ' ')
echo "Landing page built: $DOCS_DIR/index.html ($HUB_SIZE bytes)"

if grep -q 'kg-shell' "$DOCS_DIR/index.html"; then
  echo "  [ok] Shell bar injected in hub"
else
  echo "  [WARN] Shell bar missing from hub"
fi

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

# --- Optional: create release zip ---
if [ "${1:-}" = "--release" ]; then
  RELEASE_DIR="release"
  mkdir -p "$RELEASE_DIR"
  ZIP_NAME="kids-games-$(date +%Y%m%d).zip"
  ZIP_PATH="$RELEASE_DIR/$ZIP_NAME"

  # Gather files to package
  FILES=(
    "$DOCS_DIR/index.html"
    "$DOCS_DIR/type-trainer.html"
    "$DOCS_DIR/opposites.html"
  )

  if command -v zip >/dev/null 2>&1; then
    # Create a README for the zip
    echo "Open index.html in your web browser to play." > "$RELEASE_DIR/README.txt"
    (cd "$DOCS_DIR" && zip -r "../$ZIP_PATH" index.html type-trainer.html opposites.html)
    (cd "$RELEASE_DIR" && zip "$ZIP_NAME" README.txt && rm README.txt)
  elif command -v powershell >/dev/null 2>&1; then
    # Fallback: use PowerShell Compress-Archive (Windows)
    WIN_FILES=$(printf '"%s",' "${FILES[@]}" | sed 's/,$//')
    WIN_DEST=$(echo "$ZIP_PATH" | sed 's|/|\\|g')
    powershell -NoProfile -Command "\$files = @($WIN_FILES); Compress-Archive -Path \$files -DestinationPath '$WIN_DEST' -Force" >/dev/null
  else
    echo "Warning: neither 'zip' nor 'powershell' found — skipping zip creation."
    echo "Manually zip the contents of $DOCS_DIR/ to create a release."
    exit 0
  fi

  echo ""
  echo "Release package: $ZIP_PATH"
fi
