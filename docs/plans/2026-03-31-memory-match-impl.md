# Memory Match — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the "coming soon" placeholder in `games/memory-match/index.html` with a fully working Memory Match game — settings screen, flipping board, peek, audio, and celebration screen.

**Architecture:** Single self-contained HTML file (inline `<style>` and `<script>`) following the pattern of the simpler games in this repo. Three screens toggled via the `hidden` attribute: settings → board → win. All state lives in a plain JS object, never in the DOM.

**Tech Stack:** Vanilla HTML/CSS/JS, Web Audio API, CSS 3D transforms, CSS Grid. No build step. Shared `tokens.css` and `shell.css` via relative path.

---

## Codebase Patterns to Follow

- `data-theme="colourful-light"` on `<html>`, `data-page="memory-match"` on `<body>`
- Shell bar injected by build script — no need to write it manually
- Shared CSS vars: `var(--font-family)`, `var(--bg)`, `var(--bg-surface)`, `var(--accent-blue)`, `var(--accent-purple)`, `var(--shadow)`, `var(--border)`, `var(--radius-xl)`, `var(--space-sm/md/lg)`, `var(--text-sm/lg)`, `var(--transition-fast)`
- Settings fieldsets use `.{prefix}-fieldset` / `.{prefix}-legend` / `.{prefix}-toggle` / `.{prefix}-toggle--active` pattern with `aria-pressed`
- Screens hidden with `hidden` attribute; CSS rule `[hidden] { display: none !important; }`
- All class names prefixed with `mm-`

---

## Task 1: Settings Screen — HTML Structure

**File:** `games/memory-match/index.html` (replace entire file)

Build the three-screen scaffold and the fully styled settings screen. No JS yet — just HTML and CSS.

**Step 1: Write the HTML scaffold**

Replace the entire file contents with:

```html
<!DOCTYPE html>
<html lang="en" data-theme="colourful-light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Memory Match</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../shared/tokens.css">
<link rel="stylesheet" href="../../shared/shell.css">
<style>
/* ===== Reset + Body ===== */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: var(--font-family);
  background: var(--bg);
  min-height: 100vh;
  overflow-x: hidden;
  position: relative;
  padding-top: 56px;
}

body::before, body::after {
  content: '';
  position: fixed;
  border-radius: 50%;
  z-index: 0;
  opacity: 0.15;
  animation: mmFloat 8s ease-in-out infinite;
  pointer-events: none;
}
body::before { width: 300px; height: 300px; background: var(--accent-blue); top: -80px; right: -80px; }
body::after  { width: 250px; height: 250px; background: var(--accent-purple); bottom: -60px; left: -60px; animation-delay: -4s; }

@keyframes mmFloat {
  0%,100% { transform: translate(0,0) scale(1); }
  50% { transform: translate(15px,20px) scale(1.05); }
}

/* ===== Screens ===== */
#mm-app { position: relative; z-index: 1; }
.mm-screen { min-height: calc(100vh - 56px); display: flex; align-items: flex-start; justify-content: center; padding: 24px 16px 48px; }
.mm-screen[hidden] { display: none !important; }

/* ===== Settings ===== */
.mm-settings-wrap {
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.mm-logo { font-size: 4rem; text-align: center; animation: mmBounce 0.6s ease-out; }

@keyframes mmBounce {
  0% { transform: scale(0.5); opacity: 0; }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.mm-title {
  font-size: 2.4rem;
  font-weight: 900;
  text-align: center;
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.mm-fieldset { border: none; padding: 0; }

.mm-legend {
  font-size: var(--text-sm);
  font-weight: 800;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-sm);
  display: block;
}

.mm-toggle-row { display: flex; flex-wrap: wrap; gap: var(--space-xs); }

.mm-toggle {
  flex: 1;
  min-width: 64px;
  min-height: 48px;
  border: 2px solid var(--border);
  border-radius: var(--radius-xl);
  background: var(--bg-surface);
  font-family: var(--font-family);
  font-size: var(--text-lg);
  font-weight: 800;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  padding: 4px 8px;
  line-height: 1.2;
}
.mm-toggle:hover { border-color: var(--accent-blue); color: var(--accent-blue); }
.mm-toggle--active {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
  color: #fff;
}
.mm-toggle--active:hover { background: var(--accent-blue); color: #fff; }

/* Peek toggle row (label + switch layout) */
.mm-peek-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-surface);
  border-radius: var(--radius-xl);
  padding: 14px 20px;
  box-shadow: var(--shadow);
}
.mm-peek-label {
  font-size: var(--text-lg);
  font-weight: 800;
  color: var(--text-primary);
}
.mm-peek-sub {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 600;
  display: block;
}

/* Toggle switch */
.mm-switch { position: relative; display: inline-block; width: 52px; height: 28px; }
.mm-switch input { opacity: 0; width: 0; height: 0; }
.mm-slider {
  position: absolute; cursor: pointer; inset: 0;
  background: var(--border);
  border-radius: 28px;
  transition: background var(--transition-fast);
}
.mm-slider::before {
  content: '';
  position: absolute;
  width: 20px; height: 20px;
  left: 4px; top: 4px;
  background: #fff;
  border-radius: 50%;
  transition: transform var(--transition-fast);
}
.mm-switch input:checked + .mm-slider { background: var(--accent-blue); }
.mm-switch input:checked + .mm-slider::before { transform: translateX(24px); }

/* Play button */
.mm-play-btn {
  width: 100%;
  padding: 18px;
  border: none;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  color: #fff;
  font-family: var(--font-family);
  font-size: 1.4rem;
  font-weight: 900;
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  box-shadow: var(--shadow);
  margin-top: var(--space-sm);
}
.mm-play-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
.mm-play-btn:active { transform: translateY(0); }
</style>
</head>
<body data-page="memory-match">

<!-- Shell bar injected by build script -->

<div id="mm-app">

  <!-- SCREEN: Settings -->
  <div id="mm-settings" class="mm-screen">
    <div class="mm-settings-wrap">
      <div class="mm-logo">🃏</div>
      <h1 class="mm-title">Memory Match</h1>

      <!-- Board Size -->
      <fieldset class="mm-fieldset">
        <legend class="mm-legend">Board Size</legend>
        <div class="mm-toggle-row" id="mm-size-row">
          <button class="mm-toggle" data-size="2x4" aria-pressed="false">Quick<br><small>2×4</small></button>
          <button class="mm-toggle mm-toggle--active" data-size="3x4" aria-pressed="true">Medium<br><small>3×4</small></button>
          <button class="mm-toggle" data-size="4x4" aria-pressed="false">Classic<br><small>4×4</small></button>
          <button class="mm-toggle" data-size="4x5" aria-pressed="false">Challenge<br><small>4×5</small></button>
        </div>
      </fieldset>

      <!-- Theme -->
      <fieldset class="mm-fieldset">
        <legend class="mm-legend">Theme</legend>
        <div class="mm-toggle-row" id="mm-theme-row">
          <button class="mm-toggle mm-toggle--active" data-theme="animals" aria-pressed="true">🐾<br><small>Animals</small></button>
          <button class="mm-toggle" data-theme="food" aria-pressed="false">🍕<br><small>Food</small></button>
          <button class="mm-toggle" data-theme="vehicles" aria-pressed="false">🚗<br><small>Vehicles</small></button>
          <button class="mm-toggle" data-theme="random" aria-pressed="false">🎲<br><small>Random</small></button>
        </div>
      </fieldset>

      <!-- Peek toggle -->
      <fieldset class="mm-fieldset">
        <legend class="mm-legend">Options</legend>
        <div class="mm-peek-row">
          <div>
            <span class="mm-peek-label">Peek at start</span>
            <span class="mm-peek-sub">See all cards for 1.5s before playing</span>
          </div>
          <label class="mm-switch" aria-label="Peek at start">
            <input type="checkbox" id="mm-peek-toggle" checked>
            <span class="mm-slider"></span>
          </label>
        </div>
      </fieldset>

      <button class="mm-play-btn" id="mm-play-btn">Play! 🃏</button>
    </div>
  </div>

  <!-- SCREEN: Board -->
  <div id="mm-board-screen" class="mm-screen" hidden>
    <!-- populated by JS -->
  </div>

  <!-- SCREEN: Win -->
  <div id="mm-win-screen" class="mm-screen" hidden>
    <!-- populated by JS -->
  </div>

</div>

<script>
// ===== placeholder — JS added in later tasks =====
document.getElementById('mm-play-btn').addEventListener('click', () => {
  alert('Settings work! JS coming next.');
});
</script>

</body>
</html>
```

**Step 2: Verify in browser**

Open `games/memory-match/index.html` in a browser. Check:
- Settings screen renders correctly with 4 size buttons, 4 theme buttons, peek toggle, play button
- Clicking a size/theme button highlights it (not yet — JS not wired)
- Play button shows alert

**Step 3: Commit**

```bash
git add games/memory-match/index.html
git commit -m "feat(memory-match): settings screen HTML + CSS scaffold"
```

---

## Task 2: Settings Screen — Toggle JS

**File:** `games/memory-match/index.html` — replace the `<script>` placeholder

Wire the toggle button groups so only one per row can be active at a time.

**Step 1: Replace the placeholder script with settings JS**

```js
// ===== STATE =====
const state = {
  size: '3x4',
  theme: 'animals',
  peek: true,
};

// ===== TOGGLE GROUPS =====
function initToggleGroup(rowId, stateKey) {
  const row = document.getElementById(rowId);
  row.addEventListener('click', e => {
    const btn = e.target.closest('[data-' + stateKey + ']');
    if (!btn) return;
    row.querySelectorAll('.mm-toggle').forEach(b => {
      b.classList.remove('mm-toggle--active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('mm-toggle--active');
    btn.setAttribute('aria-pressed', 'true');
    state[stateKey] = btn.dataset[stateKey];
  });
}

initToggleGroup('mm-size-row', 'size');
initToggleGroup('mm-theme-row', 'theme');

document.getElementById('mm-peek-toggle').addEventListener('change', e => {
  state.peek = e.target.checked;
});

document.getElementById('mm-play-btn').addEventListener('click', startGame);

function startGame() {
  // placeholder — wired in Task 3
  console.log('Starting with', state);
}
```

**Step 2: Verify in browser**

- Click each size button — only one highlights at a time
- Click each theme button — only one highlights at a time
- Toggle peek switch
- Check console shows correct state on Play click

**Step 3: Commit**

```bash
git add games/memory-match/index.html
git commit -m "feat(memory-match): wire settings toggles to state"
```

---

## Task 3: Emoji Data + Shuffle + Board Generation

**File:** `games/memory-match/index.html` — add to `<script>`

**Step 1: Add emoji pools + helpers above `startGame`**

```js
// ===== EMOJI POOLS =====
const EMOJIS = {
  animals:  ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐸','🐵','🐔','🐧','🐦','🦆','🦉','🦋','🐢'],
  food:     ['🍎','🍊','🍋','🍇','🍓','🍒','🍕','🍔','🌮','🍦','🍩','🍪','🎂','🧁','🍫','🍬','🥐','🧇','🥞','🍿'],
  vehicles: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','✈️','🚀','🛸','🚁','⛵','🚂','🚤'],
};

const SIZES = {
  '2x4': { cols: 2, rows: 4 },
  '3x4': { cols: 3, rows: 4 },
  '4x4': { cols: 4, rows: 4 },
  '4x5': { cols: 4, rows: 5 },
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(theme, pairs) {
  let pool;
  if (theme === 'random') {
    pool = shuffle([...EMOJIS.animals, ...EMOJIS.food, ...EMOJIS.vehicles]);
  } else {
    pool = shuffle([...EMOJIS[theme]]);
  }
  const chosen = pool.slice(0, pairs);
  return shuffle([...chosen, ...chosen]);
}
```

**Step 2: Add board screen CSS (inside `<style>`)**

```css
/* ===== Board Screen ===== */
.mm-board-screen-inner {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mm-hud {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
}

.mm-hud-back {
  background: none;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
  color: var(--text-secondary);
  font-family: var(--font-family);
  font-weight: 800;
  padding: 4px 8px;
}
.mm-hud-back:hover { color: var(--text-primary); }

.mm-hud-flips {
  font-size: var(--text-lg);
  font-weight: 800;
  color: var(--text-secondary);
}

.mm-grid {
  display: grid;
  gap: 6px;
}

/* ===== Cards ===== */
.mm-card {
  aspect-ratio: 3/4;
  cursor: pointer;
  perspective: 600px;
  -webkit-tap-highlight-color: transparent;
}

.mm-card-inner {
  width: 100%; height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.3s ease;
  border-radius: var(--radius-xl);
}

.mm-card--flipped .mm-card-inner,
.mm-card--matched .mm-card-inner {
  transform: rotateY(180deg);
}

.mm-card-back, .mm-card-front {
  position: absolute; inset: 0;
  border-radius: var(--radius-xl);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mm-card-back {
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  box-shadow: var(--shadow);
  font-size: 2rem;
  color: rgba(255,255,255,0.7);
  font-weight: 900;
}

.mm-card-front {
  background: var(--bg-surface);
  box-shadow: var(--shadow);
  transform: rotateY(180deg);
}

.mm-card-emoji {
  font-size: clamp(1.5rem, 5vw, 3rem);
  line-height: 1;
  user-select: none;
}

.mm-card--matched .mm-card-front {
  background: #d4f7e4;
  box-shadow: 0 0 0 3px #34c76f, var(--shadow);
}

@keyframes mmShake {
  0%,100% { transform: rotateY(180deg) translateX(0); }
  20% { transform: rotateY(180deg) translateX(-6px); }
  40% { transform: rotateY(180deg) translateX(6px); }
  60% { transform: rotateY(180deg) translateX(-4px); }
  80% { transform: rotateY(180deg) translateX(4px); }
}

.mm-card--mismatch .mm-card-inner {
  animation: mmShake 0.4s ease;
}
```

**Step 3: Add board rendering to `startGame`**

Replace the `startGame` function stub:

```js
// ===== GAME STATE =====
let flipped = [];   // up to 2 card elements currently face-up (unmatched)
let matched = 0;
let flips = 0;
let locked = false; // click-lock during animations
let firstTap = true;

function startGame() {
  const { cols, rows } = SIZES[state.size];
  const pairs = cols * rows / 2;
  const deck = buildDeck(state.theme, pairs);

  flipped = []; matched = 0; flips = 0; locked = false; firstTap = true;

  // Build board screen
  const boardScreen = document.getElementById('mm-board-screen');
  boardScreen.innerHTML = `
    <div class="mm-board-screen-inner">
      <div class="mm-hud">
        <button class="mm-hud-back" id="mm-back-btn">← Settings</button>
        <div class="mm-hud-flips" id="mm-flips-display">0 flips</div>
      </div>
      <div class="mm-grid" id="mm-grid"
           style="grid-template-columns: repeat(${cols}, 1fr);">
      </div>
    </div>
  `;

  // Size cards to fit viewport
  const grid = document.getElementById('mm-grid');
  sizeCards(grid, cols, rows);
  window.addEventListener('resize', () => sizeCards(grid, cols, rows));

  deck.forEach((emoji, i) => {
    const card = document.createElement('div');
    card.className = 'mm-card';
    card.dataset.emoji = emoji;
    card.dataset.index = i;
    card.innerHTML = `
      <div class="mm-card-inner">
        <div class="mm-card-back">?</div>
        <div class="mm-card-front"><span class="mm-card-emoji">${emoji}</span></div>
      </div>
    `;
    card.addEventListener('click', () => onCardClick(card));
    grid.appendChild(card);
  });

  document.getElementById('mm-back-btn').addEventListener('click', goSettings);

  showScreen('mm-board-screen');

  if (state.peek) doPeek(grid);
}

function sizeCards(grid, cols, rows) {
  // Determine cols/rows accounting for landscape swap on 4×5
  let c = cols, r = rows;
  if (state.size === '4x5' && window.innerWidth > window.innerHeight) {
    c = 5; r = 4;
    grid.style.gridTemplateColumns = `repeat(${c}, 1fr)`;
  } else {
    grid.style.gridTemplateColumns = `repeat(${c}, 1fr)`;
  }
  const pad = 32, gap = 6, headerH = 56 + 56; // shell + hud
  const maxW = Math.floor((window.innerWidth - pad - gap * (c - 1)) / c);
  const maxH = Math.floor((window.innerHeight - headerH - pad - gap * (r - 1)) / r);
  const size = Math.min(maxW, maxH, 160);
  grid.style.setProperty('--card-size', size + 'px');
  grid.querySelectorAll('.mm-card').forEach(card => {
    card.style.width = size + 'px';
    card.style.height = Math.floor(size * 4/3) + 'px';
  });
}

function showScreen(id) {
  ['mm-settings','mm-board-screen','mm-win-screen'].forEach(s => {
    document.getElementById(s).hidden = s !== id;
  });
}

function goSettings() {
  window.removeEventListener('resize', sizeCards);
  showScreen('mm-settings');
}
```

**Step 4: Verify in browser**

- Click Play — board renders with correct grid
- Cards show `?` backs
- Flips counter shows `0 flips`
- Back button returns to settings
- Try all 4 board sizes

**Step 5: Commit**

```bash
git add games/memory-match/index.html
git commit -m "feat(memory-match): emoji data, shuffle, board rendering"
```

---

## Task 4: Card Interaction — Flip + Match Logic

**File:** `games/memory-match/index.html` — add to `<script>`

**Step 1: Add click handler and match logic**

```js
function onCardClick(card) {
  if (locked) return;
  if (card.classList.contains('mm-flipped')) return;
  if (card.classList.contains('mm-matched')) return;
  if (flipped.length === 2) return;

  // First-play hint: pulse a second card once
  if (firstTap) {
    firstTap = false;
    showFirstPlayHint(card);
  }

  playSound('flip');
  card.classList.add('mm-card--flipped');
  flipped.push(card);
  flips++;
  document.getElementById('mm-flips-display').textContent =
    flips + (flips === 1 ? ' flip' : ' flips');

  if (flipped.length === 2) {
    locked = true;
    setTimeout(evaluatePair, 350); // wait for flip animation
  }
}

function evaluatePair() {
  const [a, b] = flipped;
  if (a.dataset.emoji === b.dataset.emoji) {
    // Match
    a.classList.add('mm-card--matched');
    b.classList.add('mm-card--matched');
    playSound('match');
    matched++;
    flipped = [];
    locked = false;
    const totalPairs = document.querySelectorAll('.mm-card').length / 2;
    if (matched === totalPairs) {
      setTimeout(showWin, 400);
    }
  } else {
    // Mismatch
    a.classList.add('mm-card--mismatch');
    b.classList.add('mm-card--mismatch');
    playSound('mismatch');
    setTimeout(() => {
      a.classList.remove('mm-card--flipped', 'mm-card--mismatch');
      b.classList.remove('mm-card--flipped', 'mm-card--mismatch');
      flipped = [];
      locked = false;
    }, 900);
  }
}
```

**Step 2: Verify in browser**

- Flip two matching cards — they stay green
- Flip two non-matching cards — they shake and flip back
- Flip counter increments on each card tap
- Rapid tapping does not corrupt state

**Step 3: Commit**

```bash
git add games/memory-match/index.html
git commit -m "feat(memory-match): card flip and match/mismatch logic"
```

---

## Task 5: Peek Feature

**File:** `games/memory-match/index.html` — add to `<script>`

**Step 1: Add peek function**

```js
function doPeek(grid) {
  locked = true;
  // Flip all cards face-up instantly (no animation delay stagger)
  grid.querySelectorAll('.mm-card').forEach(card => {
    card.classList.add('mm-card--flipped');
  });
  setTimeout(() => {
    grid.querySelectorAll('.mm-card').forEach(card => {
      card.classList.remove('mm-card--flipped');
    });
    locked = false;
  }, 1500);
}
```

**Step 2: Verify**

- Enable peek in settings, click Play — all cards briefly show their emoji then flip back
- Disable peek — cards start hidden
- While peek is showing, tapping cards does nothing (locked)

**Step 3: Commit**

```bash
git add games/memory-match/index.html
git commit -m "feat(memory-match): peek feature — brief card reveal on start"
```

---

## Task 6: First-Play Hint

**File:** `games/memory-match/index.html` — add to `<script>`

After the first card is tapped, pulse a random other unflipped card to hint "now find the match".

**Step 1: Add hint function + CSS**

Add to `<style>`:
```css
@keyframes mmPulse {
  0%,100% { transform: scale(1); }
  50% { transform: scale(1.08); box-shadow: 0 0 0 4px var(--accent-blue); border-radius: var(--radius-xl); }
}
.mm-card--hint { animation: mmPulse 0.6s ease 2; }
```

Add to `<script>`:
```js
function showFirstPlayHint(tappedCard) {
  const candidates = [...document.querySelectorAll('.mm-card')]
    .filter(c => c !== tappedCard && !c.classList.contains('mm-matched'));
  if (!candidates.length) return;
  const hint = candidates[Math.floor(Math.random() * candidates.length)];
  hint.classList.add('mm-card--hint');
  hint.addEventListener('animationend', () => hint.classList.remove('mm-card--hint'), { once: true });
}
```

**Step 2: Verify**

- On first card tap, a random other card pulses twice then stops
- On subsequent taps, no pulse

**Step 3: Commit**

```bash
git add games/memory-match/index.html
git commit -m "feat(memory-match): first-play hint pulse on first tap"
```

---

## Task 7: Win Screen

**File:** `games/memory-match/index.html` — add CSS + `showWin` function

**Step 1: Add win screen CSS (inside `<style>`)**

```css
/* ===== Win Screen ===== */
.mm-win-wrap {
  width: 100%;
  max-width: 480px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

.mm-win-emoji {
  font-size: 5rem;
  animation: mmWinBounce 0.6s ease-out;
}

@keyframes mmWinBounce {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.3); }
  100% { transform: scale(1); opacity: 1; }
}

.mm-win-title {
  font-size: 2.8rem;
  font-weight: 900;
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.mm-win-flips {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-secondary);
}

.mm-win-btn {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: var(--radius-xl);
  font-family: var(--font-family);
  font-size: 1.2rem;
  font-weight: 900;
  cursor: pointer;
  transition: transform var(--transition-fast);
}
.mm-win-btn:hover { transform: translateY(-2px); }
.mm-win-btn--primary {
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  color: #fff;
  box-shadow: var(--shadow);
}
.mm-win-btn--secondary {
  background: var(--bg-surface);
  color: var(--text-primary);
  border: 2px solid var(--border);
}
```

**Step 2: Add `showWin` function**

```js
function showWin() {
  playSound('win');
  const winScreen = document.getElementById('mm-win-screen');
  winScreen.innerHTML = `
    <div class="mm-win-wrap">
      <div class="mm-win-emoji">🎉</div>
      <div class="mm-win-title">You did it!</div>
      <div class="mm-win-flips">Matched all pairs in <strong>${flips}</strong> flip${flips === 1 ? '' : 's'}!</div>
      <button class="mm-win-btn mm-win-btn--primary" id="mm-play-again">Play Again 🃏</button>
      <button class="mm-win-btn mm-win-btn--secondary" id="mm-change-settings">Change Settings</button>
    </div>
  `;
  document.getElementById('mm-play-again').addEventListener('click', startGame);
  document.getElementById('mm-change-settings').addEventListener('click', goSettings);
  showScreen('mm-win-screen');
}
```

**Step 3: Verify**

- Complete a 2×4 game (Quick) — win screen appears with flip count
- "Play Again" starts a new game with same settings
- "Change Settings" goes back to settings screen

**Step 4: Commit**

```bash
git add games/memory-match/index.html
git commit -m "feat(memory-match): win screen with play again / change settings"
```

---

## Task 8: Audio

**File:** `games/memory-match/index.html` — add to `<script>`

All sounds via Web Audio API. No external files.

**Step 1: Add audio engine above `startGame`**

```js
// ===== AUDIO =====
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function beep({ freq = 440, type = 'sine', gain = 0.3, duration = 0.1, delay = 0 } = {}) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    g.gain.setValueAtTime(gain, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);
  } catch (e) { /* audio not available */ }
}

function playSound(type) {
  switch (type) {
    case 'flip':
      beep({ freq: 600, type: 'sine', gain: 0.15, duration: 0.08 });
      break;
    case 'match':
      beep({ freq: 523, gain: 0.25, duration: 0.15 });
      beep({ freq: 784, gain: 0.25, duration: 0.15, delay: 0.15 });
      break;
    case 'mismatch':
      beep({ freq: 220, type: 'triangle', gain: 0.2, duration: 0.2 });
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => {
        beep({ freq: f, gain: 0.25, duration: 0.18, delay: i * 0.18 });
      });
      break;
  }
}
```

**Step 2: Verify**

- Flip a card — soft tick
- Match two cards — rising two-note chime
- Mismatch — low boing
- Win — four-note fanfare
- No sound before first interaction (AudioContext created lazily)

**Step 3: Commit**

```bash
git add games/memory-match/index.html
git commit -m "feat(memory-match): Web Audio API sound effects"
```

---

## Task 9: Hub Integration

**File:** `hub.html` — add Memory Match to the games list

**Step 1: Open hub.html and find the games list**

Search for the existing game cards (e.g. `maths`, `number-bonds`) and add Memory Match in the same pattern.

**Step 2: Add Memory Match card**

Add alongside the other game cards:
```html
<a href="games/memory-match/index.html" class="hub-card" ...>
  <!-- match the pattern of other cards exactly -->
  🃏 Memory Match
</a>
```

(Exact markup depends on what hub.html uses — match it precisely.)

**Step 3: Commit**

```bash
git add hub.html
git commit -m "feat: add Memory Match to hub"
```

---

## Task 10: Final Polish + Review

**Step 1: Test all board sizes on mobile viewport (375px wide)**

In browser DevTools, set to iPhone SE (375×667). Verify:
- All 4 board sizes fit without scrolling
- Cards are not too small to tap (min ~44px)
- 4×5 landscape: rotate device/viewport — columns swap if wider than tall

**Step 2: Test accessibility**

- Tab through settings — all buttons focusable
- Peek toggle operable with keyboard (Space)

**Step 3: Run build if applicable**

Check if there's a build script (look for `package.json` or `Makefile` at root):

```bash
ls *.json Makefile 2>/dev/null
```

If a build step exists, run it so docs are updated.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(memory-match): complete — settings, board, peek, audio, win screen"
```

---

## Implementation Order Summary

| Task | What | Commit after? |
|------|------|---------------|
| 1 | Settings HTML + CSS | Yes |
| 2 | Toggle JS | Yes |
| 3 | Emoji data + board render | Yes |
| 4 | Flip + match logic | Yes |
| 5 | Peek feature | Yes |
| 6 | First-play hint | Yes |
| 7 | Win screen | Yes |
| 8 | Audio | Yes |
| 9 | Hub integration | Yes |
| 10 | Polish + build | Yes |
