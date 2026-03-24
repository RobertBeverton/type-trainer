# Number Bonds Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Number Bonds game — a mental maths drill with tap-to-answer, four operations (+−×÷), three session modes (Sprint/Round/Endless), and custom difficulty ranges including negatives and decimals.

**Architecture:** Separate JS files (questions.js, game.js, main.js) following the type-trainer pattern. The build script is extended to inline them into docs/number-bonds.html. The question generation module is unit-tested with Node's built-in test runner before any UI work begins.

**Tech Stack:** Vanilla JS (ES modules in dev, concatenated for build), HTML/CSS using shared design tokens, Node 20 built-in test runner (`node --test`) for logic tests, `bash build.sh` for production build.

---

## How the build works (read this first)

`build.sh` already has a `build_simple_game` call for number-bonds that injects the shell bar but does **no JS processing**. We will replace that with a dedicated build section (Task 14) that concatenates `questions.js + game.js + main.js` — stripping `import`/`export` — and inlines everything into `docs/number-bonds.html`.

In dev, open `games/number-bonds/index.html` directly in a browser. The shell bar won't render (needs the build), but the game itself will work via `<script type="module">`.

---

## Task 1: Scaffold

**Files:**
- Create: `games/number-bonds/css/style.css`
- Create: `games/number-bonds/js/questions.js`
- Create: `games/number-bonds/js/game.js`
- Create: `games/number-bonds/js/main.js`
- Create: `games/number-bonds/tests/package.json`
- Create: `games/number-bonds/tests/questions.test.js`
- Modify: `games/number-bonds/index.html`

**Step 1: Create directories**

```bash
mkdir -p games/number-bonds/css games/number-bonds/js games/number-bonds/tests
```

**Step 2: Create tests/package.json**

```json
{ "type": "module" }
```

**Step 3: Create placeholder files**

`games/number-bonds/css/style.css` — empty for now.

`games/number-bonds/js/questions.js`:
```js
// questions.js — Number generation and question assembly
```

`games/number-bonds/js/game.js`:
```js
// game.js — Game state machine and session logic
```

`games/number-bonds/js/main.js`:
```js
// main.js — Entry point, wires shell + game together
```

`games/number-bonds/tests/questions.test.js`:
```js
// questions.test.js — Unit tests for question generation
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
```

**Step 4: Update index.html to use module scripts**

Replace the entire content of `games/number-bonds/index.html` with:

```html
<!DOCTYPE html>
<html lang="en" data-theme="colourful-light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Number Bonds</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../shared/tokens.css">
<link rel="stylesheet" href="../../shared/shell.css">
<link rel="stylesheet" href="css/style.css">
</head>
<body data-page="number-bonds" data-page-title="Number Bonds">

<!-- Shell bar injected by build script -->

<div id="nb-app">
  <!-- Screens injected here by JS -->
</div>

<script type="module" src="js/main.js"></script>
</body>
</html>
```

**Step 5: Commit**

```bash
git add games/number-bonds/
git commit -m "feat(number-bonds): scaffold file structure"
```

---

## Task 2: questions.js — addition and subtraction

**Files:**
- Modify: `games/number-bonds/js/questions.js`
- Modify: `games/number-bonds/tests/questions.test.js`

**Step 1: Write the failing tests**

`games/number-bonds/tests/questions.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from '../js/questions.js';

const baseSettings = { min: 1, max: 10, maxTable: 10, negatives: false, decimals: false };

describe('generateQuestion — addition', () => {
  it('returns an object with required fields', () => {
    const q = generateQuestion('+', baseSettings);
    assert.ok('left' in q && 'right' in q && 'result' in q && 'blank' in q && 'answer' in q && 'op' in q);
  });

  it('result equals left + right', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('+', baseSettings);
      assert.equal(q.result, q.left + q.right);
    }
  });

  it('blank is left or right', () => {
    const blanks = new Set();
    for (let i = 0; i < 50; i++) {
      blanks.add(generateQuestion('+', baseSettings).blank);
    }
    assert.ok(blanks.has('left') && blanks.has('right'), 'both blank positions should appear');
  });

  it('answer matches blank position', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('+', baseSettings);
      const expected = q.blank === 'left' ? q.left : q.right;
      assert.equal(q.answer, expected);
    }
  });

  it('operands within min/max range', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('+', baseSettings);
      assert.ok(q.left >= 1 && q.left <= 10);
      assert.ok(q.right >= 1 && q.right <= 10);
    }
  });
});

describe('generateQuestion — subtraction', () => {
  it('result equals left - right', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('-', baseSettings);
      assert.equal(q.result, q.left - q.right);
    }
  });

  it('result >= 0 when negatives disabled', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateQuestion('-', baseSettings);
      assert.ok(q.result >= 0, `result ${q.result} should not be negative`);
    }
  });

  it('left >= right when negatives disabled', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('-', baseSettings);
      assert.ok(q.left >= q.right);
    }
  });
});
```

**Step 2: Run tests — verify they fail**

```bash
node --test games/number-bonds/tests/questions.test.js
```

Expected: errors about `generateQuestion` not being exported.

**Step 3: Implement questions.js — addition and subtraction**

```js
// questions.js — Number generation and question assembly

/**
 * Generate a single question.
 * @param {string} op  '+' | '-' | '*' | '/' | 'mixed'
 * @param {object} settings  { min, max, maxTable, negatives, decimals }
 * @returns {{ left, op, right, result, blank: 'left'|'right', answer }}
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
      result = left + right;
      break;
    }
    case '-': {
      if (negatives) {
        left = randInt(min, max);
        right = randInt(min, max);
      } else {
        // Ensure left >= right so result >= 0
        const a = randInt(min, max);
        const b = randInt(min, max);
        left = Math.max(a, b);
        right = Math.min(a, b);
      }
      result = left - right;
      break;
    }
    case '*': {
      left = randInt(1, maxTable);
      right = randInt(1, maxTable);
      result = left * right;
      break;
    }
    case '/': {
      // Always generates a clean integer result
      right = randInt(1, maxTable);       // divisor (never 0)
      result = randInt(1, maxTable);      // quotient
      left = right * result;              // dividend
      break;
    }
    default:
      throw new Error(`Unknown op: ${resolvedOp}`);
  }

  const blank = Math.random() < 0.5 ? 'left' : 'right';
  const answer = blank === 'left' ? left : right;

  return { left, op: resolvedOp, right, result, blank, answer };
}

// --- Helpers ---

function randInt(min, max) {
  if (min > max) [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
```

**Step 4: Run tests — verify they pass**

```bash
node --test games/number-bonds/tests/questions.test.js
```

Expected: all tests pass.

**Step 5: Commit**

```bash
git add games/number-bonds/js/questions.js games/number-bonds/tests/
git commit -m "feat(number-bonds): question generation for + and -"
```

---

## Task 3: questions.js — multiplication and division

**Files:**
- Modify: `games/number-bonds/js/questions.js`
- Modify: `games/number-bonds/tests/questions.test.js`

**Step 1: Add failing tests**

Append to `questions.test.js`:

```js
describe('generateQuestion — multiplication', () => {
  it('result equals left * right', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('*', baseSettings);
      assert.equal(q.result, q.left * q.right);
    }
  });

  it('operands within 1..maxTable', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('*', { ...baseSettings, maxTable: 5 });
      assert.ok(q.left >= 1 && q.left <= 5);
      assert.ok(q.right >= 1 && q.right <= 5);
    }
  });
});

describe('generateQuestion — division', () => {
  it('result equals left / right (integer)', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('/', baseSettings);
      assert.equal(q.left / q.right, q.result);
      assert.equal(q.left % q.right, 0, 'should divide evenly');
    }
  });

  it('right operand is never 0', () => {
    for (let i = 0; i < 50; i++) {
      assert.ok(generateQuestion('/', baseSettings).right !== 0);
    }
  });
});

describe('generateQuestion — mixed', () => {
  it('uses all four operations over many calls', () => {
    const ops = new Set();
    for (let i = 0; i < 200; i++) ops.add(generateQuestion('mixed', baseSettings).op);
    assert.deepEqual([...ops].sort(), ['+', '-', '*', '/'].sort());
  });
});
```

**Step 2: Run tests — verify new tests fail, old tests still pass**

```bash
node --test games/number-bonds/tests/questions.test.js
```

Expected: multiplication/division/mixed tests fail (op not yet implemented — they are actually implemented in Task 2, so they should pass). If all pass already, the implementation is already correct. Continue.

**Step 3: Run tests — verify all pass**

```bash
node --test games/number-bonds/tests/questions.test.js
```

Expected: all tests pass (the switch statement already covers *, /).

**Step 4: Commit**

```bash
git add games/number-bonds/tests/questions.test.js
git commit -m "test(number-bonds): add * / and mixed question tests"
```

---

## Task 4: questions.js — negatives and decimals

**Files:**
- Modify: `games/number-bonds/js/questions.js`
- Modify: `games/number-bonds/tests/questions.test.js`

**Step 1: Write failing tests**

Append to `questions.test.js`:

```js
describe('generateQuestion — negatives', () => {
  const negSettings = { min: -10, max: 10, maxTable: 10, negatives: true, decimals: false };

  it('can produce negative operands', () => {
    const lefts = new Set();
    for (let i = 0; i < 100; i++) lefts.add(Math.sign(generateQuestion('-', negSettings).left));
    assert.ok(lefts.has(-1), 'should produce negative left operands');
  });

  it('can produce negative results', () => {
    const results = [];
    for (let i = 0; i < 100; i++) results.push(generateQuestion('-', negSettings).result);
    assert.ok(results.some(r => r < 0), 'should sometimes produce negative results');
  });
});

describe('generateQuestion — decimals', () => {
  const decSettings = { min: 1, max: 10, maxTable: 10, negatives: false, decimals: true };

  it('operands have at most 1 decimal place for addition', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('+', decSettings);
      assert.ok(countDp(q.left) <= 1, `left ${q.left} should have ≤1dp`);
      assert.ok(countDp(q.right) <= 1, `right ${q.right} should have ≤1dp`);
    }
  });

  it('result has at most 1 decimal place for addition', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('+', decSettings);
      assert.ok(countDp(q.result) <= 1, `result ${q.result} should have ≤1dp`);
    }
  });
});

function countDp(n) {
  const s = n.toString();
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}
```

**Step 2: Run tests — verify decimal tests fail**

```bash
node --test games/number-bonds/tests/questions.test.js
```

Expected: decimal tests fail (decimals not yet handled).

**Step 3: Update generateQuestion to handle decimals**

In `questions.js`, update the `+` and `-` cases inside the `switch`:

```js
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
```

Add `round1dp` helper at the bottom of the file:

```js
function round1dp(n) {
  return Math.round(n * 10) / 10;
}
```

**Step 4: Run all tests**

```bash
node --test games/number-bonds/tests/questions.test.js
```

Expected: all tests pass.

**Step 5: Commit**

```bash
git add games/number-bonds/js/questions.js games/number-bonds/tests/questions.test.js
git commit -m "feat(number-bonds): negatives and decimals in question generation"
```

---

## Task 5: questions.js — distractor generation

**Files:**
- Modify: `games/number-bonds/js/questions.js`
- Modify: `games/number-bonds/tests/questions.test.js`

**Step 1: Write failing tests**

Append to `questions.test.js`:

```js
import { generateDistractors } from '../js/questions.js';

describe('generateDistractors', () => {
  it('returns exactly 3 distractors by default', () => {
    const d = generateDistractors(7, '+', baseSettings);
    assert.equal(d.length, 3);
  });

  it('no distractor equals the correct answer', () => {
    for (let i = 0; i < 50; i++) {
      const answer = randIntTest(1, 20);
      const d = generateDistractors(answer, '+', baseSettings);
      assert.ok(!d.includes(answer), `distractor matched correct answer ${answer}`);
    }
  });

  it('no duplicate distractors', () => {
    for (let i = 0; i < 50; i++) {
      const d = generateDistractors(5, '+', baseSettings);
      assert.equal(new Set(d).size, d.length, 'duplicates found');
    }
  });

  it('distractors are numbers', () => {
    const d = generateDistractors(7, '*', baseSettings);
    d.forEach(x => assert.equal(typeof x, 'number'));
  });

  it('decimal distractors have ≤1dp', () => {
    const decSettings = { min: 1, max: 10, maxTable: 10, negatives: false, decimals: true };
    for (let i = 0; i < 30; i++) {
      const d = generateDistractors(3.5, '+', decSettings);
      d.forEach(x => assert.ok(countDp(x) <= 1));
    }
  });
});

function randIntTest(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
```

**Step 2: Run tests — verify they fail**

```bash
node --test games/number-bonds/tests/questions.test.js
```

Expected: distractor tests fail (not exported yet).

**Step 3: Implement generateDistractors**

Add to `questions.js`:

```js
/**
 * Generate wrong answer choices.
 * @param {number} answer  The correct answer
 * @param {string} op  The operation ('+' | '-' | '*' | '/')
 * @param {object} settings  { min, max, maxTable, negatives, decimals }
 * @param {number} count  Number of distractors to return (default 3)
 * @returns {number[]}
 */
export function generateDistractors(answer, op, settings, count = 3) {
  const { negatives, decimals } = settings;
  const candidates = new Set();
  let attempts = 0;

  while (candidates.size < count && attempts < 200) {
    attempts++;
    let candidate;

    if (op === '*' || op === '/') {
      // Use nearby multiplication facts
      const offset = randInt(1, 4) * (Math.random() < 0.5 ? 1 : -1);
      candidate = answer + offset * randInt(1, settings.maxTable);
    } else {
      // Offset by a small amount
      const offset = randInt(1, 5) * (Math.random() < 0.5 ? 1 : -1);
      candidate = answer + offset;
    }

    if (decimals) candidate = round1dp(candidate);
    else candidate = Math.round(candidate);

    if (candidate === answer) continue;
    if (!negatives && candidate < 0) continue;
    if (candidates.has(candidate)) continue;

    candidates.add(candidate);
  }

  // Fallback: if we couldn't generate enough, use sequential offsets
  let fallback = 1;
  while (candidates.size < count) {
    const c = answer + fallback;
    if (c !== answer && !candidates.has(c)) candidates.add(c);
    fallback++;
  }

  return [...candidates];
}
```

**Step 4: Run all tests**

```bash
node --test games/number-bonds/tests/questions.test.js
```

Expected: all tests pass.

**Step 5: Commit**

```bash
git add games/number-bonds/js/questions.js games/number-bonds/tests/questions.test.js
git commit -m "feat(number-bonds): distractor generation"
```

---

## Task 6: Settings screen — HTML and CSS

**Files:**
- Modify: `games/number-bonds/index.html`
- Modify: `games/number-bonds/css/style.css`

**Step 1: Write the Settings screen HTML**

Replace `<div id="nb-app">` content in `index.html` with:

```html
<div id="nb-app">

  <!-- SCREEN: Settings -->
  <div id="nb-settings" class="nb-screen nb-screen--settings">
    <div class="nb-settings-wrap">
      <div class="nb-logo">🔢</div>
      <h1 class="nb-title">Number Bonds</h1>

      <!-- Operation -->
      <fieldset class="nb-fieldset">
        <legend class="nb-legend">Operation</legend>
        <div class="nb-toggle-row" id="nb-op-row" role="group" aria-label="Operation">
          <button class="nb-toggle nb-toggle--active" data-op="+" aria-pressed="true">+</button>
          <button class="nb-toggle" data-op="-" aria-pressed="false">−</button>
          <button class="nb-toggle" data-op="*" aria-pressed="false">×</button>
          <button class="nb-toggle" data-op="/" aria-pressed="false">÷</button>
          <button class="nb-toggle" data-op="mixed" aria-pressed="false">Mixed</button>
        </div>
      </fieldset>

      <!-- Difficulty -->
      <fieldset class="nb-fieldset">
        <legend class="nb-legend">Difficulty</legend>
        <div class="nb-toggle-row" id="nb-diff-row" role="group" aria-label="Difficulty">
          <button class="nb-toggle" data-diff="easy" aria-pressed="false">Easy</button>
          <button class="nb-toggle nb-toggle--active" data-diff="medium" aria-pressed="true">Medium</button>
          <button class="nb-toggle" data-diff="hard" aria-pressed="false">Hard</button>
          <button class="nb-toggle" data-diff="custom" aria-pressed="false">Custom</button>
        </div>
        <p class="nb-diff-hint" id="nb-diff-hint">Numbers 1–20, tables to 10</p>
      </fieldset>

      <!-- Custom options (hidden unless Custom selected) -->
      <div id="nb-custom-opts" class="nb-custom-opts" hidden>
        <div class="nb-custom-row">
          <label class="nb-label" for="nb-min">Min</label>
          <input id="nb-min" class="nb-input" type="number" value="-100" min="-9999" max="9999">
        </div>
        <div class="nb-custom-row">
          <label class="nb-label" for="nb-max">Max</label>
          <input id="nb-max" class="nb-input" type="number" value="100" min="-9999" max="9999">
        </div>
        <div class="nb-custom-row">
          <label class="nb-label" for="nb-table">Max table (×÷)</label>
          <input id="nb-table" class="nb-input" type="number" value="12" min="2" max="99">
        </div>
        <div class="nb-custom-row">
          <label class="nb-label">
            <input id="nb-negatives" type="checkbox"> Negative numbers
          </label>
        </div>
        <div class="nb-custom-row">
          <label class="nb-label">
            <input id="nb-decimals" type="checkbox"> Decimals (1dp)
          </label>
        </div>
      </div>

      <!-- Session Mode -->
      <fieldset class="nb-fieldset">
        <legend class="nb-legend">Mode</legend>
        <div class="nb-mode-row" id="nb-mode-row" role="group" aria-label="Session mode">
          <button class="nb-mode-btn nb-mode-btn--active" data-mode="sprint" aria-pressed="true">
            <span class="nb-mode-icon">⏱</span>
            <span class="nb-mode-name">Sprint</span>
            <span class="nb-mode-desc">60 seconds</span>
          </button>
          <button class="nb-mode-btn" data-mode="round" aria-pressed="false">
            <span class="nb-mode-icon">🎯</span>
            <span class="nb-mode-name">Round</span>
            <span class="nb-mode-desc">10 questions</span>
          </button>
          <button class="nb-mode-btn" data-mode="endless" aria-pressed="false">
            <span class="nb-mode-icon">∞</span>
            <span class="nb-mode-name">Endless</span>
            <span class="nb-mode-desc">Keep going</span>
          </button>
        </div>
      </fieldset>

      <button id="nb-start-btn" class="nb-btn nb-btn--primary nb-btn--large">Let's go! 🚀</button>
    </div>
  </div>

  <!-- SCREEN: Game -->
  <div id="nb-game" class="nb-screen nb-screen--game" hidden>
    <div class="nb-hud">
      <span class="nb-hud-score">Score: <strong id="nb-score">0</strong></span>
      <span id="nb-hud-center" class="nb-hud-center"></span>
      <button id="nb-quit-btn" class="nb-btn nb-btn--ghost">Quit</button>
    </div>
    <div class="nb-question-wrap">
      <div class="nb-question" id="nb-question" aria-live="polite" aria-atomic="true"></div>
    </div>
    <div class="nb-choices" id="nb-choices" role="group" aria-label="Answer choices"></div>
  </div>

  <!-- SCREEN: Results -->
  <div id="nb-results" class="nb-screen nb-screen--results" hidden>
    <div class="nb-results-wrap">
      <div class="nb-results-icon" id="nb-results-icon">🎉</div>
      <h2 class="nb-results-title" id="nb-results-title">Well done!</h2>
      <div class="nb-stats" id="nb-stats"></div>
      <div class="nb-results-actions">
        <button id="nb-play-again-btn" class="nb-btn nb-btn--primary">Play again</button>
        <button id="nb-change-settings-btn" class="nb-btn nb-btn--secondary">Change settings</button>
      </div>
    </div>
  </div>

</div>
```

**Step 2: Write style.css**

```css
/* Number Bonds — game styles */

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
  animation: nbFloat 8s ease-in-out infinite;
}
body::before { width: 300px; height: 300px; background: var(--accent-tertiary); top: -80px; right: -80px; }
body::after  { width: 250px; height: 250px; background: var(--accent-secondary); bottom: -60px; left: -60px; animation-delay: -4s; }

@keyframes nbFloat {
  0%,100% { transform: translate(0,0) scale(1); }
  50% { transform: translate(15px,20px) scale(1.05); }
}

/* === Screens === */

#nb-app {
  position: relative;
  z-index: 1;
}

.nb-screen {
  min-height: calc(100vh - 56px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 16px 48px;
}

.nb-screen[hidden] { display: none !important; }

/* === Settings Screen === */

.nb-settings-wrap {
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.nb-logo {
  font-size: 4rem;
  text-align: center;
  animation: nbBounce 0.6s ease-out;
}

@keyframes nbBounce {
  0% { transform: scale(0.5); opacity: 0; }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.nb-title {
  font-size: 2.4rem;
  font-weight: 900;
  text-align: center;
  background: linear-gradient(135deg, var(--accent-tertiary), var(--accent-primary), var(--accent-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Fieldsets */
.nb-fieldset {
  border: none;
  padding: 0;
}

.nb-legend {
  font-size: var(--text-sm);
  font-weight: 800;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-sm);
  display: block;
}

/* Operation + Difficulty toggles */
.nb-toggle-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.nb-toggle {
  flex: 1;
  min-width: 56px;
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
}

.nb-toggle:hover {
  border-color: var(--hud-accent);
  color: var(--hud-accent);
}

.nb-toggle--active {
  background: var(--hud-accent);
  border-color: var(--hud-accent);
  color: var(--bg-surface);
}

.nb-diff-hint {
  font-size: var(--text-sm);
  color: var(--text-muted);
  font-weight: 600;
  margin-top: var(--space-xs);
}

/* Custom options */
.nb-custom-opts {
  background: var(--bg-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  border: 1px solid var(--border);
}

.nb-custom-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.nb-label {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-primary);
  flex: 1;
}

.nb-input {
  width: 90px;
  padding: var(--space-xs) var(--space-sm);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  font-family: var(--font-family);
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text-primary);
  background: var(--bg);
  text-align: center;
}

.nb-input:focus {
  outline: none;
  border-color: var(--hud-accent);
}

/* Mode buttons */
.nb-mode-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}

.nb-mode-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-md) var(--space-sm);
  border: 2px solid var(--border);
  border-radius: var(--radius-xl);
  background: var(--bg-surface);
  cursor: pointer;
  font-family: var(--font-family);
  transition: all var(--transition-fast);
  min-height: 80px;
}

.nb-mode-btn:hover {
  border-color: var(--hud-accent);
}

.nb-mode-btn--active {
  background: var(--hud-accent);
  border-color: var(--hud-accent);
  color: var(--bg-surface);
}

.nb-mode-icon { font-size: 1.5rem; }
.nb-mode-name { font-size: var(--text-sm); font-weight: 800; }
.nb-mode-desc { font-size: var(--text-xs); opacity: 0.8; }

/* Buttons */
.nb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm) var(--space-xl);
  border-radius: var(--radius-xl);
  font-family: var(--font-family);
  font-size: var(--text-base);
  font-weight: 800;
  cursor: pointer;
  min-height: 48px;
  border: 2px solid transparent;
  transition: all var(--transition-fast);
}

.nb-btn--primary {
  background: linear-gradient(135deg, var(--accent-tertiary), var(--accent-primary));
  color: var(--bg-surface);
  border-color: var(--accent-primary);
  width: 100%;
}

.nb-btn--primary:hover { filter: brightness(1.05); }

.nb-btn--secondary {
  background: var(--bg-surface);
  color: var(--text-primary);
  border-color: var(--border);
}

.nb-btn--secondary:hover { background: var(--border); }

.nb-btn--ghost {
  background: none;
  color: var(--text-secondary);
  border-color: var(--border);
  font-size: var(--text-sm);
  padding: var(--space-xs) var(--space-md);
  min-height: 36px;
}

.nb-btn--large { font-size: var(--text-xl); min-height: 60px; }

/* === Game Screen === */

.nb-screen--game {
  flex-direction: column;
  padding: 0;
}

.nb-hud {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
  min-height: 48px;
  gap: var(--space-sm);
}

.nb-hud-score {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text-primary);
  min-width: 80px;
}

.nb-hud-center {
  font-size: var(--text-base);
  font-weight: 800;
  color: var(--hud-accent);
  text-align: center;
  flex: 1;
}

/* Question display */
.nb-question-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl) var(--space-lg);
}

.nb-question {
  font-size: clamp(2rem, 8vw, 4rem);
  font-weight: 900;
  color: var(--text-primary);
  text-align: center;
  line-height: 1.2;
}

.nb-question .nb-blank {
  display: inline-block;
  min-width: 2ch;
  padding: 0 8px;
  border-bottom: 4px solid var(--accent-primary);
  color: var(--accent-primary);
}

/* Answer choices */
.nb-choices {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
  padding: var(--space-md);
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  padding-bottom: var(--space-2xl);
}

.nb-choice {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
  font-size: clamp(1.2rem, 5vw, 2rem);
  font-weight: 900;
  border: 3px solid var(--border);
  border-radius: var(--radius-xl);
  background: var(--bg-surface);
  color: var(--text-primary);
  cursor: pointer;
  font-family: var(--font-family);
  transition: all var(--transition-fast);
  box-shadow: var(--shadow);
}

.nb-choice:hover:not(:disabled) {
  border-color: var(--hud-accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.nb-choice:active:not(:disabled) {
  transform: translateY(0);
}

.nb-choice--correct {
  background: var(--success-bg);
  border-color: var(--success-text);
  color: var(--success-text);
  animation: nbCorrect 0.4s ease-out;
}

.nb-choice--wrong {
  background: var(--error-bg);
  border-color: var(--error-text);
  color: var(--error-text);
  animation: nbWrong 0.4s ease-out;
}

.nb-choice--reveal {
  background: var(--success-bg);
  border-color: var(--success-text);
  color: var(--success-text);
}

@keyframes nbCorrect {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

@keyframes nbWrong {
  0%,100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

/* === Results Screen === */

.nb-results-wrap {
  width: 100%;
  max-width: 480px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  align-items: center;
}

.nb-results-icon {
  font-size: 5rem;
  animation: nbBounce 0.6s ease-out;
}

.nb-results-title {
  font-size: var(--text-3xl);
  font-weight: 900;
  color: var(--text-primary);
}

.nb-stats {
  background: var(--bg-surface);
  border-radius: var(--radius-2xl);
  padding: var(--space-xl);
  box-shadow: var(--shadow);
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.nb-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-base);
  font-weight: 700;
}

.nb-stat-label { color: var(--text-secondary); }
.nb-stat-value { font-size: var(--text-xl); font-weight: 900; color: var(--text-primary); }
.nb-stat-value--best { color: var(--accent-tertiary); }

.nb-results-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  width: 100%;
}

/* === Responsive === */

@media (max-width: 400px) {
  .nb-toggle { font-size: var(--text-base); }
  .nb-mode-row { grid-template-columns: 1fr; }
}

/* === Reduced motion === */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

**Step 3: Open in browser — verify Settings screen renders**

Open `games/number-bonds/index.html` in a browser. You should see the settings screen with all controls. The shell bar won't show in dev (it's injected at build time) — that's expected.

**Step 4: Commit**

```bash
git add games/number-bonds/index.html games/number-bonds/css/style.css
git commit -m "feat(number-bonds): settings, game, and results screen HTML + CSS"
```

---

## Task 7: main.js — Settings screen logic

**Files:**
- Modify: `games/number-bonds/js/main.js`

**Step 1: Write main.js — settings wiring**

```js
// main.js — Entry point, wires settings + game together
import { generateQuestion, generateDistractors } from './questions.js';
import { GameSession } from './game.js';

// --- Settings state ---
let settings = {
  op: '+',
  difficulty: 'medium',
  mode: 'sprint',
  custom: { min: 1, max: 100, maxTable: 12, negatives: false, decimals: false }
};

const DIFFICULTY_PRESETS = {
  easy:   { min: 1, max: 10,  maxTable: 5,  negatives: false, decimals: false, hint: 'Numbers 1–10, tables to 5' },
  medium: { min: 1, max: 20,  maxTable: 10, negatives: false, decimals: false, hint: 'Numbers 1–20, tables to 10' },
  hard:   { min: 1, max: 100, maxTable: 12, negatives: false, decimals: false, hint: 'Numbers 1–100, tables to 12' },
  custom: { hint: 'Your own settings' },
};

// --- DOM refs ---
const screens = {
  settings: document.getElementById('nb-settings'),
  game:     document.getElementById('nb-game'),
  results:  document.getElementById('nb-results'),
};

// --- Boot ---
loadSettings();
initSettingsScreen();
showScreen('settings');

// --- Initialise settings screen ---
function initSettingsScreen() {
  // Operation toggles
  document.getElementById('nb-op-row').addEventListener('click', e => {
    const btn = e.target.closest('[data-op]');
    if (!btn) return;
    settings.op = btn.dataset.op;
    updateToggles('nb-op-row', 'data-op', settings.op);
  });

  // Difficulty toggles
  document.getElementById('nb-diff-row').addEventListener('click', e => {
    const btn = e.target.closest('[data-diff]');
    if (!btn) return;
    settings.difficulty = btn.dataset.diff;
    updateToggles('nb-diff-row', 'data-diff', settings.difficulty);
    updateDifficultyHint();
    document.getElementById('nb-custom-opts').hidden = settings.difficulty !== 'custom';
  });

  // Mode buttons
  document.getElementById('nb-mode-row').addEventListener('click', e => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    settings.mode = btn.dataset.mode;
    updateModeButtons();
  });

  // Custom inputs
  document.getElementById('nb-min').addEventListener('change', e => {
    settings.custom.min = Number(e.target.value);
  });
  document.getElementById('nb-max').addEventListener('change', e => {
    settings.custom.max = Number(e.target.value);
  });
  document.getElementById('nb-table').addEventListener('change', e => {
    settings.custom.maxTable = Number(e.target.value);
  });
  document.getElementById('nb-negatives').addEventListener('change', e => {
    settings.custom.negatives = e.target.checked;
  });
  document.getElementById('nb-decimals').addEventListener('change', e => {
    settings.custom.decimals = e.target.checked;
  });

  // Start button
  document.getElementById('nb-start-btn').addEventListener('click', startGame);

  // Restore saved settings into UI
  applySettingsToUI();
}

function updateToggles(rowId, attr, activeVal) {
  document.getElementById(rowId).querySelectorAll(`[${attr}]`).forEach(btn => {
    const active = btn.dataset[attr.replace('data-', '')] === activeVal;
    btn.classList.toggle('nb-toggle--active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function updateModeButtons() {
  document.getElementById('nb-mode-row').querySelectorAll('[data-mode]').forEach(btn => {
    const active = btn.dataset.mode === settings.mode;
    btn.classList.toggle('nb-mode-btn--active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function updateDifficultyHint() {
  const preset = DIFFICULTY_PRESETS[settings.difficulty];
  document.getElementById('nb-diff-hint').textContent = preset.hint;
}

function applySettingsToUI() {
  updateToggles('nb-op-row', 'data-op', settings.op);
  updateToggles('nb-diff-row', 'data-diff', settings.difficulty);
  updateModeButtons();
  updateDifficultyHint();
  document.getElementById('nb-custom-opts').hidden = settings.difficulty !== 'custom';
  document.getElementById('nb-min').value = settings.custom.min;
  document.getElementById('nb-max').value = settings.custom.max;
  document.getElementById('nb-table').value = settings.custom.maxTable;
  document.getElementById('nb-negatives').checked = settings.custom.negatives;
  document.getElementById('nb-decimals').checked = settings.custom.decimals;
}

function getActiveRange() {
  if (settings.difficulty === 'custom') return settings.custom;
  const p = DIFFICULTY_PRESETS[settings.difficulty];
  return { min: p.min, max: p.max, maxTable: p.maxTable, negatives: p.negatives, decimals: p.decimals };
}

// --- Screen management ---
function showScreen(name) {
  Object.keys(screens).forEach(k => screens[k].hidden = k !== name);
}

// --- Persistence ---
function saveSettings() {
  try {
    if (window.KidsGames) {
      const d = window.KidsGames.loadGameData('numberbonds') || {};
      window.KidsGames.saveGameData('numberbonds', { ...d, settings });
    } else {
      localStorage.setItem('nb_settings', JSON.stringify(settings));
    }
  } catch (e) { /* ignore */ }
}

function loadSettings() {
  try {
    let saved;
    if (window.KidsGames) {
      const d = window.KidsGames.loadGameData('numberbonds');
      saved = d?.settings;
    } else {
      const raw = localStorage.getItem('nb_settings');
      saved = raw ? JSON.parse(raw) : null;
    }
    if (saved) {
      settings = { ...settings, ...saved };
      // Restore age bracket default on first visit if no saved difficulty
    }
  } catch (e) { /* ignore */ }
  applyAgeBracketDefault();
}

function applyAgeBracketDefault() {
  // Only if no settings have been saved yet
  try {
    const existing = window.KidsGames?.loadGameData('numberbonds');
    if (existing?.settings?.difficulty) return; // already set
    const bracket = window.KidsGames?.player?.ageBracket;
    if (bracket === '4-5') settings.difficulty = 'easy';
    else if (bracket === '9-12') settings.difficulty = 'hard';
    else settings.difficulty = 'medium';
  } catch (e) { /* ignore */ }
}

// --- Game start ---
let activeSession = null;

function startGame() {
  saveSettings();
  const range = getActiveRange();
  activeSession = new GameSession({
    op: settings.op,
    mode: settings.mode,
    range,
    onQuestion: renderQuestion,
    onScore: renderHud,
    onEnd: showResults,
  });
  showScreen('game');
  initGameScreen();
  activeSession.start();
}

function initGameScreen() {
  document.getElementById('nb-quit-btn').onclick = () => {
    activeSession?.end();
  };
}

// --- Question rendering ---
function renderQuestion(question, choiceNums) {
  // Render equation with blank
  const { left, op, right, result, blank } = question;
  const opStr = { '+': '+', '-': '−', '*': '×', '/': '÷' }[op];
  let html;
  if (blank === 'left') {
    html = `<span class="nb-blank">?</span> ${opStr} ${right} = ${result}`;
  } else {
    html = `${left} ${opStr} <span class="nb-blank">?</span> = ${result}`;
  }
  document.getElementById('nb-question').innerHTML = html;

  // Render choice buttons
  const choicesEl = document.getElementById('nb-choices');
  choicesEl.innerHTML = '';
  choiceNums.forEach(num => {
    const btn = document.createElement('button');
    btn.className = 'nb-choice';
    btn.textContent = num;
    btn.setAttribute('aria-label', `Answer: ${num}`);
    btn.addEventListener('click', () => activeSession?.answer(num));
    choicesEl.appendChild(btn);
  });
}

function renderHud(hudState) {
  document.getElementById('nb-score').textContent = hudState.score;
  const center = document.getElementById('nb-hud-center');
  if (hudState.mode === 'sprint') {
    center.textContent = `⏱ ${hudState.timeLeft}s`;
  } else if (hudState.mode === 'round') {
    center.textContent = `${hudState.questionNum} / ${hudState.totalQuestions}`;
  } else {
    center.textContent = '';
  }
}

// --- Results rendering ---
function showResults(stats) {
  document.getElementById('nb-results-icon').textContent = stats.score >= 80 ? '🏆' : stats.score >= 40 ? '⭐' : '💪';
  document.getElementById('nb-results-title').textContent =
    stats.score >= 80 ? 'Amazing!' : stats.score >= 40 ? 'Well done!' : 'Keep practising!';

  const isBest = savePersonalBest(stats);

  const statsEl = document.getElementById('nb-stats');
  statsEl.innerHTML = `
    <div class="nb-stat-row">
      <span class="nb-stat-label">Score</span>
      <span class="nb-stat-value${isBest ? ' nb-stat-value--best' : ''}">${stats.score}${isBest ? ' ★' : ''}</span>
    </div>
    <div class="nb-stat-row">
      <span class="nb-stat-label">Accuracy</span>
      <span class="nb-stat-value">${stats.accuracy}%</span>
    </div>
    <div class="nb-stat-row">
      <span class="nb-stat-label">Best streak</span>
      <span class="nb-stat-value">${stats.bestStreak}</span>
    </div>
    ${stats.timeTaken ? `<div class="nb-stat-row">
      <span class="nb-stat-label">Time</span>
      <span class="nb-stat-value">${stats.timeTaken}s</span>
    </div>` : ''}
  `;

  document.getElementById('nb-play-again-btn').onclick = startGame;
  document.getElementById('nb-change-settings-btn').onclick = () => showScreen('settings');
  showScreen('results');
}

function savePersonalBest(stats) {
  const key = `pb_${settings.op}_${settings.difficulty}_${settings.mode}`;
  try {
    const store = window.KidsGames ? window.KidsGames.loadGameData('numberbonds') || {} : {};
    const current = store[key] || 0;
    if (stats.score > current) {
      window.KidsGames
        ? window.KidsGames.saveGameData('numberbonds', { ...store, [key]: stats.score })
        : localStorage.setItem(`nb_${key}`, stats.score);
      return true;
    }
  } catch (e) { /* ignore */ }
  return false;
}

// --- Shell player change ---
if (window.KidsGames) {
  window.KidsGames.onPlayerChange(() => {
    loadSettings();
    applySettingsToUI();
  });
}
```

**Step 2: Open in browser — verify settings screen is interactive**

Click operation/difficulty/mode buttons. They should toggle visually. Click Custom — extra options should appear.

**Step 3: Commit**

```bash
git add games/number-bonds/js/main.js
git commit -m "feat(number-bonds): settings screen logic and persistence"
```

---

## Task 8: game.js — GameSession (Sprint, Round, Endless)

**Files:**
- Modify: `games/number-bonds/js/game.js`

**Step 1: Write game.js**

```js
// game.js — GameSession: manages one play session
import { generateQuestion, generateDistractors } from './questions.js';

const SPRINT_DURATION = 60;
const ROUND_QUESTIONS = 10;
const POINTS_CORRECT = 10;
const STREAK_BONUS = 2;
const ANSWER_PAUSE_MS = 600; // ms to show correct/wrong before next question

export class GameSession {
  constructor({ op, mode, range, onQuestion, onScore, onEnd }) {
    this.op = op;
    this.mode = mode;
    this.range = range;
    this.onQuestion = onQuestion;
    this.onScore = onScore;
    this.onEnd = onEnd;

    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.correct = 0;
    this.total = 0;
    this.questionNum = 0;
    this.timeLeft = SPRINT_DURATION;
    this.startTime = null;
    this._timer = null;
    this._active = false;
    this._currentQuestion = null;
    this._answerLocked = false;
  }

  start() {
    this._active = true;
    this.startTime = Date.now();
    if (this.mode === 'sprint') {
      this._startTimer();
    }
    this._nextQuestion();
  }

  answer(value) {
    if (!this._active || this._answerLocked) return;
    this._answerLocked = true;

    const q = this._currentQuestion;
    const isCorrect = value === q.answer;
    this.total++;

    // Notify UI to show feedback
    const choicesEl = document.getElementById('nb-choices');
    choicesEl?.querySelectorAll('.nb-choice').forEach(btn => {
      btn.disabled = true;
      const num = Number(btn.textContent);
      if (num === q.answer) btn.classList.add('nb-choice--reveal');
      if (num === value && !isCorrect) btn.classList.add('nb-choice--wrong');
      if (num === value && isCorrect) btn.classList.add('nb-choice--correct');
    });

    if (isCorrect) {
      this.correct++;
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
      this.score += POINTS_CORRECT + (this.streak - 1) * STREAK_BONUS;
    } else {
      this.streak = 0;
    }

    this.onScore(this._hudState());

    setTimeout(() => {
      if (!this._active) return;
      this._answerLocked = false;
      if (this.mode === 'round' && this.questionNum >= ROUND_QUESTIONS) {
        this.end();
      } else {
        this._nextQuestion();
      }
    }, ANSWER_PAUSE_MS);
  }

  end() {
    if (!this._active) return;
    this._active = false;
    clearInterval(this._timer);
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

  _nextQuestion() {
    this.questionNum++;
    const q = generateQuestion(this.op, this.range);
    this._currentQuestion = q;
    const distractors = generateDistractors(q.answer, q.op, this.range);
    const choices = shuffle([q.answer, ...distractors]);
    this.onQuestion(q, choices);
    this.onScore(this._hudState());
  }

  _hudState() {
    return {
      score: this.score,
      mode: this.mode,
      timeLeft: this.timeLeft,
      questionNum: this.questionNum,
      totalQuestions: ROUND_QUESTIONS,
    };
  }

  _startTimer() {
    this._timer = setInterval(() => {
      this.timeLeft--;
      this.onScore(this._hudState());
      if (this.timeLeft <= 0) {
        clearInterval(this._timer);
        this.end();
      }
    }, 1000);
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

**Step 2: Open game in browser and test all three modes**

Manual test checklist:
- [ ] Sprint: starts 60s timer, counts down, ends with results
- [ ] Round: shows 1/10, 2/10..., ends at 10/10
- [ ] Endless: no timer, Quit button shows results
- [ ] Correct answer: green flash, score increases
- [ ] Wrong answer: red shake, correct answer highlighted in green
- [ ] Results screen shows score, accuracy, streak, time

**Step 3: Commit**

```bash
git add games/number-bonds/js/game.js
git commit -m "feat(number-bonds): GameSession with Sprint, Round, and Endless modes"
```

---

## Task 9: build.sh — add number-bonds build section

**Files:**
- Modify: `build.sh`

**Step 1: Read the existing build_simple_game call for number-bonds**

The current call at line ~327:
```bash
build_simple_game "games/number-bonds/index.html"  "$DOCS_DIR/number-bonds.html"  "Number Bonds"
```

This needs to be replaced with a proper JS-inlining build section.

**Step 2: Add JS files array and build section**

In `build.sh`, after the `build_simple_game` function definition (around line 325), **replace** the `build_simple_game` call for number-bonds with:

```bash
# ==========================================================================
# BUILD 4: Number Bonds (inline CSS + JS into single HTML)
# ==========================================================================
echo ""
echo "--- Building Number Bonds ---"

NB_GAME_DIR="games/number-bonds"
NB_JS_FILES=(
  "js/questions.js"
  "js/game.js"
  "js/main.js"
)

NB_JS_TEMP=$(mktemp)
NB_CSS_TEMP=$(mktemp)
NB_JS_COMBINED=$(mktemp)
trap "rm -f '$NB_JS_TEMP' '$NB_CSS_TEMP' '$NB_JS_COMBINED'" EXIT

for f in "${NB_JS_FILES[@]}"; do
  echo "  Inlining $NB_GAME_DIR/$f"
  echo "// --- $(basename "$f") ---" >> "$NB_JS_TEMP"
  awk '
    /^import / || /^import\{/ {
      if ($0 ~ /;/) { next }
      while ((getline line) > 0) { if (line ~ /;/) break }
      next
    }
    /^export\s*\{\s*\}\s*;?\s*$/ { next }
    /^export default / { sub(/^export default /, ""); print; next }
    /^export / { sub(/^export /, ""); print; next }
    { print }
  ' "$NB_GAME_DIR/$f" >> "$NB_JS_TEMP"
  echo "" >> "$NB_JS_TEMP"
done

cat shared/tokens.css shared/shell.css "$NB_GAME_DIR/css/style.css" > "$NB_CSS_TEMP"
cat "$SHELL_JS_TEMP" "$NB_JS_TEMP" > "$NB_JS_COMBINED"

echo "Assembling number-bonds HTML..."

awk -v css_file="$NB_CSS_TEMP" -v js_file="$NB_JS_COMBINED" -v shell_file="shared/shell.html" '
  /<link[^>]*shared\/tokens\.css[^>]*>/ { next }
  /<link[^>]*shared\/shell\.css[^>]*>/ { next }
  /<link[^>]*css\/style\.css[^>]*>/ {
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
' "$NB_GAME_DIR/index.html" > "$DOCS_DIR/number-bonds.html"

NB_SIZE=$(wc -c < "$DOCS_DIR/number-bonds.html" | tr -d ' ')
echo "Number Bonds built: $DOCS_DIR/number-bonds.html ($NB_SIZE bytes)"

if grep -q 'kg-shell' "$DOCS_DIR/number-bonds.html"; then
  echo "  [ok] Shell bar injected"
else
  echo "  [WARN] Shell bar missing"
fi

if grep -q 'GameSession' "$DOCS_DIR/number-bonds.html"; then
  echo "  [ok] JS inlined"
else
  echo "  [WARN] JS not found in output"
fi
```

**Step 3: Run the build**

```bash
bash build.sh
```

Expected output includes:
```
--- Building Number Bonds ---
  Inlining games/number-bonds/js/questions.js
  Inlining games/number-bonds/js/game.js
  Inlining games/number-bonds/js/main.js
Number Bonds built: docs/number-bonds.html (XXXXX bytes)
  [ok] Shell bar injected
  [ok] JS inlined
```

No errors. All other games should still build successfully.

**Step 4: Open docs/number-bonds.html in browser — verify shell bar appears**

The shell bar (player picker, theme toggle, volume) should now render correctly.

**Step 5: Commit**

```bash
git add build.sh docs/number-bonds.html
git commit -m "build: add number-bonds JS inlining to build pipeline"
```

---

## Task 10: Final verification

**Step 1: Run all question tests**

```bash
node --test games/number-bonds/tests/questions.test.js
```

Expected: all tests pass, no failures.

**Step 2: Run full build**

```bash
bash build.sh
```

Expected: all 6 games build successfully, no errors.

**Step 3: Manual browser test checklist**

Open `docs/number-bonds.html`:

- [ ] Settings screen loads with correct defaults for the active player's age bracket
- [ ] All operation toggles work (+, −, ×, ÷, Mixed)
- [ ] Difficulty presets show correct hint text
- [ ] Custom difficulty shows/hides extra options
- [ ] All three session modes selectable
- [ ] Sprint: 60s countdown visible in HUD, game ends on 0
- [ ] Round: 1/10 counter, ends after question 10
- [ ] Endless: no timer, Quit button works
- [ ] Correct answer: green flash
- [ ] Wrong answer: red shake, correct answer revealed in green
- [ ] Results screen shows score, accuracy, streak
- [ ] Personal best marked with ★ on second better run
- [ ] Play again / Change settings navigation works
- [ ] Dark theme: toggle to colourful-dark, check all screens
- [ ] Mobile: test on 375px wide viewport, buttons comfortably tappable

**Step 4: Commit docs output**

```bash
git add docs/number-bonds.html
git commit -m "feat(number-bonds): complete game — Sprint, Round, Endless, all operations"
```

---

## Summary of files created/modified

| File | Action |
|---|---|
| `games/number-bonds/index.html` | Replaced coming-soon with full game HTML |
| `games/number-bonds/css/style.css` | Created — all game styles |
| `games/number-bonds/js/questions.js` | Created — question + distractor generation |
| `games/number-bonds/js/game.js` | Created — GameSession state machine |
| `games/number-bonds/js/main.js` | Created — settings, rendering, persistence |
| `games/number-bonds/tests/package.json` | Created — `{"type":"module"}` |
| `games/number-bonds/tests/questions.test.js` | Created — unit tests |
| `build.sh` | Modified — number-bonds build section |
| `docs/number-bonds.html` | Generated — production build output |
