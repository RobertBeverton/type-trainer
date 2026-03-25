# UI Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the quit→results loop (Change settings becomes primary after quitting) and add a live complexity label + example question to the custom settings panel.

**Architecture:** `game.js` gains an optional `quit` param on `end()`, threaded through to `onEnd`. Each `main.js` updates the quit handler, `showResults` button swap, and a new `updateComplexityPreview()` function wired into all custom input listeners. Since `game.js` is identical across both games, it is updated and tested once (Number Bonds) then copied to Maths. CSS and HTML changes are parallel across both games.

**Tech Stack:** Vanilla JS ES modules, Node built-in test runner (`node:test`), CSS custom properties.

---

## Reference files (read before starting)

- `docs/plans/2026-03-25-ui-improvements-design.md` — approved design doc
- `games/number-bonds/js/game.js` — file being updated (then copied to maths)
- `games/number-bonds/js/main.js` — main wiring file
- `games/number-bonds/css/style.css` — styles to update
- `games/number-bonds/index.html` — HTML to update
- `games/maths/js/main.js` — same changes, `maths-` prefix
- `games/maths/css/style.css` — same CSS, `maths-` prefix
- `games/maths/index.html` — same HTML, `maths-` prefix

---

## Task 1: game.js — TDD for quit param on end()

**Files:**
- Modify: `games/number-bonds/tests/game.test.js`
- Modify: `games/number-bonds/js/game.js`
- Modify: `games/maths/js/game.js` (copy)

### Step 1: Add new tests to `games/number-bonds/tests/game.test.js`

Append a new describe block at the end of the file:

```js
describe('GameSession — end() quit param', () => {
  it('onEnd receives quit: false by default', () => {
    let captured = null;
    const s = createSession({ mode: 'round', onEnd: e => { captured = e; } });
    s.start();
    s.end();
    assert.equal(captured.quit, false);
  });

  it('onEnd receives quit: true when end({ quit: true }) called', () => {
    let captured = null;
    const s = createSession({ mode: 'round', onEnd: e => { captured = e; } });
    s.start();
    s.end({ quit: true });
    assert.equal(captured.quit, true);
  });

  it('onEnd receives quit: false when end() called with no args', () => {
    let captured = null;
    const s = createSession({ mode: 'endless', onEnd: e => { captured = e; } });
    s.start();
    s.end();
    assert.equal(captured.quit, false);
  });
});
```

Note: `createSession` does not currently pass `onEnd`. Update the helper to also accept `onEnd`:

```js
function createSession({ mode = 'round', difficulty = 'easy', onAnswer = () => {}, onEnd = () => {} } = {}) {
  const range = {
    min: 1, max: 10, maxTable: 5,
    negatives: false, decimals: false,
    _difficulty: difficulty,
  };
  return new GameSession({
    op: '+', mode, range,
    onQuestion: () => {},
    onAnswer,
    onScore: () => {},
    onEnd,
    onHint: () => {},
  });
}
```

### Step 2: Run tests — verify new tests fail

```bash
node --test games/number-bonds/tests/game.test.js
```

Expected: 3 new failures — `captured.quit` is `undefined` (field doesn't exist yet).

### Step 3: Update `end()` in `games/number-bonds/js/game.js`

Find the `end()` method and update it to accept and forward the quit param:

```js
// Before:
end() {
  if (!this._active) return;
  this._active = false;
  clearInterval(this._timer);
  this._clearHintTimer();
  const timeTaken = this.mode !== 'endless'
    ? Math.round((Date.now() - this.startTime) / 1000)
    : null;
  this.onEnd({
    score: this.score,
    accuracy: this.total > 0 ? Math.round((this.correct / this.total) * 100) : 0,
    bestStreak: this.bestStreak,
    timeTaken,
  });
}

// After:
end({ quit = false } = {}) {
  if (!this._active) return;
  this._active = false;
  clearInterval(this._timer);
  this._clearHintTimer();
  const timeTaken = this.mode !== 'endless'
    ? Math.round((Date.now() - this.startTime) / 1000)
    : null;
  this.onEnd({
    score: this.score,
    accuracy: this.total > 0 ? Math.round((this.correct / this.total) * 100) : 0,
    bestStreak: this.bestStreak,
    timeTaken,
    quit,
  });
}
```

### Step 4: Run all tests — verify they pass

```bash
node --test games/number-bonds/tests/
```

Expected: all tests pass (41 existing + 3 new = 44 total).

### Step 5: Copy to Maths

```bash
cp games/number-bonds/js/game.js games/maths/js/game.js
```

### Step 6: Commit

```bash
git add games/number-bonds/js/game.js games/maths/js/game.js games/number-bonds/tests/game.test.js
git commit -m "feat: forward quit flag from end() through onEnd callback"
```

---

## Task 2: Number Bonds main.js — quit handler + showResults button swap

**Files:**
- Modify: `games/number-bonds/js/main.js`

Read the file first. Apply two targeted edits.

### Edit 1 — `initGameScreen`: pass `quit: true` from quit button

Find:
```js
quitBtn.onclick = () => {
  activeSession?.end();
```

Replace with:
```js
quitBtn.onclick = () => {
  activeSession?.end({ quit: true });
```

### Edit 2 — `showResults`: swap button prominence on quit

Find `function showResults(stats)`. At the end of the function, before `showScreen('results')`, add the button class swap:

```js
// Before (end of showResults):
document.getElementById('nb-play-again-btn').onclick = startGame;
document.getElementById('nb-change-settings-btn').onclick = () => showScreen('settings');
showScreen('results');

// After:
document.getElementById('nb-play-again-btn').onclick = startGame;
document.getElementById('nb-change-settings-btn').onclick = () => showScreen('settings');
document.getElementById('nb-play-again-btn').className =
  stats.quit ? 'nb-btn nb-btn--secondary' : 'nb-btn nb-btn--primary';
document.getElementById('nb-change-settings-btn').className =
  stats.quit ? 'nb-btn nb-btn--primary' : 'nb-btn nb-btn--secondary';
showScreen('results');
```

### Step: Commit

```bash
git add games/number-bonds/js/main.js
git commit -m "feat(number-bonds): swap results buttons when session is quit"
```

---

## Task 3: Number Bonds — complexity indicator (HTML + CSS + main.js)

**Files:**
- Modify: `games/number-bonds/index.html`
- Modify: `games/number-bonds/css/style.css`
- Modify: `games/number-bonds/js/main.js`

### Edit 1 — `index.html`: add complexity row inside custom opts panel

Find the closing `</div>` of `#nb-custom-opts` (the one that closes the last `nb-custom-row`). It looks like:

```html
        <div class="nb-custom-row">
          <label class="nb-label">
            <input id="nb-decimals" type="checkbox"> Decimals (1dp)
          </label>
        </div>
      </div>
```

Add the complexity row before the closing `</div>` of `#nb-custom-opts`:

```html
        <div class="nb-custom-row">
          <label class="nb-label">
            <input id="nb-decimals" type="checkbox"> Decimals (1dp)
          </label>
        </div>
        <div class="nb-complexity-row" id="nb-complexity-row">
          <span class="nb-complexity-badge" id="nb-complexity-badge">KS2</span>
          <span class="nb-complexity-ages" id="nb-complexity-ages">Ages 7–11</span>
          <span class="nb-complexity-example" id="nb-complexity-example">e.g. 12 + ? = 20</span>
        </div>
      </div>
```

### Edit 2 — `css/style.css`: add complexity row styles

Append before the `/* === Responsive ===  */` section:

```css
/* Complexity indicator */
.nb-complexity-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding-top: var(--space-xs);
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

.nb-complexity-badge {
  font-size: var(--text-xs);
  font-weight: 800;
  padding: 2px 8px;
  border-radius: var(--radius-md);
  color: #fff;
}

.nb-complexity-ages {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-weight: 600;
}

.nb-complexity-example {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-primary);
  margin-left: auto;
}
```

### Edit 3 — `main.js`: add `computeComplexity`, `buildNbExampleQuestion`, `updateComplexityPreview`

Add these three functions after `getActiveRange()`:

```js
// --- Complexity indicator (custom mode only) ---

const COMPLEXITY_LEVELS = {
  preschool: { label: 'Preschool', ages: 'Ages 3–5',   colour: '#4caf50' },
  ks1:       { label: 'KS1',       ages: 'Ages 5–7',   colour: '#3b9acd' },
  ks2:       { label: 'KS2',       ages: 'Ages 7–11',  colour: '#f5a623' },
  ks3:       { label: 'KS3',       ages: 'Ages 11–14', colour: '#e07a00' },
  challenge: { label: 'Challenge', ages: 'Advanced',   colour: '#e53935' },
};

function computeComplexity(op, custom) {
  const { max, maxTable, negatives, decimals } = custom;
  if (negatives || decimals) return 'challenge';
  const addSubLevel =
    max > 100 ? 'challenge' :
    max > 20  ? 'ks3'       :
    max > 10  ? 'ks2'       :
    max > 5   ? 'ks1'       : 'preschool';
  const mulDivLevel =
    maxTable > 12 ? 'challenge' :
    maxTable > 10 ? 'ks3'       :
    maxTable > 5  ? 'ks2'       :
    maxTable > 2  ? 'ks1'       : 'preschool';
  if (op === '+' || op === '-') return addSubLevel;
  if (op === '*' || op === '/') return mulDivLevel;
  const order = ['preschool', 'ks1', 'ks2', 'ks3', 'challenge'];
  return order[Math.max(order.indexOf(addSubLevel), order.indexOf(mulDivLevel))];
}

function buildNbExampleQuestion(op, custom) {
  const { max, maxTable } = custom;
  const effectiveOp = (op === '*' || op === '/') ? '*' : '+';
  if (effectiveOp === '+') {
    const answer = max;
    const left = Math.round(max * 0.6);
    return `${left} + ? = ${answer}`;
  }
  const a = Math.max(2, maxTable - 1);
  return `? × ${maxTable} = ${a * maxTable}`;
}

function updateComplexityPreview() {
  const level = computeComplexity(settings.op, settings.custom);
  const info = COMPLEXITY_LEVELS[level];
  const badge = document.getElementById('nb-complexity-badge');
  badge.textContent = info.label;
  badge.style.background = info.colour;
  document.getElementById('nb-complexity-ages').textContent = info.ages;
  document.getElementById('nb-complexity-example').textContent =
    'e.g. ' + buildNbExampleQuestion(settings.op, settings.custom);
}
```

### Edit 4 — `main.js`: call `updateComplexityPreview()` from all relevant handlers

In `initSettingsScreen`:

1. After `settings.op = btn.dataset.op;` (op toggle handler), add:
```js
if (settings.difficulty === 'custom') updateComplexityPreview();
```

2. After `document.getElementById('nb-custom-opts').hidden = settings.difficulty !== 'custom';` (difficulty toggle handler), add:
```js
if (settings.difficulty === 'custom') updateComplexityPreview();
```

3. After each custom input change handler (min, max, maxTable, negatives, decimals), add `updateComplexityPreview();`. There are five handlers — add it to each:

```js
document.getElementById('nb-min').addEventListener('change', e => {
  settings.custom.min = Number(e.target.value);
  updateComplexityPreview();
});
document.getElementById('nb-max').addEventListener('change', e => {
  settings.custom.max = Number(e.target.value);
  updateComplexityPreview();
});
document.getElementById('nb-table').addEventListener('change', e => {
  settings.custom.maxTable = Number(e.target.value);
  updateComplexityPreview();
});
document.getElementById('nb-negatives').addEventListener('change', e => {
  settings.custom.negatives = e.target.checked;
  updateComplexityPreview();
});
document.getElementById('nb-decimals').addEventListener('change', e => {
  settings.custom.decimals = e.target.checked;
  updateComplexityPreview();
});
```

In `applySettingsToUI`: add at the end:
```js
if (settings.difficulty === 'custom') updateComplexityPreview();
```

### Step: Verify

```bash
grep "updateComplexityPreview" games/number-bonds/js/main.js  # should find 8+ calls
grep "nb-complexity" games/number-bonds/index.html            # should find the row
grep "nb-complexity" games/number-bonds/css/style.css         # should find the styles
```

### Step: Commit

```bash
git add games/number-bonds/index.html games/number-bonds/css/style.css games/number-bonds/js/main.js
git commit -m "feat(number-bonds): add live complexity indicator to custom settings"
```

---

## Task 4: Maths — all changes (quit + complexity)

**Files:**
- Modify: `games/maths/js/main.js`
- Modify: `games/maths/css/style.css`
- Modify: `games/maths/index.html`

Identical changes to Tasks 2 + 3, with `maths-` prefix throughout. Read each file first.

### Maths main.js Edit 1 — quit handler

Same as Task 2 Edit 1 but the quit handler is in `initGameScreen`:
```js
quitBtn.onclick = () => {
  activeSession?.end({ quit: true });
```

### Maths main.js Edit 2 — showResults button swap

Same as Task 2 Edit 2 but with `maths-` IDs:
```js
document.getElementById('maths-play-again-btn').className =
  stats.quit ? 'maths-btn maths-btn--secondary' : 'maths-btn maths-btn--primary';
document.getElementById('maths-change-settings-btn').className =
  stats.quit ? 'maths-btn maths-btn--primary' : 'maths-btn maths-btn--secondary';
```

### Maths main.js Edit 3 — complexity functions

Same three functions as Task 3 Edit 3, but:
- Function name: `buildMathsExampleQuestion` (not `buildNbExampleQuestion`)
- Element IDs: `maths-complexity-badge`, `maths-complexity-ages`, `maths-complexity-example`

The Maths example question format always has the blank on the right:
```js
function buildMathsExampleQuestion(op, custom) {
  const { max, maxTable } = custom;
  const effectiveOp = (op === '*' || op === '/') ? '*' : '+';
  if (effectiveOp === '+') {
    const a = Math.round(max * 0.6);
    const b = Math.round(max * 0.35);
    return `${a} + ${b} = ?`;
  }
  const a = Math.max(2, maxTable - 1);
  return `${a} × ${maxTable} = ?`;
}
```

`updateComplexityPreview` calls `buildMathsExampleQuestion` and uses `maths-complexity-*` IDs.

`computeComplexity` is identical to Number Bonds — same function body, different variable context.

### Maths main.js Edit 4 — wire up handlers

Same as Task 3 Edit 4. The input IDs are `maths-min`, `maths-max`, `maths-table`, `maths-negatives`, `maths-decimals`.

Check by reading `games/maths/js/main.js` to confirm the exact IDs and handler locations.

### Maths index.html

Add complexity row inside `#maths-custom-opts`, after the decimals row:

```html
        <div class="maths-complexity-row" id="maths-complexity-row">
          <span class="maths-complexity-badge" id="maths-complexity-badge">KS2</span>
          <span class="maths-complexity-ages" id="maths-complexity-ages">Ages 7–11</span>
          <span class="maths-complexity-example" id="maths-complexity-example">e.g. 12 + 7 = ?</span>
        </div>
```

### Maths style.css

Same CSS as Task 3 Edit 2 but with `.maths-complexity-*` class names.

### Step: Commit

```bash
git add games/maths/js/main.js games/maths/css/style.css games/maths/index.html
git commit -m "feat(maths): add live complexity indicator, swap results buttons on quit"
```

---

## Task 5: Smoke test + rebuild docs

### Run all tests

```bash
node --test games/number-bonds/tests/
```

Expected: 44/44 pass.

### Browser smoke test checklist

**Quit → Results button swap:**
- [ ] Number Bonds — finish a Round naturally: "Play again" is the large filled button
- [ ] Number Bonds — quit a Sprint mid-game: "Change settings" is the large filled button
- [ ] Maths — same two checks

**Complexity indicator:**
- [ ] Number Bonds — select Custom difficulty: complexity row appears
- [ ] Change Max from 100 to 5: badge changes from KS3 (orange) to Preschool (green)
- [ ] Enable Negative numbers: badge goes red "Challenge / Advanced"
- [ ] Change op to ×: example question updates to show multiplication format
- [ ] Select a preset difficulty (Easy/Medium/Hard): complexity row is hidden
- [ ] Maths — same checks

### Rebuild docs

```bash
bash build.sh
git add docs/
git commit -m "build: rebuild docs after UI improvements"
```
