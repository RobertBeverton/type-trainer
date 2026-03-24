# V1 Fixes Plan
**Date:** 2026-03-22
**Status:** REVIEWED — plan fixed, ready for implementation tasks
**Goal:** Address all findings from the 5-persona v1 review

---

## 1. Scope

Fix all Critical and High issues. Fix all Medium issues that are bugs or quick wins. Defer Low items that are feature requests (audio narration, data export, teacher guide, curriculum docs) to a v1.1 backlog.

### In Scope (39 items)
- 6 Critical fixes
- 13 High fixes
- 18 Medium fixes
- 2 Low fixes (soundMap perf, unused exports cleanup)

### Deferred to v1.1
- L1: Audio narration for pre-readers (feature)
- L2: Data export/backup for localStorage (feature)
- L5: Debounced aria-live for score/streak (polish)
- L6: Teacher guide / curriculum alignment doc (docs)
- L7: Confetti colours theme-aware (polish)
- L8: Footer font size (minor)
- L9: Accented character support in names (edge case)
- L10: roundRect polyfill (old browser edge case)
- M15: Space bar / Shift key Learn lessons (feature — new lesson content)

---

## 2. Architectural Decisions

**AD1: Pause button** (UPDATED after review)
- For **4-5**: Large (56x56px) pause button in a fixed corner position (top-right of canvas area), distinct colour, double-bar icon. Always visible during gameplay.
- For **6-8**: 44x44px pause button in HUD bar, labelled "Pause" (not icon-only).
- For **9-12 / Adult**: Icon-only pause button in HUD bar.
- Add pause button HTML to `index.html` HUD AND wire it up in play.js in the same task (T7). No split across batches.
- On first play for any player, pulse the pause button for 2 seconds to draw attention.
- **Pause overlay content** must be age-adapted:
  - 4-5: Large play/triangle icon as resume, label "Play" (not "Resume"). "Stop playing" instead of "Quit to Menu". No Escape instruction.
  - 6-8+: Current overlay is fine but change "RESUME" → "Resume", "QUIT TO MENU" → "Back to Menu".

**AD2: Countdown** (UPDATED after review)
- **All brackets**: Visual countdown with large colourful numerals drawn on canvas.
- **4-5**: 3, 2, 1 at 1.5-second intervals (4.5s total), with a gentle boop sound on each beat. End with a star/smiley icon instead of "GO".
- **6-8**: 3, 2, 1, GO! at 1-second intervals (4s total), with sound on each beat.
- **9-12 / Adult**: 3, 2, 1, GO! at 0.75-second intervals (3s total).
- **Implementation**: Game loop starts immediately but `gameState.countingDown = true` prevents spawning. Loop draws only the countdown numerals. When countdown completes, flag clears, `nextSpawn` set to `now + 1500` (buffer before first item).
- **Audio**: Play a countdown tick sound on each numeral. Use existing `playSound` system.

**AD3: Focus traps on modals** (UPDATED after review)
- Create a new `js/utils.js` file with `trapFocus(container)` and `releaseFocus()`.
- Add `utils.js` to the build script concat order FIRST (before audio.js) so it's available to all modules.
- Apply to: pause overlay, **game-over overlay**, delete confirmation, any learn.js modals.
- Both main.js and learn.js import from utils.js. play.js also imports for pause/game-over overlays.

**AD4: Age bracket editing** (UPDATED after review)
- Show the age badge on mode-select as a **tappable pill button** with a small edit/pencil icon.
- When tapped, expand inline (accordion-style) to show the four bracket options directly on the mode-select screen. No overlay.
- On selection, update player data, re-apply theme, collapse accordion.

**AD5: Leaderboard** (UPDATED after review)
- **Remove the table concept.** Instead, enhance existing player cards with a "personal best" emphasis and add a compact "Top Score" banner above the player grid showing the #1 player name + score (only if 2+ players exist).
- Each player card already shows stats — make the best score more prominent with a trophy icon.
- If only 1 player, skip the banner entirely.

**AD6: WPM tracking** (UPDATED after review)
- Calculate: `(totalCorrectChars / 5) / (elapsedMinutes)`.
- **Requires**: Add `gameState.startTime = performance.now()` in `startGame()` (after countdown). Compute elapsed in `endGame()`.
- **4-5**: Hide WPM entirely.
- **6-8**: Show as "Speed: X words per minute" (child-friendly label).
- **9-12 / Adult**: Show as "WPM: X".

**AD7: Reduced motion** (unchanged)
Add `@media (prefers-reduced-motion: reduce)` block in CSS to disable all animations. In play.js, check `window.matchMedia('(prefers-reduced-motion: reduce)')` and cache the result — skip particles/confetti when true.

**AD8: Learn mode lesson length for 4-5** (UPDATED after review)
- **Don't reduce reps** — 2 reps is too few for motor memory encoding.
- **Reduce the key set** for 4-5 bracket instead:
  - Home Row: Keep 3 reps but use only ASDF JKL (7 keys x 3 = 21 presses). Drop semicolon for 4-5.
  - Left/Right: Reduce to home-row + top-row keys only (skip bottom row for 4-5), 2 reps each.
- This keeps reps meaningful while shortening the session.

**AD9: Play mode tutorial** (NEW — raised by UX review)
- **Trigger**: First-ever play mode entry per player (`totalGamesPlayed === 0`).
- **Step 1**: A single letter drops slowly in centre with a bouncing arrow pointing to the matching key on the keyboard. Text: "A letter is falling! Press the matching key!" (4-5: "Press that letter!"). Letter at half speed.
- **Step 2**: Player types it. Success → celebration + "Great!". Failure → letter respawns at top, same letter.
- **Step 3**: Second letter at normal bracket speed. Success → "You've got it! Let's play!" → transition to real game.
- **Duration**: 15-30 seconds. Feels like the game, not a lesson.
- **9-12 / Adult**: Show "Skip" link. 4-5 and 6-8: always show on first play.

**AD10: Game-over stats by bracket** (NEW — raised by UX review)
- **4-5**: Show large star animation, "You got X letters right!", "You reached Stage X!" with friendly stage name. Hide accuracy %, fastest word, longest streak, weak keys.
- **6-8**: Show accuracy as "You got X out of every 10 right!" (not percentage). Show fastest word, hide weak keys.
- **9-12 / Adult**: Current stats display (accuracy %, WPM, fastest word, weak keys).

---

## 3. Files to Modify

| File | Changes |
|------|---------|
| **NEW `js/utils.js`** | AD3 focus trap utility (`trapFocus`, `releaseFocus`) |
| `js/play.js` | C1 pause btn wiring, C2 confetti leak (track victory rAF + cancel in cleanup/startGame), H1 countdown (countingDown flag), H5 theme cache refresh on toggle, H6 spawn delay, H10 game over title, M1 WPM (add startTime tracking), M3 button text, M5 age-adapted stats (AD10), M8 canvas contrast (text shadow on bright zones), M9 text tweaks, M11 countdown replaces blank canvas, M12 particle filter (not splice), AD7 reduced motion, AD9 tutorial, focus trap on pause+game-over overlays |
| `js/stages.js` | C3 spank, C4 trump, H3 tramp, M10 YOUNG_FILTER additions (rob, mob, sob) |
| `js/main.js` | C5 focus trap on delete (import from utils.js), H8 edit bracket (AD4 inline accordion), H9 storage warning toast, H11 radio arrow keys, H12 top-score banner (AD5), M2 "How old is the player?" wording, M16 delete permanence warning, M17 defer theme preview until "Let's go" |
| `js/learn.js` | C5 focus trap (import from utils.js), M4 lesson length (AD8 reduced key set), M6 learn celebrations (particles/confetti), M14 "Press any key on the keyboard!", M18 prompt font by bracket class (not theme) |
| `js/keyboard.js` | H7 key label opacity increase (0.55 → 0.75) |
| `js/audio.js` | L3 soundMap → module-level constant, new countdown tick sound |
| `js/storage.js` | H8 `updatePlayerBracket()` function, H9 storage size check + warning |
| `css/style.css` | H4 reduced motion media query, H7 key opacity, H13 fix undefined CSS vars (--spacing-* → --space-*, --color-error-* → explicit values), M7 stat font size increase, M3 button text-transform removal |
| `index.html` | C1 pause button in HUD |
| `build.sh` | C6 macOS sed (use `sed -i.bak -e` pattern + cleanup), add utils.js to concat order (first) |

---

## 4. Risks

1. **play.js is the most-modified file** (16+ changes). Batch 2 tasks are strictly sequential. Each task writes to disk on completion before next begins.
2. **Focus trap in utils.js** — new file added early in build concat order. Must verify no name collisions with existing functions across all modules.
3. **Countdown modifies game startup sequence** — most structurally invasive change. HUD, keyboard listeners, and theme setup must be initialized BEFORE countdown starts. Only spawning is delayed.
4. **Victory loop cancellation** — store victory rAF ID in module-level variable, cancel in both `cleanupPlay()` and `startGame()`.
5. **Tutorial adds a new game phase** — must not interfere with normal game flow on subsequent plays (check `totalGamesPlayed > 0` to skip).

---

## 5. Implementation Batches

### Batch 1: Quick Wins (parallel — all different files)
- **T1:** Word list cleanup (`stages.js` only)
- **T2:** Build script fixes — macOS sed + add utils.js to concat order (`build.sh` only)
- **T3:** CSS fixes — reduced motion, key opacity, undefined vars, stat font, button case (`style.css` only)
- **T4:** Keyboard opacity fix (`keyboard.js` only)
- **T5:** Audio soundMap cache + countdown tick sound (`audio.js` only)
- **T6:** Focus trap utility (`js/utils.js` — new file)
- **T7:** Storage improvements — bracket edit fn + size check (`storage.js` only)

**Review gate after Batch 1**

### Batch 2: Play Mode Fixes (sequential — all touch `play.js`)
- **T8:** Confetti leak fix (track victory rAF) + particle array filter + reduced motion JS check + theme cache refresh on toggle
- **T9:** Pause button (add to `index.html` HUD + wire in play.js) + age-adapted pause overlay content + countdown implementation (countingDown flag, canvas numerals, audio ticks, spawn buffer)
- **T10:** Game over improvements — age-adapted titles, age-adapted stats (AD10), WPM tracking (startTime), button text to title case, canvas text shadow for contrast, text tweaks ("So close!" for 4-5)
- **T11:** Tutorial (AD9) — first-play guided experience, skip for returning players

**Review gate after Batch 2**

### Batch 3: Main.js (sequential — all touch `main.js`)
- **T12:** Focus trap on delete confirmation + Escape handler + delete permanence warning + "How old is the player?" wording
- **T13:** Age bracket editing (AD4 inline accordion on mode-select) + defer theme preview until "Let's go"
- **T14:** Radio arrow keys on bracket picker + top-score banner (AD5) on player select

**Review gate after Batch 3**

### Batch 4: Learn Mode (sequential — all touch `learn.js`)
- **T15:** Focus traps + "Press any key on the keyboard!" wording + prompt font by bracket CSS class
- **T16:** Lesson length for 4-5 (AD8 reduced key set) + learn celebrations (particles/confetti on completion)

**Review gate after Batch 4**

### Batch 5: Final Integration
- **T17:** Full build + sanity checks + manual verification all 4 brackets

**Final review gate**

---

## 6. Acceptance Criteria

- All 6 Critical issues resolved
- All 13 High issues resolved
- All 18 targeted Medium issues resolved
- Build passes 4/4 sanity checks
- `utils.js` correctly concatenated before all other modules
- Game playable in all 4 age brackets (manual verification)
- No new word list issues
- Focus traps working on all modals (pause, game-over, delete)
- Reduced motion respected (CSS + JS)
- Pause button visible and functional per bracket
- Countdown plays before first item spawns
- Tutorial plays on first game per player, skips on subsequent
- WPM shown for 6-8+ on game-over
- Age-adapted stats on game-over screen

---

## 7. Review Addenda

### Plan Review 1 — Technical (2026-03-22)
- Fixed: Focus trap utility moved to new `utils.js` (concat before learn.js)
- Fixed: Pause button HTML + wiring in same task (T9), not split across batches
- Fixed: Game-over overlay added to focus trap scope
- Fixed: Victory loop rAF tracking specified for cancellation
- Fixed: Countdown uses `countingDown` flag, doesn't block game loop
- Fixed: WPM requires `startTime` tracking in gameState
- Fixed: T5 no longer touches play.js (removed unused export cleanup)
- Fixed: sed -i approach specified (`sed -i.bak -e` + cleanup)

### Plan Review 2 — UX (2026-03-22)
- Fixed: Pause button size/placement varies by bracket (AD1)
- Fixed: Countdown is visual numerals + audio, not text (AD2)
- Fixed: 4-5 gets longer countdown intervals (1.5s) not shorter
- Fixed: Age bracket editing uses tappable pill + inline accordion (AD4)
- Fixed: Leaderboard replaced with top-score banner + enhanced cards (AD5)
- Fixed: WPM shown for 6-8 with child-friendly label (AD6)
- Fixed: Lesson length reduces key SET not reps (AD8)
- Added: AD9 — Play mode tutorial specification
- Added: AD10 — Age-adapted game-over stats
- Fixed: Pause overlay content age-adapted
- Fixed: Countdown-to-first-spawn buffer (1.5s after countdown)
