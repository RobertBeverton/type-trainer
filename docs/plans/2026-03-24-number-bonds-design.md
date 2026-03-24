# Number Bonds — Game Design Document
**Date:** 2026-03-24
**Status:** Approved

---

## Overview

Number Bonds is a mental maths drill game for the Kids Games hub. It replaces the current "coming soon" placeholder at `games/number-bonds/index.html`.

**Target audience:** All ages — from KS1 children (5-7) learning bonds to 10, up to advanced children who know their times tables and are learning negative numbers and decimals.

**Core mechanic:** A maths equation is shown with one number replaced by `?`. The player taps one of four answer buttons to fill the blank.

---

## Personas

### Rosie, age 5 (KS1 Reception)
Needs large tap targets, simple numbers, clear visual feedback. Can't read well — numbers and emojis carry the UI. Default: Easy, bonds to 10, Addition only.

### Sam, age 8 (KS2 Year 3)
Learning times tables, comfortable with addition/subtraction to 100. Wants a bit of challenge and to beat their own score. Default: Medium, Mixed operations.

### Theo, age 10 (advanced)
Knows all times tables, doing mental maths with larger numbers, learning negative numbers and decimals. Wants full control over number ranges. Uses Custom difficulty with negatives/decimals toggled on.

### Parent / teacher
Wants to set appropriate difficulty quickly, trust the UI won't confuse younger kids. Advanced options (negatives, decimals) hidden behind Custom toggle so they don't appear for younger children.

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
  - Preset label shown below selection (e.g., "Numbers 1–20, times tables to 10")
  - Custom expands to reveal: min number, max number, max table (for ×/÷), toggle for negatives, toggle for decimals (1dp)
- **Session mode** — `Sprint ⏱` `Round 🎯` `Endless ∞`
- **"Let's go!" button** at bottom
- Last-used settings pre-selected on return visits (persisted per player)
- Age bracket auto-selects default difficulty on first visit: 4-5 → Easy, 6-8 → Medium, 9-12 → Hard

### 2. Game Screen

- **HUD strip** at top:
  - Score (all modes)
  - Sprint: countdown timer (60s)
  - Round: question counter `3 / 10`
  - Endless: score only + Quit button
- **Question** — large bold equation centred on screen, e.g. `13 + ? = 20`
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

The question always shows two operands and a result, with exactly one slot replaced by `?`. The blank is randomly the **left operand** or **right operand** — never the result. This keeps it a true bond question, not a standard maths question.

Examples:
- `? + 7 = 20` or `13 + ? = 20`
- `? − 4 = 9` or `15 − ? = 9`
- `? × 6 = 42` or `7 × ? = 42`
- `? ÷ 4 = 3` or `12 ÷ ? = 3`

For commutative operations (+, ×), left and right blanks are equally likely.
For non-commutative (−, ÷), both positions are valid but generate different question styles.

### Difficulty Presets

| Level  | +/− range | ×/÷ max table | Negatives | Decimals |
|--------|-----------|---------------|-----------|----------|
| Easy   | 1–10      | 5             | No        | No       |
| Medium | 1–20      | 10            | No        | No       |
| Hard   | 1–100     | 12            | No        | No       |
| Custom | player-set| player-set    | Toggle    | Toggle   |

### Distractor Generation (wrong answers)

3 wrong answers are generated alongside the correct answer. Rules:
- For **+/−**: correct answer ± random small offset (1–5), no duplicates, no negatives unless negatives mode is on
- For **×/÷**: values from nearby multiplication facts (adjacent table entries), shuffled
- With **negatives**: distractors stay in the same sign domain as the correct answer
- With **decimals**: distractors have the same number of decimal places
- No distractor ever equals the correct answer
- All 4 answers shuffled before display

---

## Session Modes

### Sprint (60 seconds)
- Countdown timer in HUD, ticking down
- Each correct answer = score increment
- Timer expires → Results screen
- Personal best = highest score for this op + difficulty combo

### Round (10 questions)
- Progress counter `3 / 10` in HUD
- Question 10 answered → Results screen immediately
- Personal best = highest score (out of max 100 + streak bonus)

### Endless
- No timer, no end condition
- `Quit` button in HUD → Results screen
- Personal best = highest score reached in one session

---

## Scoring

- Correct answer: **+10 points**
- Streak bonus: **+2 points per consecutive correct answer** (resets on wrong)
- Wrong answer: **no penalty**, streak resets
- Results show: final score, accuracy %, longest streak

---

## Persistence

Uses `window.KidsGames.saveGameData` / `loadGameData` keyed to current player.

Stored per player:
- Personal bests: `{ [mode]-[operation]-[difficulty]: { score, accuracy, date } }`
- Last-used settings: `{ operation, difficulty, mode, customRange }`

Shell integration:
- Reads `window.KidsGames.player` for player name and age bracket
- `window.KidsGames.onPlayerChange` re-applies age-bracket default on player switch
- Respects `window.KidsGames.muted` for sound effects

---

## File Structure

```
games/number-bonds/
  index.html        — shell HTML, game markup, script tags
  css/
    style.css       — all game styles
  js/
    questions.js    — question generation, distractor logic
    game.js         — game state machine, session modes, scoring
    main.js         — entry point, wires shell + game together
```

No canvas — pure HTML/CSS buttons. More accessible, better for tap interaction, simpler to build.

---

## Visual Design

- Follows `shared/tokens.css` design tokens throughout
- Accent colours: `--accent-tertiary` and `--accent-secondary` (matching existing number-bonds placeholder)
- Question displayed at `3rem+` font size — readable by young children
- Answer buttons: min `64×64px` tap target, rounded (`--radius-xl`), bold font
- Feedback uses `--success-bg / --success-text` and `--error-bg / --error-text` tokens
- Fully supports light and dark themes via `data-theme` on `<html>`
- `prefers-reduced-motion` respected — animations disabled when set
