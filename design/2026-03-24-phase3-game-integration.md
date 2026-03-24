# Phase 3: Game Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate both games with the shared shell — strip standalone player/theme management from the type trainer, wire up the opposites game for player context and bracket-based difficulty, and persist game data.

**Architecture:** Games read player context from `window.KidsGames.player` and use `window.KidsGames.loadGameData()` / `saveGameData()` for persistence. The shared shell handles player selection, theme switching, and navigation. Games become pure gameplay with a `startGame(bracket, settings)` entry point.

**Depends on:** Phase 1 (tokens) and Phase 2 (shell) must be complete.

**Design doc:** `docs/plans/2026-03-24-shared-design-system-design.md`

**Personas for review:** T1 (Frontend Engineer), T3 (Educational Content), U2 (Older Child 8-10)

---

## Task 1: Opposites — Wire Up Player Context

**Files:**
- Modify: `games/opposites/index.html`

**Step 1: Read player context on game start**

At the top of the `<script>` block, before `startGame()` is called:

```javascript
// Read player context from shared shell
const playerCtx = window.KidsGames ? window.KidsGames.player : null;
const ageBracket = playerCtx ? playerCtx.ageBracket : '6-8';
```

**Step 2: Adjust game based on bracket**

Add bracket-based configuration at the top:

```javascript
const BRACKET_CONFIG = {
  '4-5': { wordCount: 15, distractorCount: 2, showHint: true },
  '6-8': { wordCount: 20, distractorCount: 3, showHint: true },
  '9-12': { wordCount: 30, distractorCount: 3, showHint: false },
  '13+': { wordCount: 40, distractorCount: 3, showHint: false },
};
const config = BRACKET_CONFIG[ageBracket] || BRACKET_CONFIG['6-8'];
```

- `wordCount`: How many word pairs per round (currently all 40)
- `distractorCount`: Number of wrong choices (currently hardcoded 3)
- `showHint`: Whether to show "Any correct opposite counts!" hint in type mode

**Step 3: Apply config in `startGame()`**

```javascript
function startGame() {
  shuffledPairs = shuffle(wordPairs).slice(0, config.wordCount);
  // ... rest unchanged
}
```

In `renderQuestion()`, use `config.distractorCount` instead of hardcoded `3`:
```javascript
const wrongOnes = shuffle(pair.distractors).slice(0, config.distractorCount);
const options = shuffle([correctOne, ...wrongOnes]);
```

For the hint:
```javascript
if (mode === 'type' && config.showHint) {
  html += `<div class="hint-text">Any correct opposite counts!</div>`;
}
```

**Acceptance criteria:**
- Game adapts word count and difficulty based on bracket
- Younger players get fewer words and more hints
- Older players get all 40 words, no hints
- Game still works without KidsGames (fallback to '6-8')

**Verification:** Set different brackets via browser console (`window.KidsGames.player` mock) and verify word count changes.

**Commit:**
```bash
git add games/opposites/index.html
git commit -m "feat: opposites reads player bracket for difficulty"
```

---

## Task 2: Opposites — Persist Game Data

**Files:**
- Modify: `games/opposites/index.html`

**Step 1: Load existing data on start**

```javascript
const savedData = window.KidsGames ? window.KidsGames.loadGameData('opposites') : {};
let lifetimeGames = savedData.gamesPlayed || 0;
let lifetimeBestStreak = savedData.bestStreak || 0;
let lifetimeBestScore = savedData.bestScore || 0;
```

**Step 2: Save after each game ends**

In `showEndScreen()`, add:

```javascript
lifetimeGames++;
if (bestStreak > lifetimeBestStreak) lifetimeBestStreak = bestStreak;
if (correctScore > lifetimeBestScore) lifetimeBestScore = correctScore;

if (window.KidsGames) {
  window.KidsGames.saveGameData('opposites', {
    gamesPlayed: lifetimeGames,
    bestStreak: lifetimeBestStreak,
    bestScore: lifetimeBestScore,
    lastPlayed: new Date().toISOString().slice(0, 10),
  });
}
```

**Step 3: Show lifetime stats on end screen**

Add to the end screen HTML:
```javascript
if (lifetimeGames > 1) {
  // Show personal best and total games
  card.innerHTML += `
    <div class="final-score" style="margin-top: 8px; opacity: 0.7;">
      Personal best: ${lifetimeBestScore} · Best streak: ${lifetimeBestStreak} · Games: ${lifetimeGames}
    </div>`;
}
```

**Acceptance criteria:**
- Game data saved to `kidsgames_opposites_<PlayerName>` in localStorage
- Personal bests and game count accumulate across sessions
- End screen shows lifetime stats after first game
- Works gracefully without KidsGames (no persistence, no crash)

**Verification:** Play two games, check localStorage for the data key, verify stats on end screen.

**Commit:**
```bash
git add games/opposites/index.html
git commit -m "feat: opposites persists game data per player"
```

---

## Task 3: Opposites — Remove Standalone Shell Elements

**Files:**
- Modify: `games/opposites/index.html`

**Step 1: Remove the back-link**

Delete the `<a href="index.html" class="back-link">` element from the HTML. The shell bar provides navigation.

**Step 2: Remove back-link CSS**

Delete the `.back-link` and `.back-link:hover` rules from the `<style>` block.

**Step 3: Add body padding for shell bar**

Add `body { padding-top: 56px; }` to account for the fixed shell bar.

**Step 4: Set page title data attribute**

Change `<body>` to `<body data-page="opposites" data-page-title="Opposites">` so the shell can set the page title.

**Acceptance criteria:**
- No standalone back link (shell provides it)
- Game content positioned below shell bar
- Shell bar visible and functional

**Verification:** Open in browser, verify shell bar at top, no duplicate navigation.

**Commit:**
```bash
git add games/opposites/index.html
git commit -m "refactor: opposites uses shell for navigation, remove standalone back link"
```

---

## Task 4: Type Trainer — Strip Player Select Screen

**Files:**
- Modify: `games/type-trainer/js/main.js`

This is the biggest change. The type trainer currently has a full player selection UI in `main.js` that needs to be replaced by the shell's player management.

**Step 1: Remove `showPlayerSelect()` function**

Delete the entire function and its helper functions:
- `showPlayerSelect()`
- `renderPlayerCard()` / player card rendering
- `showAddPlayerForm()`
- Player creation/deletion event handlers

**Step 2: Remove `showModeSelect()` function**

The mode select screen (bracket picker, speed preset) is also removed. The bracket comes from the shell's player profile. Speed preference can be stored in game-specific data.

Delete:
- `showModeSelect()`
- Bracket change handler
- Speed preset handler

**Step 3: Create `startFromShell()` entry point**

Replace the removed functions with a new entry point:

```javascript
function startFromShell() {
  const ctx = window.KidsGames ? window.KidsGames.player : null;
  if (!ctx) return; // shell hasn't initialised yet

  const bracket = ctx.ageBracket;
  const gameData = window.KidsGames ? window.KidsGames.loadGameData('typetrainer') : {};
  const speedPref = gameData.speedPreference || getDefaultSpeed(bracket);

  enterPlayMode(bracket, speedPref);
}

function getDefaultSpeed(bracket) {
  const defaults = { '4-5': 1.0, '6-8': 1.8, '9-12': 2.3, '13+': 3.0 };
  return defaults[bracket] || 1.8;
}
```

**Step 4: Hook into shell player change**

```javascript
if (window.KidsGames) {
  window.KidsGames.onPlayerChange(() => {
    if (gameState && gameState.active) cleanupPlay();
    startFromShell();
  });
}
```

**Step 5: Update `enterPlayMode()` to accept parameters and rebuild callbacks**

The existing `enterPlayMode()` reads from `currentPlayer` and passes a callbacks object to `startPlayGame()`. Refactor it to accept bracket and speed as arguments, and rebuild the full callbacks object using `window.KidsGames`:

```javascript
function enterPlayMode(bracket, speed) {
  const stages = getStagesForBracket(bracket);
  const gameData = window.KidsGames ? window.KidsGames.loadGameData('typetrainer') : {};

  startPlayGame(bracket, stages, {
    onQuit: () => { window.location.href = 'index.html'; },  // Navigate back to hub
    getPlayerName: () => window.KidsGames?.player?.name || 'Player',
    onGameOver: (stats) => {
      // Save updated stats to game data
      if (window.KidsGames) {
        const existing = window.KidsGames.loadGameData('typetrainer');
        window.KidsGames.saveGameData('typetrainer', {
          ...existing,
          highScore: Math.max(existing.highScore || 0, stats.score),
          highestStage: Math.max(existing.highestStage || 0, stats.stage),
          totalGamesPlayed: (existing.totalGamesPlayed || 0) + 1,
          stats: { ...existing.stats, ...stats },
        });
      }
    },
    onSpeedChange: (newSpeed) => {
      if (window.KidsGames) {
        const existing = window.KidsGames.loadGameData('typetrainer');
        window.KidsGames.saveGameData('typetrainer', { ...existing, speedPreference: newSpeed });
      }
    },
    previousHighScore: gameData.highScore || 0,
    totalGamesPlayed: gameData.totalGamesPlayed || 0,
    speedPreference: speed,
  });
}
```

**Step 5b: Add a speed/difficulty picker to the HUD**

Since the mode select screen is removed, add a compact difficulty control. Add a dropdown or cycle button to the HUD bar that lets the player change speed mid-session:

In `games/type-trainer/index.html`, add to the HUD after the streak item:
```html
<button id="speed-btn" class="hud-btn" aria-label="Change difficulty" title="Difficulty">
  <span class="hud-btn__icon">⚡</span>
  <span class="hud-btn__label" id="speed-label">Normal</span>
</button>
```

In the JS, add a cycle handler:
```javascript
const SPEEDS = [
  { label: 'Easy', value: 1.0 },
  { label: 'Normal', value: 1.8 },
  { label: 'Hard', value: 2.3 },
  { label: 'Extra Hard', value: 3.0 },
];

document.getElementById('speed-btn').addEventListener('click', () => {
  const currentIdx = SPEEDS.findIndex(s => s.value === currentSpeed);
  const next = SPEEDS[(currentIdx + 1) % SPEEDS.length];
  currentSpeed = next.value;
  document.getElementById('speed-label').textContent = next.label;
  // Notify game engine and persist
  callbacks.onSpeedChange(next.value);
});
```

This preserves the child's ability to control difficulty without needing a separate mode select screen.

**Step 6: Remove overlay container rendering for player/mode select and clean up globals**

The overlay div is no longer used for player/mode select (shell handles this). It's still used for pause and game-over screens. Remove the playerSelect and modeSelect state values from the state machine. Remove the `appState` variable or simplify to just `'play'`.

Also remove `window._main = { showPlayerSelect, showModeSelect, getCurrentPlayer }` — these functions no longer exist. If needed, expose a minimal API: `window._main = { getCurrentPlayer: () => window.KidsGames?.player }`.

Remove the `currentPlayer` module-level variable — use `window.KidsGames.player` as the single source of truth.

**Acceptance criteria:**
- No player select or mode select screens in type trainer
- Game starts automatically when shell provides player context
- Bracket and speed come from shell player profile / game data
- Pause and game-over overlays still work
- Player change callback restarts the game cleanly

**Verification:** Open type-trainer, verify it starts gameplay directly (shell handles player selection). Pause/resume works. Game-over screen works.

**Commit:**
```bash
git add games/type-trainer/js/main.js
git commit -m "refactor: type trainer uses shell for player/mode selection"
```

---

## Task 5: Type Trainer — Strip Theme Toggle

**Files:**
- Modify: `games/type-trainer/js/main.js`
- Modify: `games/type-trainer/index.html`
- Modify: `games/type-trainer/css/style.css`

**Step 1: Remove theme toggle functions from main.js**

Delete:
- `setTheme()` function
- `toggleTheme()` function
- `updateThemeToggleIcons()` function
- Theme-related event listeners
- `localStorage.getItem('typingGame_theme')` code
- The migration shim from Phase 1 (shell now handles themes)

**Step 2: Remove theme toggle buttons from HTML**

In `games/type-trainer/index.html`, remove:
- `<button id="global-theme-toggle">` element
- `<button id="theme-toggle">` in the HUD

**Step 3: Remove the "Back to Games" link from HUD**

The shell bar provides navigation. Remove the `<a class="hud-btn hud-home-link">` added in the restructure.

**Step 4: Remove related CSS**

Delete `.global-theme-toggle`, `.hud-home-link` styles from `style.css`.

**Step 5: Add body padding for shell bar**

Add `body { padding-top: 56px; }` if not already present.

**Step 6: Set page data attribute**

`<body data-page="type-trainer" data-page-title="Type Trainer">`

**Acceptance criteria:**
- No theme toggle in type trainer (shell provides it)
- No "Back to Games" link (shell provides it)
- No global theme toggle button
- HUD still shows: score, stage, lives, streak, keyboard toggle, mute, pause
- Shell bar visible above the game

**Verification:** Open type-trainer, verify shell bar has theme picker, no duplicate toggles.

**Commit:**
```bash
git add games/type-trainer/js/main.js games/type-trainer/index.html games/type-trainer/css/style.css
git commit -m "refactor: type trainer uses shell for theme and navigation"
```

---

## Task 6: Type Trainer — Migrate localStorage Data

**Files:**
- Modify: `shared/shell.js` ← migration function lives here, inside the IIFE, where storage API functions are in scope

**⚠️ Scope note:** `migrateTypeTrainerData()` and `bracketToAge()` must be defined inside `shared/shell.js` within the existing IIFE — NOT in `main.js`. The storage functions (`getPlayer`, `createPlayer`, `_write`, etc.) are scoped to the shell IIFE. Placing the migration in `main.js` would cause `ReferenceError` at runtime because those functions are not globally exposed.

Existing type trainer data is stored under the keys: `players`, `currentPlayer`, `typingGame_theme`, `typingGame_lastPlayer`. This needs to be migrated to the new namespaced format on first load.

**Step 1: Add migration function**

```javascript
function migrateTypeTrainerData() {
  // Only run once
  if (localStorage.getItem('kidsgames_migrated_typetrainer')) return;

  let oldPlayers;
  try {
    oldPlayers = JSON.parse(localStorage.getItem('players') || 'null');
  } catch (e) {
    console.error('KidsGames: corrupt old player data, skipping migration', e);
    localStorage.setItem('kidsgames_migrated_typetrainer', 'true');
    return;
  }

  if (!oldPlayers || !oldPlayers.players) {
    localStorage.setItem('kidsgames_migrated_typetrainer', 'true');
    return;
  }

  // Migrate each player profile using shared storage API (from shared/storage.js)
  Object.entries(oldPlayers.players).forEach(([name, data]) => {
    // Create hub-level player if doesn't exist
    if (!getPlayer(name)) {
      const theme = data.settings?.theme || 'clean-light';
      // Handle both original values AND Phase 1 migrated values
      const themeMap = { 'light': 'clean-light', 'dark': 'clean-dark', 'clean-light': 'clean-light', 'clean-dark': 'clean-dark', 'colourful-light': 'colourful-light', 'colourful-dark': 'colourful-dark' };
      createPlayer(name, {
        dob: null,
        manualAge: bracketToAge(data.ageBracket)
      });
      savePlayer(name, { theme: themeMap[theme] || theme });
    }

    // Migrate game-specific data
    // Note: saveGameData uses the shared/storage.js namespace (kidsgames_typetrainer_<name>)
    const key = 'kidsgames_typetrainer_' + name;
    _write(key, {
      highScore: data.highScore || 0,
      highestStage: data.highestStage || 0,
      totalGamesPlayed: data.totalGamesPlayed || 0,
      stats: data.stats || {},
      speedPreference: data.settings?.speedPreference || 1.8,
    });
  });

  // Set active player from old data
  const lastPlayer = localStorage.getItem('typingGame_lastPlayer');
  if (lastPlayer && getPlayer(lastPlayer)) {
    setActivePlayer(lastPlayer);
  }

  // Verify new data exists before deleting old keys
  const newPlayers = getAllPlayers();
  if (Object.keys(newPlayers).length > 0) {
    localStorage.removeItem('players');
    localStorage.removeItem('currentPlayer');
    localStorage.removeItem('typingGame_theme');
    localStorage.removeItem('typingGame_lastPlayer');
  } else {
    console.error('KidsGames: migration wrote no players — keeping old keys as backup');
  }
  localStorage.setItem('kidsgames_migrated_typetrainer', 'true');
}

function bracketToAge(bracket) {
  const map = { '4-5': 5, '6-8': 7, '9-12': 10, 'Adult': 18 };
  return map[bracket] || 7;
}
```

**Step 2: Call migration only on type-trainer page**

Add `migrateTypeTrainerData()` call in `initShell()` in `shared/shell.js`, scoped to the type-trainer page to avoid deleting generic localStorage keys that might belong to other apps on the same origin:

```javascript
// Only run migration on the type-trainer page (where old data originated)
if (document.body.dataset.page === 'type-trainer') {
  migrateTypeTrainerData();
}
```

This is called before checking for active player.

**Acceptance criteria:**
- Existing players migrated to new namespaced format
- Game stats preserved in `kidsgames_typetrainer_<name>`
- Player profiles created in `kidsgames_players`
- Old keys cleaned up
- Migration runs once (flag prevents re-running)
- New users unaffected (no old data = no migration)

**Verification:** Set up old-format localStorage data manually, reload, verify migration happened and old keys removed.

**Commit:**
```bash
git add shared/shell.js
git commit -m "feat: migrate existing type trainer localStorage to new format"
```

---

## Task 7: Type Trainer — Remove Mobile Gate

**Files:**
- Modify: `games/type-trainer/index.html`
- Modify: `games/type-trainer/js/main.js`

The mobile gate (keyboard detection) can move to the hub's device badge system. The type trainer card already shows "Needs a keyboard" badge.

**Step 1: Remove mobile gate HTML**

Delete the `<div id="mobile-gate">` block from `index.html`.

**Step 2: Remove mobile gate JS**

Remove the keyboard detection and mobile gate logic from `main.js`.

**Step 3: Add a simple keyboard check at game start**

Instead of blocking the entire page, show a brief message if no keyboard is detected:

```javascript
function checkKeyboard() {
  if ('ontouchstart' in window && !matchMedia('(pointer: fine)').matches) {
    // Show a dismissible warning, not a blocker
    const warn = document.createElement('div');
    warn.className = 'keyboard-warning';
    warn.innerHTML = '<p>This game works best with a keyboard! 🎹</p>';
    document.getElementById('game-wrapper').prepend(warn);
  }
}
```

**Acceptance criteria:**
- No full-screen mobile gate
- Soft warning for touch-only devices (non-blocking)
- Game still technically playable (on-screen keyboard exists)

**Verification:** Test on mobile emulator — should see warning, not a blocker.

**Commit:**
```bash
git add games/type-trainer/index.html games/type-trainer/js/main.js
git commit -m "refactor: replace mobile gate with soft keyboard warning"
```

---

## Task 8: Build and Test Everything

**Step 1: Run the build**

```bash
bash build.sh
```

**Step 2: Full flow test**

1. Open `docs/index.html` in incognito
2. Create a player (name + age)
3. Play opposites — verify bracket difficulty, score persistence
4. Return to hub via Games dropdown
5. Play type trainer — verify it starts directly, bracket-appropriate difficulty
6. Switch themes — verify both games respect it
7. Create second player, switch, verify independent data
8. Check localStorage for proper namespacing

**Step 3: Verify type trainer migration**

1. In a separate browser profile, set up old-format type trainer data
2. Open the new build — verify migration happens
3. Verify old keys cleaned up

**Step 4: Commit built files**

```bash
git add docs/
git commit -m "build: regenerate docs/ with full game integration"
```

---

## Review Gate

After Task 8, review with **T1**, **T3**, **U2** against the git diff:

- T1: Clean JS? Event listener cleanup? No memory leaks? No global pollution?
- T3: Does bracket difficulty feel right? Age-appropriate word counts? Smooth progression?
- U2: Does an 8-year-old have a good experience? Enough challenge? Can self-serve?

---

## Task Dependencies

```
Task 1 (opposites bracket) ─┐
Task 2 (opposites persist) ──┤→ Task 3 (opposites cleanup)
                              ↓
Task 4 (TT strip player) ───┐
Task 5 (TT strip theme) ────┤→ Task 6 (TT migration) → Task 7 (TT mobile gate)
                              ↓
                    Task 8 (build + test)
```

- Tasks 1-2 are sequential (bracket config affects persistence context)
- Task 3 depends on 1-2
- Tasks 4-5 are independent and can run in parallel
- Task 6 depends on 4-5 (needs clean storage setup)
- Task 7 is independent of 6
- Task 8 depends on everything
