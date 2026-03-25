# Game Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three improvements to both Number Bonds and Maths: fix sticky mobile hover on answer buttons, show Quit button in all modes, and add a glow hint that reveals the correct answer after idle time with wrong-answer confirmation.

**Architecture:** `game.js` (identical in both games) gains confirmation state, hint timer, and extracted `_advance()`. CSS gains hover media query guard and hint-glow animation. `main.js` gains `onHint` callback, updated `renderAnswerFeedback`, and difficulty passed into range. Since `game.js` is identical across both games, it is implemented and tested once (Number Bonds) then copied to Maths.

**Tech Stack:** Vanilla JS ES modules, Node built-in test runner (`node:test`), CSS `@keyframes`.

---

## Reference files (read before starting)

- `docs/plans/2026-03-25-game-improvements-design.md` — approved design doc
- `games/number-bonds/js/game.js` — file being updated (then copied to maths)
- `games/number-bonds/js/main.js` — wiring to update
- `games/number-bonds/css/style.css` — styles to update
- `games/number-bonds/index.html` — button label to update
- `games/maths/js/main.js` — same changes, `maths-` prefix
- `games/maths/css/style.css` — same CSS changes, `maths-` prefix
- `games/maths/index.html` — button label to update

---

## Task 1: game.js — TDD for confirmation state and hint timer

**Files:**
- Create: `games/number-bonds/tests/game.test.js`
- Modify: `games/number-bonds/js/game.js`
- Modify: `games/maths/js/game.js` (copy of updated nb file)

### Step 1: Write `games/number-bonds/tests/game.test.js`

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GameSession } from '../js/game.js';

function createSession({ mode = 'round', difficulty = 'easy', onAnswer = () => {} } = {}) {
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
    onEnd: () => {},
    onHint: () => {},
  });
}

// Returns a value that is guaranteed not to be the correct answer
function wrongAnswer(session) {
  return session._currentQuestion.answer + 1;
}

describe('GameSession — wrong-answer confirmation (Round/Endless)', () => {
  it('wrong answer in Round sets _awaitingConfirmation', () => {
    const s = createSession({ mode: 'round' });
    s.start();
    s.answer(wrongAnswer(s));
    assert.equal(s._awaitingConfirmation, true);
  });

  it('wrong answer in Endless sets _awaitingConfirmation', () => {
    const s = createSession({ mode: 'endless' });
    s.start();
    s.answer(wrongAnswer(s));
    assert.equal(s._awaitingConfirmation, true);
  });

  it('wrong answer in Sprint does NOT set _awaitingConfirmation', () => {
    const s = createSession({ mode: 'sprint' });
    s.start();
    s.answer(wrongAnswer(s));
    assert.equal(s._awaitingConfirmation, false);
  });

  it('onAnswer receives requiresConfirmation: true for wrong Round answer', () => {
    let captured = null;
    const s = createSession({ mode: 'round', onAnswer: a => { captured = a; } });
    s.start();
    s.answer(wrongAnswer(s));
    assert.equal(captured.requiresConfirmation, true);
  });

  it('onAnswer does not receive requiresConfirmation for wrong Sprint answer', () => {
    let captured = null;
    const s = createSession({ mode: 'sprint', onAnswer: a => { captured = a; } });
    s.start();
    s.answer(wrongAnswer(s));
    assert.ok(!captured.requiresConfirmation);
  });

  it('correct tap in confirmation state clears _awaitingConfirmation', () => {
    const s = createSession({ mode: 'round' });
    s.start();
    s.answer(wrongAnswer(s));
    assert.equal(s._awaitingConfirmation, true);
    s.answer(s._currentQuestion.answer);
    assert.equal(s._awaitingConfirmation, false);
  });

  it('wrong tap in confirmation state keeps _awaitingConfirmation', () => {
    const s = createSession({ mode: 'round' });
    s.start();
    s.answer(wrongAnswer(s));
    s.answer(s._currentQuestion.answer + 2);
    assert.equal(s._awaitingConfirmation, true);
  });
});

describe('GameSession — _hintDelay', () => {
  it('returns 15 for Easy in Round', () => {
    assert.equal(createSession({ difficulty: 'easy', mode: 'round' })._hintDelay(), 15);
  });

  it('returns 15 for Easy in Endless', () => {
    assert.equal(createSession({ difficulty: 'easy', mode: 'endless' })._hintDelay(), 15);
  });

  it('returns 25 for Medium in Round', () => {
    assert.equal(createSession({ difficulty: 'medium', mode: 'round' })._hintDelay(), 25);
  });

  it('returns null for Hard', () => {
    assert.equal(createSession({ difficulty: 'hard', mode: 'round' })._hintDelay(), null);
  });

  it('returns null for Custom', () => {
    assert.equal(createSession({ difficulty: 'custom', mode: 'round' })._hintDelay(), null);
  });

  it('returns null for Easy in Sprint', () => {
    assert.equal(createSession({ difficulty: 'easy', mode: 'sprint' })._hintDelay(), null);
  });
});
```

### Step 2: Run tests — verify they fail

```bash
node --test games/number-bonds/tests/game.test.js
```

Expected: failures — `_awaitingConfirmation` and `_hintDelay` don't exist yet.

### Step 3: Replace `games/number-bonds/js/game.js` with the updated implementation

```js
// game.js — GameSession: manages one play session
import { generateQuestion, generateDistractors } from './questions.js';

const SPRINT_DURATION = 60;
const ROUND_QUESTIONS = 10;
const POINTS_CORRECT = 10;
const STREAK_BONUS = 2;
const ANSWER_PAUSE_MS = 600;

export class GameSession {
  constructor({ op, mode, range, onQuestion, onAnswer, onScore, onEnd, onHint }) {
    this.op = op;
    this.mode = mode;
    this.range = range;
    this.onQuestion = onQuestion;
    this.onAnswer = onAnswer;
    this.onScore = onScore;
    this.onEnd = onEnd;
    this.onHint = onHint ?? null;

    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.correct = 0;
    this.total = 0;
    this.questionNum = 0;
    this.timeLeft = SPRINT_DURATION;
    this.startTime = null;
    this._timer = null;
    this._hintTimer = null;
    this._active = false;
    this._currentQuestion = null;
    this._answerLocked = false;
    this._awaitingConfirmation = false;
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
    if (!this._active) return;

    // Confirmation state: correct button shown after wrong answer (Round/Endless only).
    // Only the correct answer advances; all other taps are ignored.
    if (this._awaitingConfirmation) {
      if (value === this._currentQuestion.answer) {
        this._awaitingConfirmation = false;
        this.onAnswer({ correct: true, correctAnswer: this._currentQuestion.answer, chosen: value });
        this.onScore(this._hudState());
        setTimeout(() => this._advance(), ANSWER_PAUSE_MS);
      }
      return;
    }

    if (this._answerLocked) return;
    this._answerLocked = true;

    const q = this._currentQuestion;
    const isCorrect = value === q.answer;
    this.total++;

    if (isCorrect) {
      this.correct++;
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
      this.score += POINTS_CORRECT + (this.streak - 1) * STREAK_BONUS;
      this.onAnswer({ correct: true, correctAnswer: q.answer, chosen: value });
      this.onScore(this._hudState());
      setTimeout(() => this._advance(), ANSWER_PAUSE_MS);
    } else {
      this.streak = 0;
      if (this.mode === 'sprint') {
        // Sprint: auto-advance after pause, no confirmation
        this.onAnswer({ correct: false, correctAnswer: q.answer, chosen: value });
        this.onScore(this._hudState());
        setTimeout(() => this._advance(), ANSWER_PAUSE_MS);
      } else {
        // Round/Endless: reveal correct answer, wait for player to tap it
        this._awaitingConfirmation = true;
        this._answerLocked = false;
        this._clearHintTimer();
        this.onAnswer({ correct: false, correctAnswer: q.answer, chosen: value, requiresConfirmation: true });
        this.onScore(this._hudState());
      }
    }
  }

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

  _advance() {
    if (!this._active) return;
    this._answerLocked = false;
    this._clearHintTimer();
    if (this.mode === 'round' && this.questionNum >= ROUND_QUESTIONS) {
      this.end();
    } else {
      this._nextQuestion();
    }
  }

  _nextQuestion() {
    this.questionNum++;
    const q = generateQuestion(this.op, this.range);
    this._currentQuestion = q;
    const distractors = generateDistractors(q.answer, q.op, this.range);
    const choices = shuffle([q.answer, ...distractors]);
    this.onQuestion(q, choices);
    this.onScore(this._hudState());
    this._startHintTimer();
  }

  _hintDelay() {
    if (this.mode === 'sprint') return null;
    const diff = this.range._difficulty;
    if (diff === 'easy') return 15;
    if (diff === 'medium') return 25;
    return null;
  }

  _startHintTimer() {
    this._clearHintTimer();
    const seconds = this._hintDelay();
    if (!seconds || !this.onHint) return;
    this._hintTimer = setTimeout(() => {
      if (this._active && !this._awaitingConfirmation) this.onHint();
    }, seconds * 1000);
  }

  _clearHintTimer() {
    clearTimeout(this._hintTimer);
    this._hintTimer = null;
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

### Step 4: Run all Number Bonds tests — verify they pass

```bash
node --test games/number-bonds/tests/
```

Expected: all tests pass (existing questions tests + new game tests). If any fail, debug before continuing.

### Step 5: Copy updated game.js to Maths

```bash
cp games/number-bonds/js/game.js games/maths/js/game.js
```

### Step 6: Commit

```bash
git add games/number-bonds/js/game.js games/maths/js/game.js games/number-bonds/tests/game.test.js
git commit -m "feat: add wrong-answer confirmation and hint timer to GameSession"
```

---

## Task 2: CSS — hover fix and hint-glow animation (both games)

**Files:**
- Modify: `games/number-bonds/css/style.css`
- Modify: `games/maths/css/style.css`

Apply these changes to **both** style.css files. The only difference is the class prefix (`nb-` vs `maths-`) and animation name (`nbHintGlow` vs `mathsHintGlow`). Instructions below use `nb-` — repeat for `maths-`.

### Step 1: Add `-webkit-tap-highlight-color` to the choice button base rule

Find the `.nb-choice {` rule and add inside it:

```css
-webkit-tap-highlight-color: transparent;
```

### Step 2: Wrap the hover rule in a media query

Find:
```css
.nb-choice:hover:not(:disabled) {
  ...
}
```

Wrap it:
```css
@media (hover: hover) {
  .nb-choice:hover:not(:disabled) {
    ...
  }
}
```

### Step 3: Add hint-glow animation

Append to the end of the file:

```css
/* Hint glow — shown on correct button after idle timer fires */
@keyframes nbHintGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
  50%       { box-shadow: 0 0 0 12px rgba(251, 191, 36, 0.55); }
}

.nb-choice--hint {
  animation: nbHintGlow 1.4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .nb-choice--hint {
    animation: none;
    box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.7);
  }
}
```

For `games/maths/css/style.css`, use `mathsHintGlow` and `.maths-choice--hint`.

### Step 4: Verify

```bash
grep -c "nb-" games/number-bonds/css/style.css   # should be > 0 (nb- classes still exist)
grep "hover: hover" games/number-bonds/css/style.css  # should find the media query
grep "nbHintGlow" games/number-bonds/css/style.css    # should find the animation
grep "mathsHintGlow" games/maths/css/style.css        # should find the animation
```

### Step 5: Commit

```bash
git add games/number-bonds/css/style.css games/maths/css/style.css
git commit -m "fix: guard hover styles with media query, add hint-glow animation"
```

---

## Task 3: HTML — ✕ button label (both games)

**Files:**
- Modify: `games/number-bonds/index.html`
- Modify: `games/maths/index.html`

### Step 1: Update Number Bonds

In `games/number-bonds/index.html`, find:

```html
<button id="nb-quit-btn" class="nb-btn nb-btn--ghost">Quit</button>
```

Replace with:

```html
<button id="nb-quit-btn" class="nb-btn nb-btn--ghost">✕</button>
```

### Step 2: Update Maths

In `games/maths/index.html`, find:

```html
<button id="maths-quit-btn" class="maths-btn maths-btn--ghost">Quit</button>
```

Replace with:

```html
<button id="maths-quit-btn" class="maths-btn maths-btn--ghost">✕</button>
```

### Step 3: Commit

```bash
git add games/number-bonds/index.html games/maths/index.html
git commit -m "fix: replace Quit label with ✕ in both games"
```

---

## Task 4: Number Bonds `main.js`

**Files:**
- Modify: `games/number-bonds/js/main.js`

Read the full file before making changes. Apply four targeted edits.

### Edit 1 — `renderQuestion`: blur active element before clearing choices

Find the line `choicesEl.innerHTML = '';` inside `renderQuestion` and add one line before it:

```js
// Before:
choicesEl.innerHTML = '';

// After:
document.activeElement?.blur();
choicesEl.innerHTML = '';
```

### Edit 2 — `getActiveRange`: add `_difficulty` to returned range

```js
// Before:
function getActiveRange() {
  if (settings.difficulty === 'custom') return settings.custom;
  const p = DIFFICULTY_PRESETS[settings.difficulty];
  return { min: p.min, max: p.max, maxTable: p.maxTable, negatives: p.negatives, decimals: p.decimals };
}

// After:
function getActiveRange() {
  if (settings.difficulty === 'custom') return { ...settings.custom, _difficulty: 'custom' };
  const p = DIFFICULTY_PRESETS[settings.difficulty];
  return { min: p.min, max: p.max, maxTable: p.maxTable, negatives: p.negatives, decimals: p.decimals, _difficulty: settings.difficulty };
}
```

### Edit 3 — `initGameScreen`: show quit button in all modes

```js
// Before:
quitBtn.hidden = settings.mode !== 'endless';

// After:
quitBtn.hidden = false;
```

### Edit 4 — `renderAnswerFeedback`: handle `requiresConfirmation`

```js
// Before:
function renderAnswerFeedback({ correct, correctAnswer, chosen }) {
  document.getElementById('nb-choices')?.querySelectorAll('.nb-choice').forEach(btn => {
    btn.disabled = true;
    const num = Number(btn.textContent);
    if (num === correctAnswer) btn.classList.add('nb-choice--reveal');
    if (num === chosen && !correct) btn.classList.add('nb-choice--wrong');
    if (num === chosen && correct) btn.classList.add('nb-choice--correct');
  });
}

// After:
function renderAnswerFeedback({ correct, correctAnswer, chosen, requiresConfirmation }) {
  document.getElementById('nb-choices')?.querySelectorAll('.nb-choice').forEach(btn => {
    const num = Number(btn.textContent);
    if (num === correctAnswer) {
      btn.classList.add('nb-choice--reveal');
      if (!requiresConfirmation) btn.disabled = true; // keep enabled so player can tap to confirm
    } else {
      btn.disabled = true;
    }
    if (num === chosen && !correct) btn.classList.add('nb-choice--wrong');
    if (num === chosen && correct) btn.classList.add('nb-choice--correct');
  });
}
```

### Edit 5 — `startGame`: add `onHint` to `GameSession` constructor

Find the `activeSession = new GameSession({` block and add `onHint` to it:

```js
activeSession = new GameSession({
  op: settings.op,
  mode: settings.mode,
  range,
  onQuestion: renderQuestion,
  onAnswer: renderAnswerFeedback,
  onScore: renderHud,
  onEnd: showResults,
  onHint: () => {
    document.getElementById('nb-choices')
      ?.querySelectorAll('.nb-choice')
      .forEach(btn => {
        if (Number(btn.textContent) === activeSession._currentQuestion.answer) {
          btn.classList.add('nb-choice--hint');
        }
      });
  },
});
```

### Step: Commit

```bash
git add games/number-bonds/js/main.js
git commit -m "feat(number-bonds): quit button all modes, hint callback, confirmation support"
```

---

## Task 5: Maths `main.js`

**Files:**
- Modify: `games/maths/js/main.js`

Identical changes to Task 4, with `maths-` prefix throughout. Read the maths main.js first, then apply the same five edits replacing `nb-` with `maths-`.

### Edit 1 — `renderQuestion`: blur before clearing

Same as Task 4 Edit 1 — `document.activeElement?.blur();` before `choicesEl.innerHTML = '';`.

### Edit 2 — `getActiveRange`: add `_difficulty`

Same logic as Task 4 Edit 2.

### Edit 3 — `initGameScreen`: quit button always visible

Same as Task 4 Edit 3.

### Edit 4 — `renderAnswerFeedback`: handle `requiresConfirmation`

Same logic as Task 4 Edit 4, but with `maths-choices` and `maths-choice` class names:

```js
function renderAnswerFeedback({ correct, correctAnswer, chosen, requiresConfirmation }) {
  document.getElementById('maths-choices')?.querySelectorAll('.maths-choice').forEach(btn => {
    const num = Number(btn.textContent);
    if (num === correctAnswer) {
      btn.classList.add('maths-choice--reveal');
      if (!requiresConfirmation) btn.disabled = true;
    } else {
      btn.disabled = true;
    }
    if (num === chosen && !correct) btn.classList.add('maths-choice--wrong');
    if (num === chosen && correct) btn.classList.add('maths-choice--correct');
  });
}
```

### Edit 5 — `startGame`: add `onHint`

Same as Task 4 Edit 5 with `maths-choices` and `maths-choice`:

```js
onHint: () => {
  document.getElementById('maths-choices')
    ?.querySelectorAll('.maths-choice')
    .forEach(btn => {
      if (Number(btn.textContent) === activeSession._currentQuestion.answer) {
        btn.classList.add('maths-choice--hint');
      }
    });
},
```

### Step: Commit

```bash
git add games/maths/js/main.js
git commit -m "feat(maths): quit button all modes, hint callback, confirmation support"
```

---

## Task 6: Smoke test both games

Open each game in a browser and verify:

### Number Bonds checklist

**Mobile hover fix:**
- [ ] Open in browser DevTools mobile emulation (touch device)
- [ ] Answer a question — no button on the NEXT question should be pre-highlighted

**Quit button:**
- [ ] Sprint mode — ✕ button visible, clicking shows partial Results screen
- [ ] Round mode — ✕ button visible, clicking shows partial Results screen
- [ ] Endless mode — ✕ button still works as before

**Wrong-answer confirmation (Round or Endless, Easy or Medium):**
- [ ] Tap a wrong answer — correct button stays enabled (tappable), wrong button goes red
- [ ] Tap the correct button — brief green flash, advances to next question
- [ ] Tap another wrong button while in confirmation — nothing happens
- [ ] Sprint mode — wrong answer still auto-advances (no confirmation)

**Hint glow (Easy or Medium, Round or Endless):**
- [ ] Wait 15s (Easy) or 25s (Medium) without tapping — correct button glows amber
- [ ] Hard or Sprint — no glow appears
- [ ] Tap the glowing button — advances normally
- [ ] If `prefers-reduced-motion` is enabled in OS, glow is a static amber border instead of animation

### Maths checklist

Repeat all the above for Maths game.

### Final commit

```bash
git add -A
git commit -m "build: rebuild docs after game improvements"
```

Then run `bash build.sh`.
