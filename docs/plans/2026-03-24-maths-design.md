# Maths — Game Design Document
**Date:** 2026-03-24
**Status:** Approved

---

## Overview

Maths is a mental arithmetic drill game for the Kids Games hub. It replaces the current "coming soon" placeholder at `games/maths/index.html`.

**Target audience:** All ages — from KS1 children (5–7) learning basic addition, up to advanced children who know their times tables and are comfortable with larger numbers.

**Core mechanic:** A complete equation is shown with the result replaced by `?` (e.g. `13 + 7 = ?`). The player taps one of four answer buttons. The answer is always on the right of the `=` sign.

**Distinction from Number Bonds:** Number Bonds trains operand recall ("what bonds to 20?"). Maths trains result recall ("what does 13 + 7 make?"). Same game shell, different cognitive task.

**No free-text input.** Multiple choice (4-button 2×2 grid) for all difficulty levels — mobile-safe, age-appropriate, keeps the game fast.

---

## Personas

### Rosie, age 5 (KS1 Reception)
Needs large tap targets, simple numbers, clear visual feedback. Default: Easy, Addition only. Sees `2 + 3 = ?` and taps the right big button.

### Sam, age 8 (KS2 Year 3)
Learning times tables, comfortable with addition/subtraction to 20. Wants a bit of challenge and to beat their own score. Default: Medium, Mixed operations.

### Theo, age 10 (advanced)
Knows all times tables, doing mental maths with larger numbers. Uses Hard or Custom difficulty. `87 + 56 = ?` and `7 × 8 = ?` require genuine mental effort even with multiple choice.

### Parent / teacher
Wants appropriate defaults, nothing unexpected on a shared tablet. Advanced options hidden behind Custom toggle.

---

## Screen Flow

```
SETTINGS → PLAYING → RESULTS
              ↑           ↓
         (Play again)  (Change settings)
```

### 1. Settings Screen (shown on load)

- **Operation selector** — `+` `−` `×` `÷` `Mixed` as large toggle buttons
- **Difficulty** — `Easy` `Medium` `Hard` `Custom`
  - Preset label shown below selection
  - Custom expands: min number, max number, max table (×/÷), toggle for negatives, toggle for decimals (1dp)
- **Session mode** — `Sprint ⏱` `Round 🎯` `Endless ∞`
- **"Let's go!" button** at bottom
- Last-used settings pre-selected on return visits (persisted per player)
- Age bracket auto-selects default difficulty on first visit: 4–5 → Easy, 6–8 → Medium, 9–12 → Hard

### 2. Game Screen

- **HUD strip** at top:
  - Score (all modes)
  - Sprint: countdown timer (60s)
  - Round: question counter `3 / 10`
  - Endless: score only + Quit button
- **Question** — large bold equation centred on screen, e.g. `13 + 7 = ?`
- **4 answer buttons** — 2×2 grid, large tap targets (min 64×64px), one is correct
- **Feedback animations:**
  - Correct: button flashes green, brief bounce
  - Wrong: button flashes red, brief shake; correct answer highlighted briefly

### 3. Results Screen

- Score, accuracy %, longest streak
- Time taken (Sprint and Round modes)
- Personal best indicator if beaten
- `Play again` — same settings
- `Change settings` — back to Settings screen

---

## Question Generation

### Format

The question always shows both operands and has the result replaced by `?`:

- `2 + 3 = ?`
- `15 − 6 = ?`
- `4 × 3 = ?`
- `12 ÷ 4 = ?`

The blank is always the result — always on the right of `=`. This is the only structural difference from Number Bonds.

### Difficulty Presets

| Level  | +/− range | ×/÷ max table | Negatives | Decimals |
|--------|-----------|---------------|-----------|----------|
| Easy   | 1–10      | 5             | No        | No       |
| Medium | 1–20      | 10            | No        | No       |
| Hard   | 1–100     | 12            | No        | No       |
| Custom | player-set| player-set    | Toggle    | Toggle   |

### Distractor Generation (wrong answers)

3 wrong answers generated alongside the correct answer.

**For `+` and `−`:** Correct result ± random small offset (1–5), no duplicates, no negatives unless negatives mode is on, same decimal places if decimals mode is on. For `13 + 7 = ?` (answer 20): distractors drawn from nearby values like 17, 18, 22, 23.

**For `×` and `÷`:** Adjacent table products rather than ±offset. For `7 × 8 = 56`, candidates are `(left±1)×right` and `left×(right±1)` — e.g. 48 (6×8), 63 (7×9), 64 (8×8), 54 (6×9). All genuine multiplication results, none excludable on parity grounds. Falls back to ±offset if insufficient candidates at range boundaries.

**All cases:** No distractor equals the correct answer. All 4 answers shuffled before display.

---

## Session Modes

### Sprint (60 seconds)
Countdown timer in HUD. Each correct answer = score increment. Timer expires → Results screen.

### Round (10 questions)
Progress counter `3 / 10` in HUD. Question 10 answered → Results screen immediately.

### Endless
No timer, no end condition. `Quit` button in HUD → Results screen.

---

## Scoring

- Correct answer: **+10 points**
- Streak bonus: **+2 points per consecutive correct answer** (resets on wrong)
- Wrong answer: **no penalty**, streak resets
- Results show: final score, accuracy %, longest streak

---

## Persistence

Uses `window.KidsGames.saveGameData` / `loadGameData` keyed to `'maths'`.

Stored per player:
- Personal bests: `{ [mode]-[operation]-[difficulty]: score }`
- Last-used settings: `{ operation, difficulty, mode, customRange }`

Shell integration identical to Number Bonds: reads `window.KidsGames.player`, responds to `onPlayerChange`, respects `window.KidsGames.muted`.

---

## File Structure

```
games/maths/
  index.html        — shell HTML, game markup, script tags
  css/
    style.css       — all game styles
  js/
    questions.js    — generateMathsQuestion + generateDistractors (adapted from Number Bonds)
    game.js         — GameSession (copied verbatim from Number Bonds)
    main.js         — entry point, wires shell + game together (adapted from Number Bonds)
```

---

## Reuse vs Change

### Pure reuse (copy verbatim)
- `game.js` — `GameSession` is 100% identical
- Results screen HTML and rendering logic
- Settings screen HTML and JS structure
- Persistence pattern (key changes to `'maths'`)
- CSS structure (prefix changes, accent colour changes)

### Adapted (same logic, targeted changes)
- `questions.js` — `generateDistractors` copied verbatim; `generateMathsQuestion` is new: same arithmetic generation as Number Bonds but always returns `answer: result` with no `blank` field. `×`/`÷` distractor strategy changed to adjacent table products.
- `main.js` — `renderQuestion` simplified to one render path (`left op right = ?`). All `nb-` references updated to `maths-`. Storage key changed to `'maths'`.
- `index.html` — title, icon (🧮), all `nb-` IDs updated to `maths-`.

### Visual distinction from Number Bonds
- Accent colours: `--accent-primary` and `--accent-purple` (Number Bonds uses `--accent-tertiary` / `--accent-secondary`)

---

## Visual Design

- Follows `shared/tokens.css` design tokens throughout
- Accent colours: `--accent-primary` and `--accent-purple`
- Question displayed at `3rem+` font size
- Answer buttons: min `64×64px` tap target, rounded (`--radius-xl`), bold font
- Feedback uses `--success-bg / --success-text` and `--error-bg / --error-text` tokens
- Fully supports light and dark themes via `data-theme` on `<html>`
- `prefers-reduced-motion` respected
