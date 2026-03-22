#!/bin/bash
# build.sh — Inlines CSS and JS into a single HTML file for distribution.
#
# Usage: bash build.sh
# Output: dist/typing-game.html
#
# This reads index.html, replaces the CSS <link> with inlined <style>,
# and replaces the JS <script type="module"> with a single inlined <script>
# containing all JS files concatenated in dependency order (with import/export
# statements stripped).

set -euo pipefail

DIST_DIR="dist"
OUTPUT="$DIST_DIR/typing-game.html"

# JS files in dependency order. Files with no dependencies on other app modules
# come first. Files that import from earlier files come later.
# Order: audio (standalone) -> storage (standalone) -> stages (standalone) ->
#        adaptive (standalone) -> keyboard (standalone) ->
#        learn (uses keyboard, audio, storage) ->
#        play (uses keyboard, audio, stages, storage, adaptive) ->
#        main (orchestrator, uses everything)
JS_FILES=(
  "js/audio.js"
  "js/storage.js"
  "js/stages.js"
  "js/adaptive.js"
  "js/keyboard.js"
  "js/learn.js"
  "js/play.js"
  "js/main.js"
)

echo "=== Typing Game Build ==="
echo ""

# --- Preflight checks ---
if [ ! -f "index.html" ]; then
  echo "Error: index.html not found. Run this script from the project root." >&2
  exit 1
fi

if [ ! -f "css/style.css" ]; then
  echo "Error: css/style.css not found." >&2
  exit 1
fi

for f in "${JS_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "Error: $f not found." >&2
    exit 1
  fi
done

echo "All source files found."
echo ""

# --- Create dist directory ---
mkdir -p "$DIST_DIR"

# --- Concatenate and strip JS files ---
# Write the concatenated JS to a temp file (avoids shell variable size limits
# and special character issues with awk -v).
JS_TEMP=$(mktemp)
trap "rm -f '$JS_TEMP'" EXIT

for f in "${JS_FILES[@]}"; do
  echo "  Inlining $f"
  echo "// --- $(basename "$f") ---" >> "$JS_TEMP"

  # Strip import/export statements using awk for multi-line import support.
  # Multi-line imports look like:
  #   import {
  #     foo, bar,
  #   } from './module.js';
  #
  # Strategy: when we see a line starting with 'import ', check if it has
  # a closing semicolon. If not, skip lines until we find one (the end of
  # the multi-line import). Same basic approach for 'export {' re-exports.
  #
  # For 'export function', 'export const', etc., strip the 'export ' prefix.
  # For 'export {};' (bare module marker), drop the line entirely.
  awk '
    # Skip state for multi-line imports
    /^import / || /^import\{/ {
      # If the line contains a semicolon, it is a complete single-line import
      if ($0 ~ /;/) { next }
      # Otherwise, skip until we see a line with a semicolon (end of import block)
      while ((getline line) > 0) {
        if (line ~ /;/) break
      }
      next
    }

    # Strip bare "export {};" or "export { };" module markers
    /^export\s*\{\s*\}\s*;?\s*$/ { next }

    # Strip "export default " prefix, keeping the rest
    /^export default / {
      sub(/^export default /, "")
      print
      next
    }

    # Strip "export " prefix from declarations (function, const, let, var, class)
    /^export / {
      sub(/^export /, "")
      print
      next
    }

    # Pass all other lines through unchanged
    { print }
  ' "$f" >> "$JS_TEMP"

  echo "" >> "$JS_TEMP"
done

# --- Fix import aliases that were lost during stripping ---
# main.js used:
#   import { startGame as startPlayGame, ... } from './play.js';
#   import { startLearn as startLearnMode, ... } from './learn.js';
#
# After stripping, the aliases are gone but call sites still use them.
# Replace the alias call sites with the original export names.
echo ""
echo "Fixing import aliases..."

# Use sed to replace alias references in the concatenated JS
# startPlayGame -> startGame (play.js exports startGame)
# startLearnMode -> startLearn (learn.js exports startLearn)
sed -i \
  -e 's/startPlayGame(/startGame(/g' \
  -e 's/startLearnMode(/startLearn(/g' \
  "$JS_TEMP"

# Verify the aliases were replaced (only check non-comment lines)
if grep -v '^\s*//' "$JS_TEMP" | grep -q 'startPlayGame('; then
  echo "  [WARN] 'startPlayGame(' call site still present after replacement"
else
  echo "  [ok] startPlayGame -> startGame"
fi

if grep -v '^\s*//' "$JS_TEMP" | grep -q 'startLearnMode('; then
  echo "  [WARN] 'startLearnMode(' call site still present after replacement"
else
  echo "  [ok] startLearnMode -> startLearn"
fi

# --- Build the output HTML ---
# Strategy: Use awk to read index.html line by line.
# - Replace the <link ... style.css ...> tag with inlined <style>
# - Replace the <script type="module" src="...main.js"> tag with inlined <script>
# For the JS and CSS content, we read from files to avoid shell escaping issues.

CSS_FILE="css/style.css"

echo ""
echo "Assembling HTML..."

awk -v css_file="$CSS_FILE" -v js_file="$JS_TEMP" '
  # Replace CSS link tag with inlined style
  /<link[^>]*style\.css[^>]*>/ {
    print "  <style>"
    while ((getline line < css_file) > 0) {
      print line
    }
    close(css_file)
    print "  </style>"
    next
  }

  # Replace JS script module tag with inlined script (handle both attribute orders)
  /<script[^>]*type="module"[^>]*src=.*main\.js/ || /<script[^>]*src=.*main\.js[^>]*type="module"/ {
    print "  <script>"
    while ((getline line < js_file) > 0) {
      print line
    }
    close(js_file)
    print "  </script>"
    next
  }

  # Pass all other lines through unchanged
  { print }
' index.html > "$OUTPUT"

# --- Verify output ---
echo ""

if [ ! -f "$OUTPUT" ]; then
  echo "Error: Build failed — output file not created." >&2
  exit 1
fi

OUTPUT_SIZE=$(wc -c < "$OUTPUT" | tr -d ' ')
echo "Build complete: $OUTPUT ($OUTPUT_SIZE bytes)"
echo ""

# --- Sanity checks ---
CHECKS_PASSED=0
CHECKS_TOTAL=4

# Check 1: CSS inlined
if grep -q '<style>' "$OUTPUT"; then
  echo "  [ok] CSS inlined"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "  [FAIL] CSS not inlined — <style> tag not found"
fi

# Check 2: JS inlined
if grep -q '// --- audio.js ---' "$OUTPUT"; then
  echo "  [ok] JS inlined"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "  [FAIL] JS not inlined — module markers not found"
fi

# Check 3: No residual import statements
IMPORT_COUNT=$(grep -c '^import ' "$OUTPUT" 2>/dev/null || true)
if [ "$IMPORT_COUNT" = "0" ] || [ -z "$IMPORT_COUNT" ]; then
  echo "  [ok] No residual import statements"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "  [WARN] Found $IMPORT_COUNT residual 'import' statement(s) — these will cause errors"
  grep -n '^import ' "$OUTPUT" | head -5
fi

# Check 4: No residual export statements
EXPORT_COUNT=$(grep -c '^export ' "$OUTPUT" 2>/dev/null || true)
if [ "$EXPORT_COUNT" = "0" ] || [ -z "$EXPORT_COUNT" ]; then
  echo "  [ok] No residual export statements"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "  [WARN] Found $EXPORT_COUNT residual 'export' statement(s) — these will cause errors"
  grep -n '^export ' "$OUTPUT" | head -5
fi

echo ""
echo "Sanity checks: $CHECKS_PASSED/$CHECKS_TOTAL passed"

# Check that no <link> to style.css remains
if grep -q 'href="css/style.css"' "$OUTPUT"; then
  echo "  [WARN] Original <link> to style.css still present in output"
fi

# Check that no <script type="module"> remains
if grep -q 'type="module"' "$OUTPUT"; then
  echo "  [WARN] Original <script type=\"module\"> still present in output"
fi

# --- Copy to docs/ for GitHub Pages ---
mkdir -p docs
cp "$OUTPUT" docs/index.html
echo "  Copied to docs/index.html (GitHub Pages)"

echo ""
echo "Test by opening $OUTPUT in a browser."
