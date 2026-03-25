# Game Improvements — Design Document
**Date:** 2026-03-25
**Status:** Approved
**Applies to:** `games/number-bonds/` and `games/maths/` (changes are parallel in both)

---

## Overview

Three improvements identified from real play observations and persona analysis. No new game mechanics — all three are refinements to existing behaviour.

1. **Mobile hover bug fix** — sticky button highlight confuses young players
2. **Quit button in all modes** — no exit in Sprint or Round traps frustrated children
3. **Hint + wrong-answer confirmation** — correct answer revealed after idle time or wrong tap; player must confirm by tapping it

---

## 1. Mobile hover bug fix

### Problem

`.nb-choice:hover:not(:disabled)` and `.maths-choice:hover:not(:disabled)` have no `@media (hover: hover)` guard. Touch browsers apply `:hover` on tap and it persists at that screen position. When `renderQuestion` clears the old buttons and creates new ones at the same grid coordinates, the new button at that position appears highlighted before the player has touched it. Observed by a 5-year-old tapping the pre-glowing button assuming it was correct.

### Fix

**CSS — both `style.css` files:**

Wrap the existing hover rule:
```css
@media (hover: hover) {
  .nb-choice:hover:not(:disabled) { ... }
}
```

Add to choice button base rule:
```css
.nb-choice {
  -webkit-tap-highlight-color: transparent;
}
```

**JS — both `main.js` files:**

In `renderQuestion`, before clearing the choices div:
```js
document.activeElement?.blur();
choicesEl.innerHTML = '';
```

### Scope
Two CSS files, two JS files. Four small edits. No behaviour change for desktop/mouse users.

---

## 2. Quit button in all modes

### Problem

Endless mode has a Quit button. Sprint and Round do not. A child stuck in a 60-second Sprint they can't cope with has no escape. Parents cannot intervene gracefully.

### Fix

In both `main.js` files, in `initGameScreen`, remove the condition hiding the quit button:

```js
// Before:
quitBtn.hidden = settings.mode !== 'endless';

// After:
quitBtn.hidden = false;
```

The button already exists in both HTML files, already has its click handler (`activeSession?.end()`), and `end()` already calls `onEnd` which shows the Results screen. Partial stats work correctly — score, accuracy, and streak are tracked question-by-question.

**Label change:** Both HTML files change the button text from `Quit` to `✕` — universal, works for all modes without semantic awkwardness.

### Scope
Two JS files (one-liner each), two HTML files (button label only).

---

## 3. Hint + wrong-answer confirmation

### Behaviour

Three paths through a question in **Round and Endless** modes:

1. **Knows the answer:** taps correct immediately → green flash → auto-advance (unchanged)
2. **Stuck (no tap):** hint fires after idle time → correct button glows amber → player taps it → advance
3. **Guessing wrong:** taps wrong → correct button revealed → player must tap it → advance

Sprint mode is unchanged — wrong answer auto-advances after 600ms. Speed is the point.

### Hint timer

- Counts from question start always
- Never reset by wrong answers
- Fires `onHint()` callback at:

| Difficulty | Round | Endless |
|------------|-------|---------|
| Easy       | 15s   | 15s     |
| Medium     | 25s   | 25s     |
| Hard       | —     | —       |
| Custom     | —     | —       |

Sprint never receives a hint regardless of difficulty.

If the player is already in wrong-answer confirmation state when the hint fires, the hint is a no-op (correct button is already shown).

### Visual states

**`--hint` class (amber glow):** correct button after idle timer fires. Communicates "you've been thinking a while, here's a nudge."

```css
@keyframes nb-hint-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
  50%       { box-shadow: 0 0 0 12px rgba(251, 191, 36, 0.55); }
}

.nb-choice--hint {
  animation: nb-hint-glow 1.4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .nb-choice--hint {
    animation: none;
    box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.7);
  }
}
```

**`--reveal` class (existing style):** correct button after wrong answer. Communicates "you got it wrong, here's the answer." Already exists in codebase — no change to this style.

### Wrong-answer confirmation state

When a wrong answer is given in Round/Endless:

- Tapped button: disabled, gets `--wrong` class (red flash — existing behaviour)
- Correct button: gets `--reveal` class, remains **enabled** (tappable)
- All other buttons: disabled
- `_awaitingConfirmation = true` in `GameSession`

Next tap on correct button:
- Clears confirmation state
- Advances to next question (or ends if Round complete)
- Not scored again — wrong answer was already counted

### Scoring

No changes to scoring. Wrong answer: total++, streak resets. The subsequent confirmation tap is navigation only — not scored.

### `game.js` changes

New `_awaitingConfirmation` boolean. Extract shared `_advance()` method (used by correct-answer timeout, confirmation tap, and Sprint wrong-answer timeout). Add hint timer methods. Pass `difficulty` through settings range so `_hintDelay()` can read it.

```js
// New in constructor:
this._awaitingConfirmation = false;
this._hintTimer = null;

// answer() — top of method:
if (this._awaitingConfirmation) {
  if (value === this._currentQuestion.answer) {
    this._awaitingConfirmation = false;
    this._advance();
  }
  return;
}

// answer() — wrong branch, Round/Endless:
this._awaitingConfirmation = true;
this._answerLocked = false;
this._clearHintTimer();
this.onAnswer({ correct: false, correctAnswer: q.answer, chosen: value, requiresConfirmation: true });

// answer() — wrong branch, Sprint:
setTimeout(() => this._advance(), ANSWER_PAUSE_MS);

// New methods:
_advance() { ... }
_startHintTimer() { ... }
_clearHintTimer() { ... }
_hintDelay() { ... }
```

`onAnswer` callback gains optional `requiresConfirmation` field. `main.js` uses this to leave the correct button enabled in `renderAnswerFeedback`.

### `main.js` changes

`startGame` passes `difficulty` into the range object so `game.js` can read it for hint timing.

`renderAnswerFeedback` updated:
```js
function renderAnswerFeedback({ correct, correctAnswer, chosen, requiresConfirmation }) {
  document.getElementById('nb-choices')?.querySelectorAll('.nb-choice').forEach(btn => {
    const num = Number(btn.textContent);
    if (num === correctAnswer) {
      btn.classList.add('nb-choice--reveal');
      if (!requiresConfirmation) btn.disabled = true;
    } else {
      btn.disabled = true;
      if (num === chosen && !correct) btn.classList.add('nb-choice--wrong');
    }
    if (num === chosen && correct) btn.classList.add('nb-choice--correct');
  });
}
```

`onHint` callback added to `GameSession` constructor call:
```js
onHint: () => {
  document.getElementById('nb-choices')
    ?.querySelectorAll('.nb-choice')
    .forEach(btn => {
      if (Number(btn.textContent) === activeSession._currentQuestion.answer) {
        btn.classList.add('nb-choice--hint');
      }
    });
},
```

---

## File structure

Changes are parallel across both games. Identical logic, different CSS prefixes (`nb-` vs `maths-`).

```
games/number-bonds/
  css/style.css     — hover media query, tap highlight, hint-glow animation
  js/game.js        — confirmation state, hint timer, _advance()
  js/main.js        — quit button, renderAnswerFeedback, onHint, difficulty in range
  index.html        — ✕ button label

games/maths/
  css/style.css     — same
  js/game.js        — same (shared file — see below)
  js/main.js        — same changes
  index.html        — ✕ button label
```

### Shared `game.js`

Number Bonds and Maths currently have identical `game.js` files (Maths was copied verbatim). These changes are identical in both. The implementation plan should update both files in sync, or consider whether a single shared module is worth introducing. Given the games are otherwise independent, updating both separately is simpler.
