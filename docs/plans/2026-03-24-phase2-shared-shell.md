# Phase 2: Shared Shell — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a persistent navigation shell (top bar) with player profiles, theme picker, games dropdown, and volume control — shared across all pages.

**Architecture:** Shell markup/CSS/JS lives in `shared/`. Build script injects it into every output HTML. Games interact with the shell via `window.KidsGames` API. Player data stored in localStorage with namespaced keys.

**Tech Stack:** Vanilla HTML/CSS/JS, CSS custom properties from Phase 1 tokens

**Depends on:** Phase 1 (shared design tokens) must be complete.

**Design doc:** `docs/plans/2026-03-24-shared-design-system-design.md`

**Personas for review:** T1 (Frontend Engineer), T2 (Accessibility & Device), U3 (Parent Setting Up)

---

## Task 1: Create KidsGames Storage API (`shared/storage.js`)

**Files:**
- Create: `shared/storage.js`

The storage API manages player profiles and game-specific data with namespaced localStorage keys.

**Key prefix:** `kidsgames_`

**Implementation:**

```javascript
// shared/storage.js — Player profiles and namespaced game data

const STORAGE_PREFIX = 'kidsgames_';
const PLAYERS_KEY = STORAGE_PREFIX + 'players';
const ACTIVE_KEY = STORAGE_PREFIX + 'activePlayer';

function _read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch (e) {
    console.error('KidsGames: corrupt data for key', key, e);
    return null;
  }
}

function _write(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  } catch (e) {
    console.error('KidsGames: storage write failed', key, e);
    return false;
  }
}

// Sanitise player names: alphanumeric + spaces/hyphens/apostrophes, max 20 chars
function sanitiseName(name) {
  return name.replace(/[^\p{L}\p{N} '\-]/gu, '').trim().slice(0, 20);
}

// Escape HTML to prevent injection when inserting into innerHTML
function escapeHtml(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

function getAllPlayers() {
  return _read(PLAYERS_KEY) || {};
}

function getPlayer(name) {
  const players = getAllPlayers();
  return players[name] || null;
}

function createPlayer(name, { dob, manualAge }) {
  name = sanitiseName(name);
  if (!name) return false;
  const players = getAllPlayers();
  if (players[name]) return false; // already exists
  players[name] = {
    name: name,
    dob: dob || null,
    manualAge: dob ? null : (manualAge || null),
    theme: getDefaultTheme(dob, manualAge),
    createdAt: new Date().toISOString().slice(0, 10)
  };
  _write(PLAYERS_KEY, players);
  return true;
}

function savePlayer(name, data) {
  const players = getAllPlayers();
  players[name] = { ...players[name], ...data };
  _write(PLAYERS_KEY, players);
}

function deletePlayer(name) {
  const players = getAllPlayers();
  delete players[name];
  _write(PLAYERS_KEY, players);
  // Clean up game-specific data — match exact suffix pattern: prefix + gameId + '_' + exactName
  const suffix = '_' + name;
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith(STORAGE_PREFIX) && k.endsWith(suffix) && k !== PLAYERS_KEY && k !== ACTIVE_KEY) {
      localStorage.removeItem(k);
    }
  });
}

function getActivePlayer() {
  const name = _read(ACTIVE_KEY);
  return name ? getPlayer(name) : null;
}

function setActivePlayer(name) {
  _write(ACTIVE_KEY, name);
}

function getAgeBracket(player) {
  const age = getAge(player);
  if (age === null) return '6-8'; // fallback
  if (age <= 5) return '4-5';
  if (age <= 8) return '6-8';
  if (age <= 12) return '9-12';
  return '13+';
}

function getAge(player) {
  if (player.dob) {
    const today = new Date();
    const birth = new Date(player.dob);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }
  return player.manualAge || null;
}

function getDefaultTheme(dob, manualAge) {
  const age = dob
    ? Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000)
    : manualAge;
  if (age !== null && age <= 8) return 'colourful-light';
  return 'clean-light';
}

// Game-specific data
function loadGameData(gameId) {
  const player = getActivePlayer();
  if (!player) return {};
  return _read(STORAGE_PREFIX + gameId + '_' + player.name) || {};
}

function saveGameData(gameId, data) {
  const player = getActivePlayer();
  if (!player) return;
  _write(STORAGE_PREFIX + gameId + '_' + player.name, data);
}
```

**Acceptance criteria:**
- All functions work with localStorage
- Player CRUD operations complete
- Game data properly namespaced per player
- Age bracket derivation correct for DoB and manual age
- Default theme based on age

**Verification:** Test manually in browser console — create player, get active, save game data, verify keys in localStorage Application tab.

**Commit:**
```bash
git add shared/storage.js
git commit -m "feat: add KidsGames storage API with player profiles"
```

---

## Task 2: Create Shell Bar Markup (`shared/shell.html`)

**Files:**
- Create: `shared/shell.html`

This is an HTML fragment (no `<html>`/`<body>`) injected at the top of `<body>` by the build script.

```html
<!-- Kids Games Shell Bar -->
<div id="kg-shell" class="kg-shell" role="banner">
  <!-- Games dropdown -->
  <div class="kg-shell__games-wrap">
    <button id="kg-games-btn" class="kg-shell__btn kg-shell__games-btn" aria-expanded="false" aria-controls="kg-games-dropdown">
      <span class="kg-shell__icon" aria-hidden="true">🎮</span>
      <span class="kg-shell__label">Games</span>
    </button>
    <div id="kg-games-dropdown" class="kg-games-dropdown" hidden>
      <!-- Populated by shell.js -->
    </div>
  </div>

  <!-- Page title -->
  <span id="kg-page-title" class="kg-shell__title">Kids Games</span>

  <!-- Spacer -->
  <span class="kg-shell__spacer"></span>

  <!-- Player -->
  <button id="kg-player-btn" class="kg-shell__btn kg-shell__player-btn" aria-label="Switch player">
    <span id="kg-player-avatar" class="kg-shell__avatar">?</span>
    <span id="kg-player-name" class="kg-shell__label">Guest</span>
  </button>

  <!-- Theme picker -->
  <button id="kg-theme-btn" class="kg-shell__btn" aria-label="Change theme" aria-expanded="false" aria-controls="kg-theme-dropdown" title="Theme">
    <span id="kg-theme-icon" class="kg-shell__icon" aria-hidden="true">🎨</span>
  </button>

  <!-- Volume -->
  <button id="kg-volume-btn" class="kg-shell__btn" aria-label="Toggle sound" aria-pressed="false" title="Sound">
    <span id="kg-volume-icon" class="kg-shell__icon" aria-hidden="true">🔊</span>
  </button>
</div>

<!-- Player select overlay -->
<div id="kg-player-overlay" class="kg-overlay" hidden>
  <div class="kg-overlay__content kg-player-select" role="dialog" aria-labelledby="kg-player-heading">
    <h2 id="kg-player-heading" class="kg-overlay__heading">Who's playing?</h2>
    <div id="kg-player-grid" class="kg-player-grid">
      <!-- Player cards + "Add player" card populated by shell.js -->
    </div>
  </div>
</div>

<!-- Add player overlay -->
<div id="kg-addplayer-overlay" class="kg-overlay" hidden>
  <div class="kg-overlay__content kg-addplayer-form" role="dialog" aria-labelledby="kg-addplayer-heading">
    <h2 id="kg-addplayer-heading" class="kg-overlay__heading">New Player</h2>
    <form id="kg-addplayer-form">
      <label class="kg-form-label" for="kg-name-input">Name</label>
      <input id="kg-name-input" class="kg-form-input" type="text" maxlength="20" autocomplete="off" placeholder="Your name" required>

      <fieldset class="kg-form-fieldset">
        <legend class="kg-form-label">How old are you? (optional)</legend>
        <div class="kg-age-toggle" role="tablist">
          <button type="button" class="kg-age-tab active" data-mode="dob" role="tab" aria-selected="true">Date of birth</button>
          <button type="button" class="kg-age-tab" data-mode="age" role="tab" aria-selected="false">Age number</button>
        </div>

        <div id="kg-dob-field" class="kg-form-field" role="tabpanel">
          <label class="kg-form-label" for="kg-dob-input">Date of birth</label>
          <input id="kg-dob-input" class="kg-form-input" type="date">
        </div>

        <div id="kg-age-field" class="kg-form-field" role="tabpanel" hidden>
          <label class="kg-form-label" for="kg-age-input">Age</label>
          <input id="kg-age-input" class="kg-form-input" type="number" min="3" max="99">
        </div>
      </fieldset>

      <div class="kg-form-actions">
        <button type="submit" class="kg-btn kg-btn--primary" id="kg-addplayer-submit" disabled>Let's go!</button>
        <button type="button" class="kg-btn kg-btn--secondary" id="kg-addplayer-cancel">Back</button>
      </div>
    </form>
  </div>
</div>

<!-- Theme picker dropdown -->
<div id="kg-theme-dropdown" class="kg-theme-dropdown" hidden>
  <button class="kg-theme-option" data-theme="colourful-light">
    <span class="kg-theme-swatch kg-theme-swatch--colourful-light"></span>
    Colourful Light
  </button>
  <button class="kg-theme-option" data-theme="colourful-dark">
    <span class="kg-theme-swatch kg-theme-swatch--colourful-dark"></span>
    Colourful Dark
  </button>
  <button class="kg-theme-option" data-theme="clean-light">
    <span class="kg-theme-swatch kg-theme-swatch--clean-light"></span>
    Clean Light
  </button>
  <button class="kg-theme-option" data-theme="clean-dark">
    <span class="kg-theme-swatch kg-theme-swatch--clean-dark"></span>
    Clean Dark
  </button>
</div>
```

**Acceptance criteria:**
- All interactive elements have aria labels
- Overlays use `role="dialog"` with labelledby
- Buttons have visible text + icon (for pre-readers)
- Games dropdown is an aria-expanded toggle
- Form inputs have labels

**Verification:** HTML validation — no unclosed tags, all IDs unique.

**Commit:**
```bash
git add shared/shell.html
git commit -m "feat: add shell bar HTML markup"
```

---

## Task 3: Create Shell Bar Styles (`shared/shell.css`)

**Files:**
- Create: `shared/shell.css`

All styles use `kg-` prefix to avoid conflicts with game CSS. Uses shared design tokens from `tokens.css`.

**Key styling decisions:**
- Bar height: 48px, fixed top
- All pages get `padding-top: 56px` on body (48px bar + 8px gap)
- Touch targets: minimum 44px (48px preferred)
- Uses `var(--hud-bg)`, `var(--hud-text)`, `var(--hud-accent)` from tokens
- Overlays use `var(--bg-overlay)` backdrop
- Player cards in grid layout matching hub card style

**Implementation:** Complete CSS file using only shared token references (`var(--*)`) for colours, spacing, radii. No hardcoded colour values.

Game-specific note: games set `body { padding-top: 56px; }` to account for the shell bar. The hub page also needs this.

**Acceptance criteria:**
- All colours reference shared tokens
- Touch targets ≥ 44px on all interactive elements
- Responsive: bar works on mobile (320px+)
- Overlays are full-screen with centered content
- Player cards are tappable grid items
- Theme swatches show a preview colour for each theme
- `kg-` prefix on all class names

**Verification:** Open in browser, verify bar renders at top, dropdowns toggle, overlays appear.

**Commit:**
```bash
git add shared/shell.css
git commit -m "feat: add shell bar CSS styles"
```

---

## Task 4: Create Shell Logic — Core (`shared/shell.js`)

**Files:**
- Create: `shared/shell.js`

The shell JS handles: initialisation, player selection flow, theme switching, games dropdown, volume, and exposes `window.KidsGames` API.

**Part 1: Initialisation and KidsGames API**

```javascript
// shared/shell.js — Shell bar logic

(function() {
  'use strict';

  // --- Expose public API ---
  const _playerChangeListeners = [];

  window.KidsGames = {
    get player() {
      const p = getActivePlayer();
      if (!p) return null;
      return { name: p.name, ageBracket: getAgeBracket(p), theme: p.theme };
    },
    get muted() { return muted; },
    loadGameData: loadGameData,
    saveGameData: saveGameData,
    onPlayerChange(fn) { _playerChangeListeners.push(fn); },
  };

  function _notifyPlayerChange() {
    const ctx = window.KidsGames.player;
    _playerChangeListeners.forEach(fn => { try { fn(ctx); } catch(e) { console.error(e); } });
  }

  // (storage functions from shared/storage.js are concatenated above this in build)
```

**Part 2: Player selection flow**

```javascript
  function initShell() {
    renderGamesDropdown();

    // Set page title from data attribute
    const pageTitle = document.body.dataset.pageTitle;
    if (pageTitle) {
      document.getElementById('kg-page-title').textContent = pageTitle;
    }

    // Hide games dropdown button on the hub (hub IS the games list)
    if (document.body.dataset.page === 'hub') {
      document.getElementById('kg-games-btn').hidden = true;
    }

    const activePlayer = getActivePlayer();
    if (!activePlayer) {
      showPlayerSelect();
    } else {
      applyPlayer(activePlayer);
    }
    bindEvents();
  }

  function showPlayerSelect() {
    const overlay = document.getElementById('kg-player-overlay');
    const grid = document.getElementById('kg-player-grid');
    const players = getAllPlayers();

    let html = '';
    Object.values(players).forEach(p => {
      const safeName = escapeHtml(p.name);
      const initial = p.name.charAt(0).toUpperCase();
      const bracket = getAgeBracket(p);
      html += `
        <button class="kg-player-card" data-player="${safeName}">
          <span class="kg-player-card__avatar">${escapeHtml(initial)}</span>
          <span class="kg-player-card__name">${safeName}</span>
          <span class="kg-player-card__bracket">${bracket}</span>
        </button>`;
    });
    html += `
      <button class="kg-player-card kg-player-card--add" id="kg-add-player-btn" aria-label="Add new player">
        <span class="kg-player-card__avatar">+</span>
        <span class="kg-player-card__name">New Player</span>
      </button>`;

    grid.innerHTML = html;
    overlay.hidden = false;
  }

  function applyPlayer(player) {
    setActivePlayer(player.name);
    document.getElementById('kg-player-avatar').textContent = player.name.charAt(0).toUpperCase();
    document.getElementById('kg-player-name').textContent = player.name;
    document.documentElement.setAttribute('data-theme', player.theme);
    document.getElementById('kg-player-overlay').hidden = true;
    _notifyPlayerChange();
  }
```

**Part 3: Theme picker**

```javascript
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const player = getActivePlayer();
    if (player) {
      savePlayer(player.name, { theme });
    }
  }

  function toggleThemeDropdown() {
    const dd = document.getElementById('kg-theme-dropdown');
    dd.hidden = !dd.hidden;
    // Highlight current theme
    const current = document.documentElement.getAttribute('data-theme');
    dd.querySelectorAll('.kg-theme-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === current);
    });
  }
```

**Part 4: Games dropdown**

```javascript
  // Games list — maintained in shell.js, update when adding games
  const GAMES = [
    { id: 'type-trainer', title: 'Type Trainer', icon: '⌨️', url: 'type-trainer.html', needsKeyboard: true },
    { id: 'opposites', title: 'Opposites', icon: '🔄', url: 'opposites.html', needsKeyboard: false },
  ];

  function renderGamesDropdown() {
    const dd = document.getElementById('kg-games-dropdown');
    dd.innerHTML = GAMES.map(g => `
      <a href="${g.url}" class="kg-game-link${g.needsKeyboard ? ' kg-needs-keyboard' : ''}">
        <span class="kg-game-link__icon">${g.icon}</span>
        <span class="kg-game-link__title">${g.title}</span>
      </a>
    `).join('');
  }
```

**Part 5: Volume control**

```javascript
  let muted = false;

  function toggleMute() {
    muted = !muted;
    document.getElementById('kg-volume-icon').textContent = muted ? '🔇' : '🔊';
    document.getElementById('kg-volume-btn').setAttribute('aria-pressed', muted);
    // Games read muted state via: window.KidsGames.muted (getter reads closure var)
  }
```

**Part 6: Event binding**

```javascript
  function bindEvents() {
    // Games dropdown
    document.getElementById('kg-games-btn').addEventListener('click', () => {
      const dd = document.getElementById('kg-games-dropdown');
      const btn = document.getElementById('kg-games-btn');
      dd.hidden = !dd.hidden;
      btn.setAttribute('aria-expanded', !dd.hidden);
    });

    // Player button
    document.getElementById('kg-player-btn').addEventListener('click', showPlayerSelect);

    // Player card selection (delegated)
    document.getElementById('kg-player-grid').addEventListener('click', (e) => {
      const card = e.target.closest('.kg-player-card');
      if (!card) return;
      if (card.id === 'kg-add-player-btn') {
        document.getElementById('kg-player-overlay').hidden = true;
        document.getElementById('kg-addplayer-overlay').hidden = false;
        document.getElementById('kg-name-input').focus();
        return;
      }
      const name = card.dataset.player;
      const player = getPlayer(name);
      if (player) applyPlayer(player);
    });

    // Add player form
    document.getElementById('kg-addplayer-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('kg-name-input').value.trim();
      const dobInput = document.getElementById('kg-dob-input');
      const ageInput = document.getElementById('kg-age-input');
      const dob = dobInput.value || null;
      const manualAge = ageInput.value ? parseInt(ageInput.value) : null;

      if (!name) return;
      if (createPlayer(name, { dob, manualAge })) {
        const player = getPlayer(name);
        document.getElementById('kg-addplayer-overlay').hidden = true;
        applyPlayer(player);
      }
    });

    // Add player cancel
    document.getElementById('kg-addplayer-cancel').addEventListener('click', () => {
      document.getElementById('kg-addplayer-overlay').hidden = true;
      showPlayerSelect();
    });

    // Age toggle (dob vs manual)
    document.querySelectorAll('.kg-age-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.kg-age-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.mode;
        document.getElementById('kg-dob-field').hidden = mode !== 'dob';
        document.getElementById('kg-age-field').hidden = mode !== 'age';
      });
    });

    // Enable submit when name is entered
    document.getElementById('kg-name-input').addEventListener('input', (e) => {
      document.getElementById('kg-addplayer-submit').disabled = !e.target.value.trim();
    });

    // Theme picker
    document.getElementById('kg-theme-btn').addEventListener('click', toggleThemeDropdown);
    document.getElementById('kg-theme-dropdown').addEventListener('click', (e) => {
      const option = e.target.closest('.kg-theme-option');
      if (!option) return;
      setTheme(option.dataset.theme);
      document.getElementById('kg-theme-dropdown').hidden = true;
    });

    // Volume
    document.getElementById('kg-volume-btn').addEventListener('click', toggleMute);

    // Focus trapping for overlays
    document.addEventListener('keydown', (e) => {
      // Escape closes overlays and dropdowns
      if (e.key === 'Escape') {
        const playerOverlay = document.getElementById('kg-player-overlay');
        const addOverlay = document.getElementById('kg-addplayer-overlay');
        const gamesDD = document.getElementById('kg-games-dropdown');
        const themeDD = document.getElementById('kg-theme-dropdown');

        if (!themeDD.hidden) { themeDD.hidden = true; return; }
        if (!gamesDD.hidden) { gamesDD.hidden = true; return; }
        if (!addOverlay.hidden) { addOverlay.hidden = true; showPlayerSelect(); return; }
        // Player overlay: only close if there's an active player (can't dismiss on first visit)
        if (!playerOverlay.hidden && getActivePlayer()) { playerOverlay.hidden = true; return; }
      }

      // Tab focus trapping inside open overlays
      if (e.key === 'Tab') {
        const openOverlay = document.querySelector('.kg-overlay:not([hidden])');
        if (!openOverlay) return;
        const focusable = openOverlay.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    });

    // Lock body scroll when overlay is open
    const observer = new MutationObserver(() => {
      const anyOpen = document.querySelector('.kg-overlay:not([hidden])');
      document.body.style.overflow = anyOpen ? 'hidden' : '';
    });
    document.querySelectorAll('.kg-overlay').forEach(o => {
      observer.observe(o, { attributes: true, attributeFilter: ['hidden'] });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.kg-shell__games-wrap')) {
        document.getElementById('kg-games-dropdown').hidden = true;
        document.getElementById('kg-games-btn').setAttribute('aria-expanded', 'false');
      }
      if (!e.target.closest('#kg-theme-btn') && !e.target.closest('.kg-theme-dropdown')) {
        document.getElementById('kg-theme-dropdown').hidden = true;
      }
    });
  }

  // --- Init on DOM ready ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShell);
  } else {
    initShell();
  }
})();
```

**Acceptance criteria:**
- `window.KidsGames` API exposed with player, loadGameData, saveGameData, muted, onPlayerChange
- First visit shows "Who's playing?" overlay
- Return visit auto-selects last active player
- Player creation with DoB or manual age works
- Theme picker changes `data-theme` attribute and saves to player profile
- Games dropdown lists all games with icons
- Volume toggle updates aria-pressed
- Outside clicks close dropdowns
- No global variable pollution (IIFE wrapped)

**Verification:** Open in browser, create a player, switch themes, verify localStorage keys.

**Commit:**
```bash
git add shared/shell.js
git commit -m "feat: add shell logic — player management, themes, games dropdown"
```

---

## Task 5: Update Build Script for Shell Injection

**Files:**
- Modify: `build.sh`

**Step 1: Add preflight checks for shared/ files**

```bash
for f in "shared/tokens.css" "shared/shell.html" "shared/shell.css" "shared/shell.js" "shared/storage.js"; do
  if [ ! -f "$f" ]; then
    echo "Error: $f not found." >&2
    exit 1
  fi
done
```

**Step 2: Create a combined shell JS file**

Concatenate storage + shell JS inside a single IIFE wrapper:
```bash
SHELL_JS_TEMP=$(mktemp)
echo "(function() { 'use strict';" > "$SHELL_JS_TEMP"
cat shared/storage.js >> "$SHELL_JS_TEMP"
# Strip the IIFE open/close from shell.js since we're wrapping both together
sed -e "s/^(function() {$//" -e "s/^  'use strict';$//" -e "s/^})();$//" shared/shell.js >> "$SHELL_JS_TEMP"
echo "})();" >> "$SHELL_JS_TEMP"
```

This ensures storage functions (`_read`, `_write`, `sanitiseName`, etc.) are scoped inside the IIFE — no global pollution.

Update the trap to include ALL temp files (composing with Phase 1's trap):
```bash
trap "rm -f '$JS_TEMP' '$CSS_TEMP' '$SHELL_JS_TEMP'" EXIT
```

**Step 3: Update type trainer build**

The type trainer awk pipeline now needs to:
1. Inject `shared/tokens.css` + `shared/shell.css` + game CSS → `<style>`
2. Inject `shared/shell.js` + `shared/storage.js` before game JS → `<script>`
3. Inject `shared/shell.html` after opening `<body>` tag
4. Strip dev-mode `<link>` tags to shared/

Update CSS temp concatenation:
```bash
cat shared/tokens.css shared/shell.css "$GAME_DIR/css/style.css" > "$CSS_TEMP"
```

Add shell HTML injection rule to awk:
```awk
/<body/ {
  print
  # Inject shell HTML
  while ((getline line < shell_file) > 0) { print line }
  close(shell_file)
  next
}
```

Add shell JS before game JS by prepending to the JS temp file:
```bash
cat "$SHELL_JS_TEMP" "$JS_TEMP" > "$JS_COMBINED"
# Use $JS_COMBINED in the awk step
```

**Step 4: Update opposites and hub builds**

These use simpler awk-based injection. For each:
1. Inject tokens + shell CSS after `<style>` tag
2. Inject shell HTML after `<body>` tag
3. Inject shell JS (storage + shell) before closing `</body>` or after existing `<script>`
4. Strip dev-mode `<link>` tags

**Step 5: Verify build produces correct output**

Run `bash build.sh`. Check that all three output files contain:
- Shell bar HTML at top of body
- Shell CSS in style block
- Shell JS + storage JS in script block
- No `<link>` references to shared/

**Acceptance criteria:**
- Build script injects shell into all three output files
- Each output file is self-contained (no external references)
- Type trainer sanity checks still pass (4/4)
- New sanity check: `grep 'kg-shell' docs/*.html` matches all three files

**Commit:**
```bash
git add build.sh
git commit -m "build: inject shared shell into all game output files"
```

---

## Task 6: Refactor Hub Page for Shell Integration

**Files:**
- Modify: `hub.html`

The hub currently has its own header, footer, and back-link concepts. With the shell, it becomes just the games grid.

**Step 1: Remove the hub header**

The shell bar provides the "Kids Games" title. Remove:
```html
<div class="header">
  <h1>Kids Games</h1>
  <p>Fun, free, ad-free educational games</p>
</div>
```

Replace with a simpler welcome message that can show the player's name:
```html
<h1 id="kg-hub-welcome" class="kg-hub-welcome">Pick a game!</h1>
```

**Step 2: Remove the footer**

The shell provides all navigation. Remove the footer div.

**Step 3: Remove the touch-device JS**

The shell's games dropdown can handle this instead. Remove the `<script>` block at the bottom.

**Step 4: Add body padding for shell bar**

Add `padding-top: 56px;` to body in the hub's styles.

**Step 5: Remove duplicate CSS for things the shell provides**

The hub no longer needs its own header, footer, or back-link styles.

**Step 6: Set page title**

Add a small script or data attribute so the shell knows this is the hub:
```html
<body data-page="hub">
```

The shell JS reads this and sets the page title accordingly (or hides the games dropdown on the hub since the hub IS the games list).

**Acceptance criteria:**
- Hub shows shell bar at top
- Games grid remains (cards with icons, device badges, play buttons)
- Player name shown in shell bar
- Theme picker works
- No duplicate header/footer
- "Who's playing?" overlay shows on first visit

**Verification:** Open `hub.html` in browser. First visit should show player creation. After creating, should show games grid with shell bar.

**Commit:**
```bash
git add hub.html
git commit -m "refactor: hub page uses shared shell for navigation"
```

---

## Task 7: Test Full Shell Flow

**Step 1: Run the build**

```bash
bash build.sh
```

**Step 2: Test first-visit experience**

Open `docs/index.html` in an incognito window (clean localStorage). Should see:
1. Shell bar at top (Games, title, Guest avatar, theme, volume)
2. "Who's playing?" overlay immediately
3. Create player form (name + DoB/age)
4. After creating, overlay closes, player name in bar, games grid visible

**Step 3: Test player switching**

Click player name in bar → overlay shows existing players + "New Player" card. Create a second player. Switch between them.

**Step 4: Test theme picker**

Click theme button → dropdown with 4 options. Select each, verify colours change. Navigate to a game, verify theme persists.

**Step 5: Test games dropdown**

Click Games button → dropdown with game cards (icons + titles). Click a game → navigates to it. Verify shell bar shows on game page.

**Step 6: Test volume toggle**

Click volume button → icon changes to muted. Verify `window.KidsGames.muted` is true in console.

**Step 7: Test game navigation**

From hub, click Type Trainer → should load with shell bar. Click Opposites → should load with shell bar. Back button works. Games dropdown works from within games.

**Step 8: Verify localStorage**

Open Application tab in devtools. Verify keys:
- `kidsgames_players` — contains player profiles
- `kidsgames_activePlayer` — contains active player name

**Step 9: Commit built files**

```bash
git add docs/index.html docs/type-trainer.html docs/opposites.html
git commit -m "build: regenerate docs/ with shared shell"
```

---

## Review Gate

After Task 7, run persona review with **T1**, **T2**, **U3** against:
- All shared/ files
- The git diff
- The design doc

Check:
- T1: Is the JS clean? Event listeners properly managed? No memory leaks? Build correct?
- T2: Are touch targets ≥ 44px? Are overlays keyboard-navigable? Form labels correct?
- U3: Can a parent get their child playing in under 30 seconds? Is the setup flow obvious?

---

## Task Dependencies

```
Task 1 (storage API) → Task 4 (shell.js uses storage)
Task 2 (shell HTML) ─┐
Task 3 (shell CSS) ──┤→ Task 5 (build script needs all shared files)
Task 4 (shell JS) ───┘
Task 5 (build script) → Task 6 (hub refactor) → Task 7 (test)
```

- Tasks 2 and 3 are independent and can run in parallel
- Task 4 depends on Task 1 (storage API functions used by shell.js)
- Task 5 depends on Tasks 1-4 (needs all files to exist)
- Task 6 depends on Task 5 (needs build to work)
- Task 7 depends on everything
