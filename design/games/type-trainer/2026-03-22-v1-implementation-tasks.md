# V1 Implementation Tasks
**Date:** 2026-03-22
**Status:** REVIEWED & FIXED — ready for execution
**Parent plan:** [v1-fixes-plan.md](2026-03-22-v1-fixes-plan.md)

---

## Batch 1: Quick Wins (T1-T7 — all parallel, different files)

### T1: Word List Cleanup
**Files to read:** `js/stages.js`
**Files to modify:** `js/stages.js`
**Scope:**
- Remove "spank" from `five-letter` and `five-letter-fast`. Replace each with ONE neutral word (1:1 swap): "spank" → "stamp".
- Remove "trump" from `five-letter` and `five-letter-fast`. Replace 1:1: "trump" → "trunk".
- Remove "tramp" from `five-letter`. Replace 1:1: "tramp" → "trail".
- Add to `YOUNG_FILTER`: "rob", "mob", "sob", "slug", "spit", "grim", "skull", "filth", "thrash".
- Add neutral replacements to `YOUNG_EXTRAS` for each filtered word (9 additions).
**Acceptance:** No instances of removed words in any word list. YOUNG_FILTER contains all 9 new entries. Word counts per stage unchanged (1:1 replacements).
**Verification:** `grep -in "spank\|trump\|tramp" js/stages.js` returns 0 matches.

---

### T2: Build Script Fixes
**Files to read:** `build.sh`
**Files to modify:** `build.sh`
**Scope:**
- Fix all `sed -i` calls to use cross-platform pattern: `sed -i.bak -e '...' file && rm -f file.bak`
- Add `js/utils.js` as the FIRST file in the JS concatenation order (before audio.js).
- Create an empty placeholder `js/utils.js` so the build doesn't fail before T6 runs.
**Acceptance:** Build passes 4/4 sanity checks with the placeholder utils.js.
**Verification:** Run `bash build.sh` — 4/4 pass.

---

### T3: CSS Fixes
**Files to read:** `css/style.css`
**Files to modify:** `css/style.css`
**Scope:**
1. **Reduced motion** (H4): Add `@media (prefers-reduced-motion: reduce)` block at end of file. Disable: `key-pulse`, `key-correct-flash`, `key-shake`, `streak-shimmer`, `hs-pulse`, `hs-glow`, `learnCelebrate`, `fadeIn`. Set `animation: none !important; transition: none !important;` for all animated selectors.
2. **Key opacity** (H7): Change `.key` base opacity from `0.55` to `0.75`.
3. **Undefined CSS vars** (H13): In `.weak-keys-section`, replace `var(--spacing-md)` → `var(--space-md)`, `var(--spacing-sm)` → `var(--space-sm)`. In `.weak-key-badge`, replace `var(--color-error-bg)`, `var(--color-error-text)`, `var(--color-error-border)` with explicit values. Add dark theme overrides for weak-key badges.
4. **Stat font size** (M7): Increase `.player-card-stat-label` from `9px` → `11px`. Increase stat value from `--text-xs` → `13px`.
5. **Pause button styles**: Add `.pause-btn--large` class (56x56px, fixed top-right of play area, distinct colour). Add `.pause-btn--labelled` class (44x44px with text label). Add `#pause-btn` base styles matching other HUD buttons.
6. **Learn prompt by bracket**: Add `.learn-prompt--young` class with larger font-size (`var(--text-2xl)`). Remove the `:root[data-theme="light"] .learn-prompt-text` font-size rule (this was theme-based, should be bracket-based).

**NOTE:** Do NOT remove `text-transform: uppercase` from buttons in CSS here. That will be done together with the JS text changes in T10 to avoid a transient inconsistency between batches.

**Acceptance:** No `var(--spacing-` or `var(--color-error-` references remaining. Reduced motion query present. Key opacity is 0.75. Pause button classes defined. Learn prompt class defined.
**Verification:** `grep -n "spacing-\|color-error" css/style.css` returns 0 matches for undefined vars.

---

### T4: Keyboard Opacity Fix
**Files to read:** `js/keyboard.js`
**Files to modify:** `js/keyboard.js`
**Scope:**
- Update any hardcoded `0.55` opacity values to `0.75` to match the CSS change.
- Check `updateKeyboardAdaptive` and spotlight mode for opacity values that may conflict.
**Acceptance:** No hardcoded `0.55` opacity in keyboard.js.
**Verification:** `grep -n "0\.55" js/keyboard.js` returns 0 matches.

---

### T5: Audio Improvements
**Files to read:** `js/audio.js`
**Files to modify:** `js/audio.js`
**Scope:**
1. **soundMap cache** (L3): Move the `soundMap` object in `playSound()` to a module-level constant. Add new entries to it.
2. **Countdown tick sound**: Add `playCountdownTick()` function — short, gentle "boop" (sine wave, 440Hz, 100ms, soft envelope). Add `'countdownTick': playCountdownTick` to the soundMap.
3. **Countdown go sound**: Add `playCountdownGo()` function — slightly higher pitch, brighter (sine 660Hz, 150ms). Add `'countdownGo': playCountdownGo` to the soundMap.
**Acceptance:** `playSound('countdownTick')` and `playSound('countdownGo')` work via the soundMap dispatcher. soundMap is module-level.
**Verification:** No runtime errors when calling `playSound('countdownTick')`.

---

### T6: Focus Trap Utility (NEW FILE)
**Files to read:** None (new utility)
**Files to create:** `js/utils.js` (replaces T2's empty placeholder)
**Scope:**
Create `js/utils.js` with exported focus trap functions:
```js
// utils.js — Shared utilities (concatenated first in build)

let _focusTrapContainer = null;
let _focusTrapHandler = null;
let _previousFocus = null;

export function trapFocus(container) {
  releaseFocus(); // clean up any existing trap
  _previousFocus = document.activeElement;
  _focusTrapContainer = container;
  const focusable = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (first) first.focus();
  _focusTrapHandler = (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  container.addEventListener('keydown', _focusTrapHandler);
}

export function releaseFocus() {
  if (_focusTrapContainer && _focusTrapHandler) {
    _focusTrapContainer.removeEventListener('keydown', _focusTrapHandler);
  }
  if (_previousFocus && typeof _previousFocus.focus === 'function') {
    _previousFocus.focus();
  }
  _focusTrapContainer = null;
  _focusTrapHandler = null;
  _previousFocus = null;
}
```
Uses `export` — build script strips these during concatenation, making functions global. Other modules import with `import { trapFocus, releaseFocus } from './utils.js';` (also stripped by build).
**Acceptance:** `trapFocus(el)` constrains Tab within the container. `releaseFocus()` restores previous focus.
**Verification:** File exists with both exported functions.

---

### T7: Storage Improvements
**Files to read:** `js/storage.js`
**Files to modify:** `js/storage.js`
**Scope:**
1. **Bracket edit** (H8): Add `updatePlayerBracket(name, newBracket)` function. Updates `ageBracket`, resets `learnProgress` to defaults for new bracket, preserves play stats. Export it.
2. **Storage size check** (H9): Add `getStorageUsage()` function that returns `{ used: bytes, limit: 5242880, percent: n }`. Add `isStorageNearFull()` that returns boolean (> 80% used). Do NOT change `writeToStorage()` return type (keep boolean) — callers check `isStorageNearFull()` separately before saving.
**Acceptance:** `updatePlayerBracket('Lily', '6-8')` updates bracket and resets learn progress. `isStorageNearFull()` returns boolean.
**Verification:** Functions exported and callable.

---

## REVIEW GATE: Batch 1
Fresh review agent checks all 7 task outputs against the plan. Verify: no file conflicts, all acceptance criteria met, build passes.

---

## Batch 2: Play Mode Fixes (T8-T11 — sequential, all touch play.js)

### T8: Play.js Stability Fixes
**Files to read:** `js/play.js` (full file), `js/utils.js`
**Files to modify:** `js/play.js`
**Scope:**
1. **Confetti leak** (C2): Add module-level `let victoryRaf = null;`. In `endGame()`'s victory loop, store rAF ID: `victoryRaf = requestAnimationFrame(victoryLoop)`. In `cleanupPlay()` AND at the start of `startGame()`, add `if (victoryRaf) { cancelAnimationFrame(victoryRaf); victoryRaf = null; }`.
2. **Particle splice** (M12): In `updateParticles()`, replace the reverse-iterate + splice pattern with: update all particles in a forward loop, then `gameState.particles = gameState.particles.filter(p => p.life > 0)`. Same for `updatePopTexts()`.
3. **Reduced motion JS** (AD7): At module top, add `const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;`. In `spawnParticles()`, `spawnConfetti()`, and `drawWrongFlash()`, early-return if `prefersReducedMotion`.
4. **Theme cache refresh** (H5): In `initPlayDOM()`, create a `MutationObserver` on `document.documentElement` watching attribute `data-theme`. On change, call `cacheThemeColours()`. Store reference in module-level `let themeObserver`. In `cleanupPlay()`, disconnect it.
5. **Add import**: `import { trapFocus, releaseFocus } from './utils.js';`
**Acceptance:** victoryRaf tracked and cancelled in both `cleanupPlay()` and `startGame()`. Particles use filter. Reduced motion skips effects. Theme observer attached in init, disconnected in cleanup.
**Verification:** `grep -n "victoryRaf" js/play.js` shows assignment and cancellation.

---

### T9a: Pause Button + Overlay
**Files to read:** `js/play.js`, `index.html`
**Files to modify:** `js/play.js`, `index.html`
**Scope:**
1. **Pause button HTML** (C1): Add `<button id="pause-btn" class="hud-btn" aria-label="Pause game">⏸</button>` to HUD in `index.html`, after the mute button.
2. **Pause button wiring** in `initPlayDOM()`: Cache `hudEls.pauseBtn`, add click handler calling `pauseGame()`.
3. **Pause button styling by bracket**: In `startGame()`, apply CSS classes:
   - **4-5**: Add class `pause-btn--large` (56x56px, positioned top-right of canvas area, not in HUD flow). Distinct colour.
   - **6-8**: Add class `pause-btn--labelled`. Set `textContent = '⏸ Pause'` (icon + text label, 44x44px in HUD).
   - **9-12/Adult**: Default HUD icon-only style.
4. **Pause overlay age-adaptation** (AD1):
   - **4-5**: Resume button shows ▶ play icon + "Play" text (not "Resume"). Quit shows "Stop playing" (not "Quit to Menu"). Remove "Press Esc or tap Resume" instruction. Escape key STILL WORKS (just not displayed).
   - **6-8+**: "Resume" + "Back to Menu" (title case).
5. **Focus trap on pause overlay**: Call `trapFocus(overlay)` when showing, `releaseFocus()` on Resume/Quit.
6. **First-play pulse**: If `callbacks.totalGamesPlayed === 0`, add CSS class `pause-btn--pulse` for 2 seconds (uses CSS animation, removed by setTimeout).
**Acceptance:** Pause button visible per bracket styling. Overlay text varies by bracket. Focus trapped. Pulse on first play.
**Verification:** Manual test — pause button visible, click pauses, Tab stays in overlay.

---

### T9b: Countdown
**Files to read:** `js/play.js` (startGame, loop function), `js/audio.js` (sound names)
**Files to modify:** `js/play.js`
**Scope:**
1. Add `gameState.countingDown = true` and `gameState.countdownStart = performance.now()` in `startGame()`, AFTER all setup but BEFORE the loop starts.
2. In `loop()`, when `gameState.countingDown === true`:
   - Do NOT process spawns, items, or input.
   - Draw background as normal.
   - Calculate `elapsed = now - gameState.countdownStart`.
   - **Bracket timing:**
     - 4-5: Intervals at 1.5s → show "3" at 0s, "2" at 1.5s, "1" at 3.0s, star/smiley at 4.5s, complete at 5.5s.
     - 6-8: Intervals at 1.0s → "3" at 0s, "2" at 1.0s, "1" at 2.0s, "GO!" at 3.0s, complete at 3.75s.
     - 9-12/Adult: Intervals at 0.75s → "3" at 0s, "2" at 0.75s, "1" at 1.5s, "GO!" at 2.25s, complete at 2.75s.
   - Draw numeral large and centred on canvas (bold, 72px, theme text colour).
   - **4-5 final symbol**: Draw a star (★) instead of "GO!".
   - Play `playSound('countdownTick')` on each numeral transition. Play `playSound('countdownGo')` on final (GO/star).
   - Track `gameState._lastCountdownStep` to avoid replaying sounds.
3. When countdown completes: set `gameState.countingDown = false`. Set `gameState.startTime = performance.now()` (for WPM). Set `gameState.nextSpawn = performance.now() + 1500` (buffer before first item).
4. Remove old initial spawn delay: delete the `bracket === '4-5' ? 800 : 2000` from nextSpawn in the startGame reset block.
**Acceptance:** Countdown plays before first item for all brackets. Timing varies per bracket. Audio ticks play. 1.5s buffer after countdown before first spawn. `startTime` is set for WPM.
**Verification:** Manual test — each bracket shows correct countdown timing.

---

### T10: Game Over Improvements
**Files to read:** `js/play.js` (game over section ~line 994-1103)
**Files to modify:** `js/play.js`
**Scope:**
1. **Title for 9-12** (H10): Change game-over title from "Game Over" to "Good effort!" for 9-12 when not all stages cleared.
2. **Age-adapted stats** (AD10):
   - **4-5**: Show large "★" character/emoji, then "You got X letters right!" (using `sessionStats.totalCorrect`), "You reached Stage X!" with friendly stage name. HIDE: accuracy, fastest word, streak, weak keys, WPM.
   - **6-8**: Show accuracy as "You got X out of every 10 right!" (calculate: `Math.round(accuracy * 10)`). Show fastest word. Show WPM as "Speed: X words per minute". HIDE: weak keys.
   - **9-12/Adult**: Current stats + WPM as "WPM: X".
3. **WPM calculation** (AD6, M1): In `endGame()`, calculate: `const elapsedMs = performance.now() - gameState.startTime; const wpm = Math.round((sessionStats.totalCorrect / 5) / (elapsedMs / 60000));`. (`startTime` was set by T9b at countdown completion.)
4. **Button text + CSS** (M3): Change "PLAY AGAIN" → "Play Again", "BACK TO MENU" → "Back to Menu", "RESUME" → "Resume", "QUIT TO MENU" → "Back to Menu". Also remove `text-transform: uppercase` from the button styles in `css/style.css` (coordinated change — do both JS text and CSS rule in this task).
5. **Canvas contrast** (M8): In `drawItem()`, before `fillText()`, add `ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 3; ctx.strokeText(text, x, y)` to provide a subtle outline that ensures legibility on bright zone colours.
6. **Text tweaks** (M9): Change "Almost!" pop text to "So close!" when bracket is '4-5'.
7. **Focus trap** on game-over overlay: Call `trapFocus(overlay)` after building the overlay DOM. Call `releaseFocus()` in both "Play Again" and "Back to Menu" button handlers before navigation.
**Acceptance:** Game-over shows correct content per bracket. WPM displays for 6-8+. Button text is title case everywhere. Canvas items have text outline. Focus trapped.
**Verification:** Manual test — each bracket shows correct stats format.

---

### T11: Play Mode Tutorial
**Files to read:** `js/play.js`, `js/main.js` (enterPlayMode around line 730 for callbacks)
**Files to modify:** `js/play.js`, `js/main.js` (ONE small change: add `totalGamesPlayed` to callbacks)
**Scope:**
1. **main.js change** (small): In `enterPlayMode()`, add `totalGamesPlayed: currentPlayer.data.totalGamesPlayed || 0` to the callbacks object passed to `startGame()`.
2. Add `gameState.tutorialPhase = 0` to the state reset in `startGame()`.
3. After countdown completes (where `countingDown` flips to false), check `callbacks.totalGamesPlayed === 0`. If true, set `tutorialPhase = 1`.
4. **Phase 1**: Spawn one letter horizontally centred at half bracket speed. Show canvas text above it: "Press that letter!" (4-5) or "Type the falling letter!" (6-8+). Highlight the key on the on-screen keyboard (already working for 4-5/6-8). Ignore wrong keys (no miss registered, no life lost, no sound). Correct key → particles + "Great!" pop text → `tutorialPhase = 2`.
5. **Phase 2**: Spawn second letter at normal speed. Same ignore-wrong-keys behaviour. Correct key → "Let's play!" pop text → `tutorialPhase = 0`, normal gameplay begins.
6. **Skip**: For 9-12 and Adult ONLY, render a small "Skip →" text in bottom-right of canvas. Clicking canvas in that region (or pressing Escape during tutorial) sets `tutorialPhase = 0`. Do NOT show skip for 4-5 or 6-8.
7. During tutorial (`tutorialPhase > 0`): do not decrement lives, do not increment score, do not update adaptive engine.
**Acceptance:** First play shows 2-letter tutorial. Second play skips. Skip works for 9-12/Adult. No skip for 4-5/6-8. Wrong keys ignored during tutorial.
**Verification:** Create new player, play — tutorial appears. Play again — no tutorial. Test skip for Adult.

---

## REVIEW GATE: Batch 2
Fresh review agent checks T8-T11 diffs against plan. Focus on: countdown timing, tutorial flow, focus trap integration, victory loop cancellation, startTime set correctly.

---

## Batch 3: Main.js (T12-T14 — sequential, all touch main.js)

### T12: Dialog Fixes
**Files to read:** `js/main.js` (delete confirmation ~line 321-364, add player form ~line 386-440)
**Files to modify:** `js/main.js`
**Scope:**
1. **Add import**: `import { trapFocus, releaseFocus } from './utils.js';`
2. **Focus trap on delete confirm** (C5): Call `trapFocus(confirmPanel)` after building the panel and appending to DOM. Call `releaseFocus()` in both Yes and No handlers before removing the panel.
3. **Escape handler** on delete confirm: Add keydown listener on the confirmPanel for Escape that triggers the cancel/No action.
4. **Delete permanence warning** (M16): Change confirmation text from "Delete {name}?" to "Delete {name}?\nAll progress will be lost.\nThis cannot be undone."
5. **"How old" wording** (M2): Change "How old are you?" to "How old is the player?" on the add-player form.
**Acceptance:** Delete dialog traps focus, Escape cancels, shows permanence warning. Age question reworded.
**Verification:** Tab through delete dialog — focus wraps. Press Escape — dialog closes.

---

### T13: Age Bracket Editing
**Files to read:** `js/main.js` (mode select section), `js/storage.js` (for updatePlayerBracket)
**Files to modify:** `js/main.js`
**Scope:**
1. **Tappable age badge** (AD4): In `showModeSelect()`, render the age bracket badge as a `<button>` pill with a small pencil icon (✏ or SVG). Style as a clickable affordance.
2. **Inline accordion**: On click, expand a section below the greeting showing the 4 bracket options as radio-style buttons (reuse pattern from add-player bracket picker). Add arrow key navigation (reuse from T14 if available, or implement here).
3. **On selection**: Call `updatePlayerBracket(name, newBracket)` (imported from storage.js). Re-apply theme via `setTheme()`. Collapse the accordion. Update the badge text and `currentPlayer.data`.
4. **Theme preview fix** (M17): Remove the `setTheme()` call from the bracket radio buttons in the add-player form. Only apply theme after "Let's go!" submission.
**Acceptance:** Age badge is a tappable button. Accordion expands/collapses. Bracket change persists and applies theme. Theme doesn't flash during player creation.
**Verification:** Click age badge — accordion expands. Select different bracket — badge updates, theme changes. Create new player — theme stable until submit.

---

### T14: Radio Keys + Top Score Banner
**Files to read:** `js/main.js` (bracket picker, showPlayerSelect)
**Files to modify:** `js/main.js`
**Scope:**
1. **Radio arrow keys** (H11): Add keydown handler to bracket `radiogroup` containers (both add-player and bracket-edit accordion). Arrow Left/Up and Arrow Right/Down cycle options. Home → first, End → last. Update `aria-checked`, `tabindex`, and visual selection.
2. **Top score banner** (AD5): In `showPlayerSelect()`, after building the player grid, if 2+ players exist, find highest `highScore`. Render a compact banner ABOVE the grid: "Top Score: {name} — {score}" with trophy emoji and subtle background.
3. **Enhanced player cards**: Make "Best score" stat more prominent — slightly larger font, trophy emoji prefix on the score value.
**Acceptance:** Arrow keys navigate all bracket pickers. Top score banner shows for 2+ players. Player cards have enhanced score.
**Verification:** Tab to bracket picker, arrow keys work. Two players with different scores — banner shows winner.

---

## REVIEW GATE: Batch 3
Fresh review agent checks T12-T14. Focus on: focus trap lifecycle, bracket editing data flow, radio group ARIA, main.js import of utils.js.

---

## Batch 4: Learn Mode (T15-T16 — sequential, all touch learn.js)

### T15: Learn Mode Dialog + Text Fixes
**Files to read:** `js/learn.js` (full file)
**Files to modify:** `js/learn.js`, `css/style.css`
**Scope:**
1. **Add import**: `import { trapFocus, releaseFocus } from './utils.js';`
2. **Focus traps**: Apply `trapFocus()` to the celebration buttons container when it becomes visible. Apply `releaseFocus()` when navigating away (Continue, Replay, Start Playing clicks).
3. **"Press any key" wording** (M14): Change "Press anything to begin!" to "Press any key on the keyboard to begin!".
4. **Prompt font by bracket** (M18): When rendering the prompt element, add class `learn-prompt--young` for 4-5 bracket. In `css/style.css`, remove the `:root[data-theme="light"] .learn-prompt-text { font-size: ... }` rule (if it exists) — the `.learn-prompt--young` class added in T3 handles this by bracket instead of theme.
**Acceptance:** Focus trapped in celebration buttons. Intro text updated. Prompt font varies by bracket class, not theme.
**Verification:** Complete a lesson — Tab wraps within celebration area.

---

### T16: Learn Lesson Length + Celebrations
**Files to read:** `js/learn.js` (lesson group definitions, drill generation, celebration section)
**Files to modify:** `js/learn.js`
**Scope:**
1. **Lesson length for 4-5** (AD8):
   - Home Row: For 4-5 bracket, use reduced key set `ASDFJKL` (7 keys, drop semicolon). Keep 3 reps = 21 presses total.
   - Left/Right lesson: For 4-5 bracket, use home-row + top-row keys only (skip bottom row). 2 reps each.
   - Modify the drill generation logic: check `bracket` parameter and filter the key array accordingly before generating the sequence.
2. **Learn celebrations** (M6): Use CSS-only confetti approach (learn mode is DOM-based, not canvas):
   - On lesson completion, create 20-30 absolutely-positioned `<div>` elements with small coloured squares/circles.
   - Apply CSS `@keyframes` animation: fall from top + fade out over 2 seconds.
   - Remove the confetti elements after animation completes (use `animationend` event).
   - Show confetti during the existing 1.5s delay before Continue button appears.
**Acceptance:** 4-5 Home Row = 21 presses. 4-5 Left/Right shorter (no bottom row). Celebration has visible CSS confetti. Confetti elements cleaned up after animation.
**Verification:** Count prompts in 4-5 Home Row drill. Complete a lesson — confetti falls.

---

## REVIEW GATE: Batch 4
Fresh review agent checks T15-T16. Focus on: lesson key sets correct per bracket, confetti DOM cleanup, focus trap lifecycle, CSS file changes.

---

## Batch 5: Final Integration (T17)

### T17: Build + Verify
**Files to read:** All JS, CSS, HTML, build.sh
**Files to modify:** None (build only)
**Scope:**
1. Run `bash build.sh` — must pass 4/4 sanity checks.
2. Open `dist/typing-game.html` in browser.
3. Test each bracket:
   - **4-5**: Create player → Learn Home Row (21 presses, no semicolon) → Play (countdown 3-2-1-★ with boops at 1.5s intervals, tutorial on first play, large pause button top-right, game over shows "You got X letters right!" with star, no WPM).
   - **6-8**: Play → countdown 3-2-1-GO! at 1s intervals → game over shows "X out of 10 right!" + "Speed: X words per minute". Pause button has "Pause" label.
   - **9-12**: Play → countdown fast → game over shows "Good effort!" (not "Game Over") + WPM. Tutorial has Skip link.
   - **Adult**: Play → full stats + "WPM: X".
4. Test: Pause button works in all brackets. Escape pauses (all brackets). Focus trap on pause/game-over/delete overlays. Delete shows permanence warning. Bracket editing works from mode-select. Arrow keys on bracket picker. Top score banner with 2+ players. Canvas text has outline for contrast. Reduced motion respected.
**Acceptance:** Build passes. All manual tests pass. No console errors.
**Verification:** Build output < 260KB (increased due to new features).

---

## FINAL REVIEW GATE
Fresh review agent with full diff against plan. Final sign-off before commit + push.

---

## Review Addenda

### Implementation Task Review 1 — Technical (2026-03-22)
- Fixed: T9 split into T9a (pause) and T9b (countdown) — each appropriately sized
- Fixed: T5 API — use soundMap integration (`playSound('countdownTick')`), not standalone functions
- Fixed: T6 adds `export` statements — build script strips them, modules import normally
- Fixed: T7 keeps `writeToStorage` boolean return — added separate `isStorageNearFull()` check
- Fixed: T1 word replacements are 1:1 (not net +2)
- Fixed: T8 MutationObserver lifecycle specified — attach in initPlayDOM, disconnect in cleanupPlay
- Fixed: T9a first-play pulse uses `totalGamesPlayed === 0` (not `previousHighScore === undefined`)
- Fixed: T9b sets `gameState.startTime` at countdown completion — T10 just reads it
- Fixed: T11 tutorial arrow simplified to canvas text hint (not cross-coordinate bouncing arrow)
- Fixed: T11 explicitly lists main.js as modified file (for callbacks change)
- Fixed: T15 explicitly lists css/style.css as modified file
- Fixed: T16 picks CSS-only confetti definitively (no "or" ambiguity)

### Implementation Task Review 2 — UX (2026-03-22)
- Fixed: T9a has explicit per-bracket sizing (56px/44px), positioning, labels, and colours
- Fixed: T9a includes pause overlay focus trap (was missing)
- Fixed: T9a specifies Escape still works for 4-5 (just not displayed in overlay)
- Fixed: T9b has explicit timing values per bracket in scope
- Fixed: T9b specifies 4-5 gets ★ instead of "GO!"
- Fixed: T10 explicitly hides WPM for 4-5
- Fixed: T10 includes ★ character for 4-5 game-over
- Fixed: T11 explicitly states no Skip for 4-5/6-8
- Fixed: T11 tutorial uses ignore-wrong-keys approach (not respawn)
- Fixed: T10 coordinates CSS text-transform removal with JS text changes (same task)
- Fixed: T3 note added about NOT removing text-transform (deferred to T10)
