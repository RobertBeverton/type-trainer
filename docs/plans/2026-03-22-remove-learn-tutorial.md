# Remove Learn Mode & Play Tutorial

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove Learn mode and Play tutorial entirely. The game is intuitive (letters fall, press matching key) and the keyboard glow during Play is the real teacher. Learn mode is disconnected from gameplay, and the tutorial is confusing on harder difficulties.

**Architecture:** Delete learn.js entirely. Remove all Learn references from main.js (import, mode select button, Learn progress helpers, enterLearnMode). Remove tutorial logic from play.js (tutorialPhase state, tutorial spawn/draw/input handling). Remove learnProgress from storage.js defaults. Remove learn-area from HTML and learn CSS. Remove learn.js from build.sh. The mode select screen becomes a direct "Play" screen with difficulty selection — no mode choice needed.

**Tech Stack:** Vanilla HTML5/CSS3/JavaScript (ES modules), build.sh concat bundler.

---

## Task 1: Delete learn.js and remove from build

**Files:**
- Delete: `js/learn.js`
- Modify: `build.sh:24-33` (remove learn.js from JS_FILES array)

**Step 1: Delete learn.js**

Delete the entire file `js/learn.js`.

**Step 2: Remove learn.js from build.sh**

In `build.sh`, the `JS_FILES` array (lines 24-33) lists all JS files in dependency order. Remove the `"js/learn.js"` entry:

```bash
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
```

Also update the comment above (lines 17-23) to remove the learn.js reference:

```bash
# JS files in dependency order. Files with no dependencies on other app modules
# come first. Files that import from earlier files come later.
# Order: utils (shared helpers) -> audio (standalone) -> storage (standalone) ->
#        stages (standalone) -> adaptive (standalone) -> keyboard (standalone) ->
#        play (uses keyboard, audio, stages, storage, adaptive) ->
#        main (orchestrator, uses everything)
```

**Step 3: Commit**

```bash
git rm js/learn.js
git add build.sh
git commit -m "remove: delete learn.js and remove from build

Learn mode is disconnected from gameplay. The keyboard glow during
Play mode is the real teaching mechanism."
```

---

## Task 2: Remove Learn from main.js

**Files:**
- Modify: `js/main.js`

This is the largest change. The mode select screen currently shows Learn + Play buttons. Without Learn, the mode select screen should go straight to Play — it becomes a "ready to play?" screen with difficulty selection and a Play button.

**Step 1: Remove learn.js import (line 13)**

Delete this line:
```javascript
import { startLearn as startLearnMode, cleanupLearn } from './learn.js';
```

**Step 2: Remove getLearnProgressSummary function (lines 652-669)**

Delete the entire `getLearnProgressSummary` function — it's only used for the Learn button.

**Step 3: Rewrite showModeSelect to remove Learn button**

The current `showModeSelect()` (lines 677-905) shows Learn and Play buttons with prominence logic based on age bracket. Replace the entire Learn button section and the prominence logic.

Remove all of lines 807-887 (the Learn button creation, progress dots, prominence logic). Replace with just the Play button, always prominent:

The Play button section (lines 852-866) stays as-is but remove the prominence class logic. Just make it always prominent:

```javascript
  playBtn.classList.add('prominent');
  buttonsContainer.appendChild(playBtn);
```

Remove the `prominentBtn`/`subtleBtn` logic and the age-bracket branching (lines 868-887). The focus target becomes `playBtn`:

```javascript
  requestAnimationFrame(() => {
    focusElement(playBtn);
  });
```

**Step 4: Remove enterLearnMode function (lines 911-915)**

Delete the entire function:
```javascript
function enterLearnMode() {
  if (!currentPlayer) return;
  startLearnMode(currentPlayer.name, currentPlayer.data.ageBracket);
}
```

**Step 5: Remove cleanupLearn call from cleanupAll**

In the `cleanupAll()` function, find and remove:
```javascript
  try { cleanupLearn(); } catch (_) { /* learn.js may not be initialised */ }
```

**Step 6: Remove 'learn' from appState type**

The appState variable comment/type (line 23) lists `'learn'` as a valid state. Remove it:
```javascript
/** @type {'playerSelect' | 'modeSelect' | 'play'} */
```

**Step 7: Verify no remaining learn references**

Search main.js for any remaining references to `learn`, `Learn`, `learnProgress`, `cleanupLearn`, `startLearnMode`, `enterLearnMode`. Remove any found.

**Step 8: Commit**

```bash
git add js/main.js
git commit -m "remove: strip Learn mode from main.js mode select

Mode select now shows only the Play button. Learn button, progress
tracking, and prominence logic removed."
```

---

## Task 3: Remove tutorial from play.js

**Files:**
- Modify: `js/play.js`

The tutorial is a first-play guided experience with 2 tutorial letters at half speed. Remove all tutorial logic.

**Step 1: Remove tutorial state from gameState (around line 1635-1637)**

In the `startGame()` function, find and remove these three lines from the `Object.assign(gameState, {` block:

```javascript
    tutorialPhase: 0,
    _tutorialDone: false,
    _lastHintKey: null,
```

Note: `_lastHintKey` is also used by the normal gameplay keyboard hint code (lines 1529-1539), so check if it's used outside tutorial context. Looking at the code:
- Line 1532: `gameState._lastHintKey` is used in the normal game loop (not tutorial)
- So `_lastHintKey` must STAY in gameState. Only remove `tutorialPhase` and `_tutorialDone`.

**Step 2: Remove tutorial key handling (lines 783-813)**

In the `handleKey(e)` function, find and delete the entire tutorial key handling block:

```javascript
  // Tutorial mode key handling
  if (gameState.tutorialPhase > 0) {
    ... (everything through to)
    return;
  }
```

This is roughly lines 783-813. Everything from `// Tutorial mode key handling` to the `return;` before `// Escape toggles pause`.

**Step 3: Remove tutorial spawn/draw/hint block from game loop (lines 1434-1507)**

In the `loop()` function, find and delete the entire tutorial block:

```javascript
  // Check if tutorial should start (first play for this player)
  if (gameState.tutorialPhase === 0 && gameState.callbacks && ...
  ... (everything through to)
    return;
  }
```

This is roughly lines 1434-1507. Everything from `// Check if tutorial should start` through the `return;` before `if (!gameState.paused) {`.

**Step 4: Remove totalGamesPlayed from callbacks usage**

In `startGame()`, the pause button pulse still uses `callbacks.totalGamesPlayed === 0` (line 1669). This is FINE to keep — it's not tutorial-related, it's a first-play UX hint for the pause button.

**Step 5: Verify no remaining tutorial references**

Search play.js for `tutorialPhase`, `_tutorialDone`, `tutorial`. The only remaining reference should be none.

`_lastHintKey` should still exist in the normal gameplay hint code (lines 1529-1539) and in the gameState reset.

**Step 6: Commit**

```bash
git add js/play.js
git commit -m "remove: strip play tutorial from play.js

The game is intuitive — letters fall, press the key. Tutorial was
confusing on harder difficulties with fast-moving letters."
```

---

## Task 4: Remove learnProgress from storage.js

**Files:**
- Modify: `js/storage.js`

**Step 1: Remove learnProgress from createDefaultPlayer (lines 31-40)**

Remove the entire `learnProgress` object from the default player data:

```javascript
    learnProgress: {
      homeRow: homeRowStatus,
      leftRight: 'locked',
      topRow: 'locked',
      bottomRow: 'locked',
      combined: 'locked',
      spaceShift: 'locked',
    },
```

Also remove the `homeRowStatus` variable (line 28) since it's only used for learnProgress:
```javascript
  const homeRowStatus = ageBracket === '4-5' ? 'in_progress' : 'locked';
```

**Step 2: Remove/simplify updatePlayerBracket (lines 240-257)**

The `updatePlayerBracket` function resets learnProgress when changing brackets. Remove the learnProgress reset section (lines 247-255):

```javascript
  // Reset learn progress to the default for the new bracket
  const homeRowStatus = newBracket === '4-5' ? 'in_progress' : 'locked';
  player.learnProgress = {
    homeRow: homeRowStatus,
    leftRight: 'locked',
    topRow: 'locked',
    bottomRow: 'locked',
    combined: 'locked',
    spaceShift: 'locked',
  };
```

The function should just update the bracket and save:

```javascript
export function updatePlayerBracket(name, newBracket) {
  const player = getPlayer(name);
  if (!player) return;

  player.ageBracket = newBracket;
  savePlayer(name, player);
}
```

Note: existing players may still have `learnProgress` in their data. That's fine — it's just dead data that won't cause errors.

**Step 3: Commit**

```bash
git add js/storage.js
git commit -m "remove: strip learnProgress from storage defaults

Existing players keep their data harmlessly. No migration needed."
```

---

## Task 5: Remove learn-area from HTML and learn CSS

**Files:**
- Modify: `index.html:70-73` (remove learn-area div)
- Modify: `css/style.css` (remove learn-specific CSS)

**Step 1: Remove learn-area from index.html (lines 70-73)**

Delete these lines:
```html
    <!-- Learn mode area -->
    <div id="learn-area" class="learn-area" hidden>
      <!-- Learn mode UI injected by js/learn.js -->
    </div>
```

**Step 2: Remove learn CSS from style.css**

Remove the `.learn-area` reference from the combined rule (around line 405-406):

Change:
```css
.play-area, .learn-area {
```
to:
```css
.play-area {
```

And change:
```css
.play-area[hidden], .learn-area[hidden] { display: none; }
```
to:
```css
.play-area[hidden] { display: none; }
```

Then delete the entire Learn-specific CSS section (around lines 1718-2080). This includes:
- `.learn-area` styles
- `.learn-visible`
- `.learn-drill` and all children
- `.learn-prompt-text`, `.learn-nudge-text`
- `.learn-celebration-text`, `.learn-celebration-buttons`
- `.learn-prompt--young`
- `@keyframes learnCelebrate`
- Learn responsive styles
- Lesson card styles (`.lesson-card`, `.lesson-card--locked`, etc.)
- Learn progress bar styles

Search for lines starting with `.learn-` or containing `learn` in selectors and delete them all in that section.

**Step 3: Commit**

```bash
git add index.html css/style.css
git commit -m "remove: strip learn-area HTML and learn CSS

Removes ~360 lines of learn-specific CSS and the learn-area div."
```

---

## Task 6: Build, verify, and close issue

**Files:**
- Run: `build.sh`

**Step 1: Run the build**

```bash
bash build.sh
```

Expect: 4/4 sanity checks pass.

**Step 2: Verify**

Open `dist/typing-game.html` (or `docs/index.html`) in a browser:
- Create a new player
- Mode select shows Play button only (no Learn button)
- Click Play — game starts immediately with countdown (no tutorial)
- Keyboard highlights expected key during gameplay
- Complete a game — game over screen works

**Step 3: Commit build**

```bash
git add docs/index.html
git commit -m "build: regenerate docs/index.html without Learn mode"
```

---

## Task order

Tasks 1-5 have some dependencies:
- T1 (delete learn.js) should go first — later tasks modify files that import from it
- T2 (main.js) depends on T1 (import removal)
- T3 (play.js tutorial) is independent of T1/T2
- T4 (storage.js) is independent
- T5 (HTML/CSS) is independent
- T6 (build) must be last

**Recommended order:** T1 → T2 + T3 + T4 + T5 (parallel) → T6
