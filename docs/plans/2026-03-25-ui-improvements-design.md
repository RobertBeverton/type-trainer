# UI Improvements — Design Document
**Date:** 2026-03-25
**Status:** Approved
**Applies to:** `games/number-bonds/` and `games/maths/` (changes are parallel in both)

---

## Overview

Two improvements identified from play observations and the quit-button smoke test:

1. **Results screen after quit** — swap button prominence so "Change settings" is the primary action
2. **Custom settings complexity indicator** — live label (Preschool → Challenge) + representative example question

---

## Personas

**Rosie (age 5, KS1):** Quits a Sprint she can't cope with. Needs to be guided to easier settings, not looped back into the same difficulty. Cannot read fluently — colour and button size are her signals.

**Sam (age 8, KS2):** Might quit to switch mode (Endless → Sprint). Wants quick access to settings to change one thing. Also benefits from seeing complexity labels when a parent configures custom settings.

**Theo (age 10, advanced):** Uses custom settings. Wants to know he's genuinely set something hard. Sees "Challenge / Advanced" and feels validated.

**Parent / Teacher:** Sets up custom settings for a specific child. Needs immediate feedback on whether the numbers are appropriate — without understanding what "maxTable=10" means cognitively. Also frustrated when a child quits and immediately restarts the same mode.

---

## 1. Results screen after quit

### Problem

When a player quits (via the ✕ button), `showResults` runs identically to a natural game end. "Play again" is the primary (large, filled) button. A child who just quit because the mode was too hard instinctively taps the big button — back into the same difficulty. Observed loop: quit → results → Play again → same mode.

### Fix

Pass `quit: true` through the `onEnd` callback when the session ends via the quit button. `showResults` uses this flag to swap button prominence:

- **Normal end (round complete, sprint timer, endless quit button was never pressed):** "Play again" primary, "Change settings" secondary — unchanged
- **Quit end:** "Change settings" primary, "Play again" secondary

The button labels do not change — only their visual weight (filled vs ghost style).

### Implementation

**`game.js`** (both games — identical file):
```js
// end() gains an optional options parameter
end({ quit = false } = {}) {
  // ...existing logic...
  this.onEnd({
    score: this.score,
    accuracy: ...,
    bestStreak: this.bestStreak,
    timeTaken,
    quit,            // new field
  });
}
```

**`main.js`** (both games):
```js
// Quit button handler — passes quit: true
quitBtn.addEventListener('click', () => activeSession?.end({ quit: true }));

// showResults — swaps prominence
function showResults({ score, accuracy, bestStreak, timeTaken, quit }) {
  // ...existing stats render...
  playAgainBtn.className = quit
    ? 'nb-btn nb-btn--secondary'
    : 'nb-btn nb-btn--primary';
  changeSettingsBtn.className = quit
    ? 'nb-btn nb-btn--primary'
    : 'nb-btn nb-btn--secondary';
}
```

### Persona check

- **Rosie:** Quits frustrated Sprint → big "Change settings" button → parent helps adjust → success.
- **Sam:** Quits to switch mode → sees "Change settings" → one tap to settings → picks Endless → success.
- **Parent/Teacher:** Loop broken. Natural end still shows "Play again" first — the experience only changes when quitting.

### Scope

Two JS files (`game.js` — identical in both games, `main.js` × 2). Small, no new UI elements.

---

## 2. Custom settings complexity indicator

### Problem

The custom settings panel shows Min / Max / Max table / Negatives / Decimals — raw number inputs with no cognitive context. A parent setting Max=500 has no way of knowing that `238 ÷ ? = 14` requires genuine mental effort even for adults. Conversely, a parent setting Max=5 for a 5-year-old has no confirmation that the setting is appropriate.

### Fix

Add a complexity row at the bottom of the custom panel. It shows:

1. **A badge** — curriculum stage label: `Preschool`, `KS1`, `KS2`, `KS3`, or `Challenge`
2. **Age range** — `Ages 3–5`, `Ages 5–7`, `Ages 7–11`, `Ages 11–14`, `Advanced`
3. **Example question** — a representative hard question from the current settings

The row updates live as the user adjusts any input. It is only shown when Custom difficulty is selected (the panel is already conditionally shown).

### Complexity algorithm

```js
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

  // mixed: take the harder of the two
  const order = ['preschool', 'ks1', 'ks2', 'ks3', 'challenge'];
  return order[Math.max(order.indexOf(addSubLevel), order.indexOf(mulDivLevel))];
}
```

### Badge colours

Each level has a distinct colour so a parent can read difficulty at a glance without reading the label:

| Level      | Badge colour       |
|------------|--------------------|
| Preschool  | `--success-text` (green)  |
| KS1        | `#3b9acd` (blue)   |
| KS2        | `--accent-primary` (amber) |
| KS3        | `#e07a00` (dark amber/orange) |
| Challenge  | `--error-text` (red) |

### Example question generation

The example shows a question in the upper range of the current settings — not the maximum, but representative of the harder questions the player will see.

**Number Bonds format** (`A + ? = N`):
```js
function buildExampleQuestion(op, custom) {
  const { max, maxTable } = custom;
  const effectiveOp = (op === 'mixed' || op === '+' || op === '-') ? '+' : op;

  if (effectiveOp === '+' || effectiveOp === '-') {
    const answer = max;
    const left = Math.round(max * 0.6);
    return `${left} + ? = ${answer}`;
  }
  // × or ÷
  const a = Math.max(2, maxTable - 1);
  const b = maxTable;
  return `? × ${b} = ${a * b}`;
}
```

**Maths format** (`A + B = ?`):
```js
function buildExampleQuestion(op, custom) {
  const { max, maxTable } = custom;
  const effectiveOp = (op === 'mixed' || op === '+' || op === '-') ? '+' : op;

  if (effectiveOp === '+' || effectiveOp === '-') {
    const a = Math.round(max * 0.6);
    const b = Math.round(max * 0.35);
    return `${a} + ${b} = ?`;
  }
  // × or ÷
  const a = Math.max(2, maxTable - 1);
  return `${a} × ${maxTable} = ?`;
}
```

### HTML (Number Bonds — maths uses `maths-` prefix)

Added inside `.nb-custom-opts`, at the bottom:

```html
<div class="nb-complexity-row" id="nb-complexity-row">
  <span class="nb-complexity-badge" id="nb-complexity-badge">KS2</span>
  <span class="nb-complexity-ages" id="nb-complexity-ages">Ages 7–11</span>
  <span class="nb-complexity-example" id="nb-complexity-example">e.g. 12 + ? = 20</span>
</div>
```

### CSS (both games, correct prefixes)

```css
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
  background: var(--complexity-color, var(--text-muted));
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
  font-family: var(--font-family);
}
```

Badge colour is set via inline style or a data attribute driven by JS:
```js
badge.style.setProperty('--complexity-color', LEVEL_COLOURS[level]);
```

### `updateComplexityPreview()` in `main.js`

Called from:
- All custom input change/input event listeners (min, max, maxTable, negatives, decimals)
- Op toggle click handler
- When Custom difficulty is selected

```js
const COMPLEXITY_LEVELS = {
  preschool: { label: 'Preschool', ages: 'Ages 3–5',   colour: '#4caf50' },
  ks1:       { label: 'KS1',       ages: 'Ages 5–7',   colour: '#3b9acd' },
  ks2:       { label: 'KS2',       ages: 'Ages 7–11',  colour: '#f5a623' },
  ks3:       { label: 'KS3',       ages: 'Ages 11–14', colour: '#e07a00' },
  challenge: { label: 'Challenge', ages: 'Advanced',   colour: '#e53935' },
};

function updateComplexityPreview() {
  const custom = readCustomSettings(); // reads the current input values
  const level = computeComplexity(settings.op, custom);
  const info = COMPLEXITY_LEVELS[level];

  document.getElementById('nb-complexity-badge').textContent = info.label;
  document.getElementById('nb-complexity-badge').style.background = info.colour;
  document.getElementById('nb-complexity-ages').textContent = info.ages;
  document.getElementById('nb-complexity-example').textContent =
    'e.g. ' + buildExampleQuestion(settings.op, custom);
}
```

### Persona check

- **Rosie's parent:** Sets Max=5. Badge goes green "Preschool / Ages 3–5", example shows `3 + ? = 5`. Immediately confident this is right.
- **Sam's parent:** Tries Max=100 out of curiosity. Badge goes orange "KS3 / Ages 11–14". Backs off to Max=20 → amber "KS2 / Ages 7–11". Correct feedback loop.
- **Theo (10):** Sets Max=500, negatives on. Red "Challenge / Advanced", example `300 + ? = 500`. Satisfied — that's what he wanted.
- **Parent/Teacher:** No explanation required. Colour + label + example = immediately legible.

### Scope

Two HTML files (new complexity row), two CSS files (new styles), two `main.js` files (new function + calls). No changes to `game.js` or `questions.js`.

---

## File summary

```
games/number-bonds/
  js/game.js        — end() gains quit param
  js/main.js        — quit handler, showResults, updateComplexityPreview, buildExampleQuestion, computeComplexity
  css/style.css     — complexity row styles
  index.html        — complexity row HTML

games/maths/
  js/game.js        — same (copy)
  js/main.js        — same changes, maths- prefix
  css/style.css     — same styles, maths- prefix
  index.html        — complexity row HTML
```
