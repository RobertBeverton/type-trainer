# Maths Game Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Maths game — a mental arithmetic drill where the player fills in the result of equations (e.g. `13 + 7 = ?`) by tapping one of four multiple-choice buttons.

**Architecture:** Direct port of Number Bonds with three targeted changes: (1) question generator always blanks the result instead of an operand, (2) `×`/`÷` distractors use factor-based steps to produce valid table products, (3) all IDs/keys scoped to `maths-` prefix. `game.js` (the session state machine) is copied verbatim — zero changes.

**Tech Stack:** Vanilla JS ES modules, Node built-in test runner (`node:test`), CSS design tokens from `shared/tokens.css`.

---

## Reference files (read before starting)

- `docs/plans/2026-03-24-maths-design.md` — approved design doc
- `games/number-bonds/js/questions.js` — arithmetic generation to port
- `games/number-bonds/js/game.js` — copy verbatim
- `games/number-bonds/js/main.js` — wiring to port
- `games/number-bonds/index.html` — HTML structure to port
- `games/number-bonds/css/style.css` — styles to port
- `games/number-bonds/tests/questions.test.js` — test style to follow

---

## Task 1: Create directory structure and test scaffold

**Files:**
- Create: `games/maths/js/` (directory)
- Create: `games/maths/css/` (directory)
- Create: `games/maths/tests/` (directory)
- Create: `games/maths/tests/package.json`
- Create: `games/maths/tests/questions.test.js`

### Step 1: Create directories

```bash
mkdir -p games/maths/js games/maths/css games/maths/tests
```

### Step 2: Create `games/maths/tests/package.json`

```json
{ "type": "module" }
```

### Step 3: Write `games/maths/tests/questions.test.js`

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion, generateDistractors } from '../js/questions.js';

const base = { min: 1, max: 10, maxTable: 10, negatives: false, decimals: false };

// --- generateQuestion: answer is always result ---

describe('generateQuestion — answer is always result', () => {
  for (const op of ['+', '-', '*', '/']) {
    it(`answer === result for ${op}`, () => {
      for (let i = 0; i < 50; i++) {
        const q = generateQuestion(op, base);
        assert.equal(q.answer, q.result, `answer should equal result for op ${op}`);
      }
    });
  }

  it('answer === result for mixed', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateQuestion('mixed', base);
      assert.equal(q.answer, q.result);
    }
  });
});

// --- generateQuestion: required fields ---

describe('generateQuestion — shape', () => {
  it('returns required fields: left, op, right, result, answer', () => {
    const q = generateQuestion('+', base);
    for (const field of ['left', 'op', 'right', 'result', 'answer']) {
      assert.ok(field in q, `missing field: ${field}`);
    }
  });
});

// --- generateQuestion: arithmetic correctness ---

describe('generateQuestion — addition', () => {
  it('result equals left + right', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('+', base);
      assert.equal(q.result, q.left + q.right);
    }
  });

  it('operands within min/max range', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('+', base);
      assert.ok(q.left >= 1 && q.left <= 10);
      assert.ok(q.right >= 1 && q.right <= 10);
    }
  });
});

describe('generateQuestion — subtraction', () => {
  it('result equals left - right', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('-', base);
      assert.equal(q.result, q.left - q.right);
    }
  });

  it('result >= 0 when negatives disabled', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateQuestion('-', base);
      assert.ok(q.result >= 0, `result ${q.result} should not be negative`);
    }
  });
});

describe('generateQuestion — multiplication', () => {
  it('result equals left * right', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('*', base);
      assert.equal(q.result, q.left * q.right);
    }
  });

  it('operands within 1..maxTable', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('*', { ...base, maxTable: 5 });
      assert.ok(q.left >= 1 && q.left <= 5);
      assert.ok(q.right >= 1 && q.right <= 5);
    }
  });
});

describe('generateQuestion — division', () => {
  it('result equals left / right (integer)', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('/', base);
      assert.equal(q.left / q.right, q.result);
      assert.equal(q.left % q.right, 0, 'should divide evenly');
    }
  });

  it('right operand is never 0', () => {
    for (let i = 0; i < 50; i++) {
      assert.ok(generateQuestion('/', base).right !== 0);
    }
  });
});

describe('generateQuestion — mixed', () => {
  it('uses all four operations over many calls', () => {
    const ops = new Set();
    for (let i = 0; i < 200; i++) ops.add(generateQuestion('mixed', base).op);
    assert.deepEqual([...ops].sort(), ['+', '-', '*', '/'].sort());
  });

  it('never returns "mixed" as resolved op', () => {
    for (let i = 0; i < 50; i++) {
      assert.notEqual(generateQuestion('mixed', base).op, 'mixed');
    }
  });
});

describe('generateQuestion — negatives', () => {
  const negSettings = { min: -10, max: 10, maxTable: 10, negatives: true, decimals: false };

  it('can produce negative results when negatives enabled', () => {
    const results = [];
    for (let i = 0; i < 100; i++) results.push(generateQuestion('-', negSettings).result);
    assert.ok(results.some(r => r < 0), 'should sometimes produce negative results');
  });
});

describe('generateQuestion — decimals', () => {
  const decSettings = { min: 1, max: 10, maxTable: 10, negatives: false, decimals: true };

  it('result has at most 1 decimal place for addition', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('+', decSettings);
      assert.ok(countDp(q.result) <= 1, `result ${q.result} should have ≤1dp`);
    }
  });

  it('produces non-integer results when decimals enabled', () => {
    const results = [];
    for (let i = 0; i < 100; i++) results.push(generateQuestion('+', decSettings).result);
    assert.ok(results.some(r => !Number.isInteger(r)),
      'at least one non-integer result should appear with decimals:true');
  });
});

// --- generateDistractors ---

describe('generateDistractors — basics', () => {
  it('returns exactly 3 distractors by default', () => {
    assert.equal(generateDistractors(20, '+', base).length, 3);
  });

  it('no distractor equals the correct answer', () => {
    for (let i = 0; i < 50; i++) {
      const answer = randInt(1, 20);
      const d = generateDistractors(answer, '+', base);
      assert.ok(!d.includes(answer), `distractor matched answer ${answer}`);
    }
  });

  it('no duplicate distractors', () => {
    for (let i = 0; i < 50; i++) {
      const d = generateDistractors(20, '+', base);
      assert.equal(new Set(d).size, d.length, 'duplicates found');
    }
  });

  it('distractors are numbers', () => {
    generateDistractors(20, '*', base).forEach(x => assert.equal(typeof x, 'number'));
  });

  it('decimal distractors have ≤1dp', () => {
    const dec = { ...base, decimals: true };
    for (let i = 0; i < 30; i++) {
      generateDistractors(3.5, '+', dec).forEach(x =>
        assert.ok(countDp(x) <= 1, `distractor ${x} has >1dp`)
      );
    }
  });
});

describe('generateDistractors — multiplication uses valid table products', () => {
  const settings = { min: 1, max: 144, maxTable: 12, negatives: false, decimals: false };

  it('does not produce ±1 neighbours for even×even result (parity test)', () => {
    // 7×8=56: 55 and 57 should never appear — they are not table products
    for (let i = 0; i < 100; i++) {
      const d = generateDistractors(56, '*', settings);
      assert.ok(!d.includes(55), '55 is not a table product and should not appear');
      assert.ok(!d.includes(57), '57 is not a table product and should not appear');
    }
  });

  it('all distractors are valid table products', () => {
    for (let i = 0; i < 50; i++) {
      const d = generateDistractors(56, '*', settings);
      d.forEach(x => {
        let isTableProduct = false;
        for (let a = 1; a <= settings.maxTable && !isTableProduct; a++) {
          const b = x / a;
          if (Number.isInteger(b) && b >= 1 && b <= settings.maxTable) isTableProduct = true;
        }
        assert.ok(isTableProduct, `distractor ${x} is not a valid table product within maxTable=${settings.maxTable}`);
      });
    }
  });
});

// --- Helpers ---

function countDp(n) {
  const s = n.toString();
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
```

### Step 4: Run tests — verify they fail

```bash
node --test games/maths/tests/questions.test.js
```

Expected: `Error: Cannot find module '../js/questions.js'` (or similar module-not-found error). This confirms the tests are wired up correctly before implementation exists.

---

## Task 2: Implement `games/maths/js/questions.js`

**Files:**
- Create: `games/maths/js/questions.js`

### Step 1: Write `games/maths/js/questions.js`

Key differences from `games/number-bonds/js/questions.js`:
- `generateQuestion` always returns `answer: result` (no `blank` field)
- `generateDistractors` for `*`/`/` uses factor-based steps instead of random offsets

```js
// questions.js — Maths game question and distractor generation

/**
 * Generate a single question. The result is always the blank (answer).
 * @param {string} op  '+' | '-' | '*' | '/' | 'mixed'
 * @param {object} settings  { min, max, maxTable, negatives, decimals }
 * @returns {{ left, op, right, result, answer }}
 */
export function generateQuestion(op, settings) {
  const { min, max, maxTable, negatives, decimals } = settings;
  const resolvedOp = op === 'mixed'
    ? ['+', '-', '*', '/'][Math.floor(Math.random() * 4)]
    : op;

  let left, right, result;

  switch (resolvedOp) {
    case '+': {
      left = randInt(min, max);
      right = randInt(min, max);
      if (decimals) {
        left = round1dp(left + randInt(0, 9) / 10);
        right = round1dp(right + randInt(0, 9) / 10);
      }
      result = round1dp(left + right);
      break;
    }
    case '-': {
      if (negatives) {
        left = randInt(min, max);
        right = randInt(min, max);
      } else {
        const a = randInt(min, max);
        const b = randInt(min, max);
        left = Math.max(a, b);
        right = Math.min(a, b);
      }
      if (decimals) {
        left = round1dp(left + randInt(0, 9) / 10);
        right = round1dp(right + randInt(0, 9) / 10);
        if (!negatives && left < right) [left, right] = [right, left];
      }
      result = round1dp(left - right);
      break;
    }
    case '*': {
      left = randInt(1, maxTable);
      right = randInt(1, maxTable);
      result = left * right;
      break;
    }
    case '/': {
      right = randInt(1, maxTable);       // divisor
      result = randInt(1, maxTable);      // quotient
      left = right * result;              // dividend
      break;
    }
    default:
      throw new Error(`Unknown op: ${resolvedOp}`);
  }

  // The blank is always the result — this is the core difference from Number Bonds
  return { left, op: resolvedOp, right, result, answer: result };
}

/**
 * Generate wrong answer choices.
 * @param {number} answer  The correct answer (always the result)
 * @param {string} op
 * @param {object} settings  { min, max, maxTable, negatives, decimals }
 * @param {number} count  Default 3
 * @returns {number[]}
 */
export function generateDistractors(answer, op, settings, count = 3) {
  const { negatives, decimals, maxTable = 12 } = settings;
  const candidates = new Set();
  let attempts = 0;

  while (candidates.size < count && attempts < 200) {
    attempts++;
    let candidate;

    if (op === '*' || op === '/') {
      // Use factor-based steps: find divisors of answer within [2, maxTable],
      // then step by that factor. This keeps distractors as valid table products
      // and avoids parity tells (e.g. 55, 57 for answer 56).
      const factors = [];
      for (let f = 2; f <= maxTable; f++) {
        if (answer % f === 0) factors.push(f);
      }
      const step = factors.length > 0
        ? factors[Math.floor(Math.random() * factors.length)]
        : randInt(2, Math.max(2, Math.floor(maxTable / 2)));
      candidate = answer + step * (Math.random() < 0.5 ? 1 : -1);
    } else {
      // +/−: cluster near the result with a small offset
      const offset = randInt(1, 5) * (Math.random() < 0.5 ? 1 : -1);
      candidate = answer + offset;
    }

    if (decimals) candidate = round1dp(candidate);
    else candidate = Math.round(candidate);

    if (candidate === answer) continue;
    if (!negatives && candidate < 0) continue;
    if ((op === '*' || op === '/') && candidate <= 0) continue;
    if (candidates.has(candidate)) continue;

    candidates.add(candidate);
  }

  // Fallback: sequential offsets if we couldn't generate enough
  let fallback = 1;
  while (candidates.size < count) {
    const c = answer + fallback;
    if (c !== answer && !candidates.has(c)) candidates.add(c);
    fallback++;
  }

  return [...candidates];
}

// --- Helpers ---

function randInt(min, max) {
  if (min > max) [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round1dp(n) {
  return Math.round(n * 10) / 10;
}
```

### Step 2: Run tests — verify they pass

```bash
node --test games/maths/tests/questions.test.js
```

Expected: all tests pass (green). If any fail, debug before continuing.

### Step 3: Commit

```bash
git add games/maths/js/questions.js games/maths/tests/
git commit -m "feat(maths): add question generation and distractor logic with tests"
```

---

## Task 3: Copy `game.js`

**Files:**
- Create: `games/maths/js/game.js` (verbatim copy of number-bonds)

### Step 1: Copy the file

```bash
cp games/number-bonds/js/game.js games/maths/js/game.js
```

No changes. `GameSession` imports `generateQuestion` and `generateDistractors` from `./questions.js`, which our new file already exports under those exact names.

### Step 2: Verify the import path resolves

Open `games/maths/js/game.js` and confirm line 2 reads:

```js
import { generateQuestion, generateDistractors } from './questions.js';
```

This path is correct as-is for the maths game — no edit needed.

### Step 3: Commit

```bash
git add games/maths/js/game.js
git commit -m "feat(maths): add GameSession (verbatim copy from number-bonds)"
```

---

## Task 4: Create `games/maths/index.html`

**Files:**
- Modify: `games/maths/index.html` (replace placeholder)

Port `games/number-bonds/index.html` with these changes:

| Find | Replace |
|------|---------|
| `<title>Number Bonds</title>` | `<title>Maths</title>` |
| `data-page="number-bonds"` | `data-page="maths"` |
| `data-page-title="Number Bonds"` | `data-page-title="Maths"` |
| `id="nb-` (all occurrences) | `id="maths-` |
| `🔢` (logo emoji) | `🧮` |
| `Number Bonds` (h1 text) | `Maths` |
| `css/style.css` | `css/style.css` (unchanged) |
| `js/main.js` | `js/main.js` (unchanged) |

The full resulting file:

```html
<!DOCTYPE html>
<html lang="en" data-theme="colourful-light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Maths</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../shared/tokens.css">
<link rel="stylesheet" href="../../shared/shell.css">
<link rel="stylesheet" href="css/style.css">
</head>
<body data-page="maths" data-page-title="Maths">

<!-- Shell bar injected by build script -->

<div id="maths-app">

  <!-- SCREEN: Settings -->
  <div id="maths-settings" class="maths-screen maths-screen--settings">
    <div class="maths-settings-wrap">
      <div class="maths-logo">🧮</div>
      <h1 class="maths-title">Maths</h1>

      <!-- Operation -->
      <fieldset class="maths-fieldset">
        <legend class="maths-legend">Operation</legend>
        <div class="maths-toggle-row" id="maths-op-row">
          <button class="maths-toggle maths-toggle--active" data-op="+" aria-pressed="true">+</button>
          <button class="maths-toggle" data-op="-" aria-pressed="false">−</button>
          <button class="maths-toggle" data-op="*" aria-pressed="false">×</button>
          <button class="maths-toggle" data-op="/" aria-pressed="false">÷</button>
          <button class="maths-toggle" data-op="mixed" aria-pressed="false">Mixed</button>
        </div>
      </fieldset>

      <!-- Difficulty -->
      <fieldset class="maths-fieldset">
        <legend class="maths-legend">Difficulty</legend>
        <div class="maths-toggle-row" id="maths-diff-row">
          <button class="maths-toggle" data-diff="easy" aria-pressed="false">Easy</button>
          <button class="maths-toggle maths-toggle--active" data-diff="medium" aria-pressed="true">Medium</button>
          <button class="maths-toggle" data-diff="hard" aria-pressed="false">Hard</button>
          <button class="maths-toggle" data-diff="custom" aria-pressed="false">Custom</button>
        </div>
        <p class="maths-diff-hint" id="maths-diff-hint">Numbers 1–20, tables to 10</p>
      </fieldset>

      <!-- Custom options (hidden unless Custom selected) -->
      <div id="maths-custom-opts" class="maths-custom-opts" hidden>
        <div class="maths-custom-row">
          <label class="maths-label" for="maths-min">Min</label>
          <input id="maths-min" class="maths-input" type="number" value="-100" min="-9999" max="9999">
        </div>
        <div class="maths-custom-row">
          <label class="maths-label" for="maths-max">Max</label>
          <input id="maths-max" class="maths-input" type="number" value="100" min="-9999" max="9999">
        </div>
        <div class="maths-custom-row">
          <label class="maths-label" for="maths-table">Max table (×÷)</label>
          <input id="maths-table" class="maths-input" type="number" value="12" min="2" max="99">
        </div>
        <div class="maths-custom-row">
          <label class="maths-label">
            <input id="maths-negatives" type="checkbox"> Negative numbers
          </label>
        </div>
        <div class="maths-custom-row">
          <label class="maths-label">
            <input id="maths-decimals" type="checkbox"> Decimals (1dp)
          </label>
        </div>
      </div>

      <!-- Session Mode -->
      <fieldset class="maths-fieldset">
        <legend class="maths-legend">Mode</legend>
        <div class="maths-mode-row" id="maths-mode-row">
          <button class="maths-mode-btn maths-mode-btn--active" data-mode="sprint" aria-pressed="true">
            <span class="maths-mode-icon" aria-hidden="true">⏱</span>
            <span class="maths-mode-name">Sprint</span>
            <span class="maths-mode-desc">60 seconds</span>
          </button>
          <button class="maths-mode-btn" data-mode="round" aria-pressed="false">
            <span class="maths-mode-icon" aria-hidden="true">🎯</span>
            <span class="maths-mode-name">Round</span>
            <span class="maths-mode-desc">10 questions</span>
          </button>
          <button class="maths-mode-btn" data-mode="endless" aria-pressed="false">
            <span class="maths-mode-icon" aria-hidden="true">∞</span>
            <span class="maths-mode-name">Endless</span>
            <span class="maths-mode-desc">Keep going</span>
          </button>
        </div>
      </fieldset>

      <button id="maths-start-btn" class="maths-btn maths-btn--primary maths-btn--large">Let's go! 🚀</button>
    </div>
  </div>

  <!-- SCREEN: Game -->
  <div id="maths-game" class="maths-screen maths-screen--game" hidden>
    <div class="maths-hud">
      <span class="maths-hud-score">Score: <strong id="maths-score">0</strong></span>
      <span id="maths-hud-center" class="maths-hud-center"></span>
      <button id="maths-quit-btn" class="maths-btn maths-btn--ghost">Quit</button>
    </div>
    <div class="maths-game-body">
      <div class="maths-question-wrap">
        <div class="maths-question" id="maths-question" aria-live="polite" aria-atomic="true"></div>
      </div>
      <div class="maths-choices" id="maths-choices" role="group" aria-label="Answer choices"></div>
    </div>
  </div>

  <!-- SCREEN: Results -->
  <div id="maths-results" class="maths-screen maths-screen--results" hidden>
    <div class="maths-results-wrap">
      <div class="maths-results-icon" id="maths-results-icon">🎉</div>
      <h2 class="maths-results-title" id="maths-results-title">Well done!</h2>
      <div class="maths-stats" id="maths-stats"></div>
      <div class="maths-results-actions">
        <button id="maths-play-again-btn" class="maths-btn maths-btn--primary">Play again</button>
        <button id="maths-change-settings-btn" class="maths-btn maths-btn--secondary">Change settings</button>
      </div>
    </div>
  </div>

</div>

<script type="module" src="js/main.js"></script>
</body>
</html>
```

### Commit

```bash
git add games/maths/index.html
git commit -m "feat(maths): add game HTML structure"
```

---

## Task 5: Create `games/maths/css/style.css`

**Files:**
- Create: `games/maths/css/style.css`

Copy `games/number-bonds/css/style.css` then apply these replacements (all occurrences):

| Find | Replace |
|------|---------|
| `nb-` | `maths-` |
| `nbFloat` | `mathsFloat` |
| `var(--accent-tertiary)` | `var(--accent-primary)` |
| `var(--accent-secondary)` | `var(--accent-purple)` |

```bash
sed 's/nb-/maths-/g; s/nbFloat/mathsFloat/g; s/var(--accent-tertiary)/var(--accent-primary)/g; s/var(--accent-secondary)/var(--accent-purple)/g' \
  games/number-bonds/css/style.css > games/maths/css/style.css
```

**Verify:** Open the file and spot-check that no `nb-` strings remain and that the two `body::before`/`body::after` colour lines reference `--accent-primary` and `--accent-purple`.

### Commit

```bash
git add games/maths/css/style.css
git commit -m "feat(maths): add game styles (ported from number-bonds, maths accent colours)"
```

---

## Task 6: Create `games/maths/js/main.js`

**Files:**
- Create: `games/maths/js/main.js`

Port `games/number-bonds/js/main.js` with these changes:

**1. All `nb-` DOM ID references → `maths-`**

Every `document.getElementById('nb-...')` becomes `document.getElementById('maths-...')`.
Every `'nb-toggle'` class reference becomes `'maths-toggle'`, etc.
Find/replace `nb-` → `maths-` throughout the file is safe.

**2. Storage keys** — two occurrences:

```js
// Before (number-bonds):
window.KidsGames.loadGameData('numberbonds')
window.KidsGames.saveGameData('numberbonds', ...)
localStorage.getItem('nb_settings')
localStorage.setItem('nb_settings', ...)
localStorage.getItem(`nb_${key}`)
localStorage.setItem(`nb_${key}`, ...)

// After (maths):
window.KidsGames.loadGameData('maths')
window.KidsGames.saveGameData('maths', ...)
localStorage.getItem('maths_settings')
localStorage.setItem('maths_settings', ...)
localStorage.getItem(`maths_${key}`)
localStorage.setItem(`maths_${key}`, ...)
```

**3. `renderQuestion` — simplified to one render path**

Replace the `renderQuestion` function body entirely:

```js
// Number Bonds version (two paths based on blank position):
function renderQuestion(question, choiceNums) {
  const { left, op, right, result, blank } = question;
  const opStr = { '+': '+', '-': '−', '*': '×', '/': '÷' }[op] ?? op;
  const safeLeft = Number(left);
  const safeRight = Number(right);
  const safeResult = Number(result);
  let html;
  if (blank === 'left') {
    html = `<span class="nb-blank">?</span> ${opStr} ${safeRight} = ${safeResult}`;
  } else {
    html = `${safeLeft} ${opStr} <span class="nb-blank">?</span> = ${safeResult}`;
  }
  const hasLargeNum = [safeLeft, safeRight, safeResult].some(n => Math.abs(n) >= 100);
  const qEl = document.getElementById('nb-question');
  qEl.innerHTML = html;
  qEl.classList.toggle('nb-question--long', hasLargeNum);
  // choices rendering ...
}

// Maths version (always result blank):
function renderQuestion(question, choiceNums) {
  const { left, op, right, result } = question;
  const opStr = { '+': '+', '-': '−', '*': '×', '/': '÷' }[op] ?? op;
  const safeLeft = Number(left);
  const safeRight = Number(right);
  const safeResult = Number(result);
  const html = `${safeLeft} ${opStr} ${safeRight} = <span class="maths-blank">?</span>`;
  const hasLargeNum = [safeLeft, safeRight, safeResult].some(n => Math.abs(n) >= 100);
  const qEl = document.getElementById('maths-question');
  qEl.innerHTML = html;
  qEl.classList.toggle('maths-question--long', hasLargeNum);

  const choicesEl = document.getElementById('maths-choices');
  choicesEl.innerHTML = '';
  choiceNums.forEach(num => {
    const btn = document.createElement('button');
    btn.className = 'maths-choice';
    btn.textContent = num;
    btn.setAttribute('aria-label', `Answer: ${num}`);
    btn.addEventListener('click', () => activeSession?.answer(num));
    choicesEl.appendChild(btn);
  });
}
```

**4. `renderAnswerFeedback`** — update class names and ID:

```js
function renderAnswerFeedback({ correct, correctAnswer, chosen }) {
  document.getElementById('maths-choices')?.querySelectorAll('.maths-choice').forEach(btn => {
    btn.disabled = true;
    const num = Number(btn.textContent);
    if (num === correctAnswer) btn.classList.add('maths-choice--reveal');
    if (num === chosen && !correct) btn.classList.add('maths-choice--wrong');
    if (num === chosen && correct) btn.classList.add('maths-choice--correct');
  });
}
```

Everything else in `main.js` is a mechanical `nb-` → `maths-` rename.

### Commit

```bash
git add games/maths/js/main.js
git commit -m "feat(maths): add main.js — settings, game, and results wiring"
```

---

## Task 7: Update hub card

**Files:**
- Modify: `hub.html` (lines ~282–289)

The Maths card currently shows "Coming Soon". Change the play button text and update the description to match the game's actual mechanic.

### Step 1: Edit `hub.html`

Find the Maths card block (search for `class="game-card maths"`):

```html
<!-- Before -->
<a href="maths.html" class="game-card maths">
  <span class="game-icon">🧮</span>
  <div class="game-title">Maths</div>
  <div class="game-desc">Answer + − × ÷ questions as fast as you can!</div>
  <div class="game-badge">Ages 5–10</div>
  <div class="device-badge any-device">📱 Works on any device</div>
  <span class="play-btn">Coming Soon</span>
</a>

<!-- After -->
<a href="maths.html" class="game-card maths">
  <span class="game-icon">🧮</span>
  <div class="game-title">Maths</div>
  <div class="game-desc">Work out the answer — tap the right number as fast as you can!</div>
  <div class="game-badge">Ages 5–10</div>
  <div class="device-badge any-device">📱 Works on any device</div>
  <span class="play-btn">Play</span>
</a>
```

The only required change is `Coming Soon` → `Play`. The description update is recommended but optional.

### Step 2: Commit

```bash
git add hub.html
git commit -m "feat(hub): launch Maths — update card description and play button"
```

---

## Task 8: Smoke test and rebuild docs

### Step 1: Open in browser

Open `games/maths/index.html` directly in a browser (or via local server). Check:

- [ ] Settings screen renders with all controls
- [ ] "Let's go!" starts the game
- [ ] Questions always show `left op right = ?` format
- [ ] All four operations work
- [ ] Correct answer flashes green, wrong flashes red with correct revealed
- [ ] Sprint mode timer counts down and ends
- [ ] Round mode shows `1 / 10` counter, ends after 10 questions
- [ ] Endless mode shows Quit button, ends on Quit
- [ ] Results screen shows score, accuracy, streak
- [ ] "Play again" restarts, "Change settings" returns to settings screen
- [ ] Custom difficulty expands/collapses correctly
- [ ] Works on mobile viewport (browser DevTools device mode)

### Step 2: Rebuild docs

```bash
bash build.sh
```

Expected: build completes without errors. The built `maths.html` shell page should exist.

### Step 3: Verify hub card in browser

Open `hub.html` in a browser and confirm:
- [ ] Maths card shows "Play" (not "Coming Soon")
- [ ] Clicking the card navigates to the game correctly

### Step 4: Final commit

```bash
git add -A
git commit -m "build: rebuild docs with Maths game"
```
