# Memory Match — Design Document
_2026-03-25_

## Overview

A card-flipping memory match game for kids. Players flip cards two at a time to find matching emoji pairs. Goal is to clear the board in as few flips as possible.

---

## Settings Screen

Three rows of options, then a Play button.

### Board Size (pick one)
| Label | Grid | Cards | Pairs |
|-------|------|-------|-------|
| Quick | 2×4 | 8 | 4 |
| Medium | 3×4 | 12 | 6 |
| Classic | 4×4 | 16 | 8 |
| Challenge | 4×5 | 20 | 10 |

### Theme (pick one)
- 🐾 Animals
- 🍕 Food
- 🚗 Vehicles
- 🎲 Random (mixed pool)

### Options
- **Peek** toggle (default: on) — briefly shows all cards face-up for 1.5s before the game starts, giving kids a chance to memorise before they flip.

---

## Emoji Pool

Each theme provides enough unique emojis to fill the largest board (10 pairs = 10 unique emojis minimum, ideally 15+ for variety).

**Animals (🐾):** 🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐸 🐵 🐔 🐧 🐦 🦆 🦉 🦋 🐢

**Food (🍕):** 🍎 🍊 🍋 🍇 🍓 🍒 🍕 🍔 🌮 🍦 🍩 🍪 🎂 🧁 🍫 🍬 🥐 🧇 🥞 🍿

**Vehicles (🚗):** 🚗 🚕 🚙 🚌 🚎 🏎 🚓 🚑 🚒 🚐 🛻 🚚 🚛 ✈️ 🚀 🛸 🚁 ⛵ 🚂 🚤

**Random:** draws from all three pools combined.

---

## Game Board

### Layout
- CSS Grid with columns/rows matching chosen board size
- Cards sized with `min()` so the full grid always fits in the viewport — no scrolling
- Gap: 6px between cards
- Board centred horizontally, vertically within available space below header

### Header (slim)
- Game name / back button (left)
- Flip counter: "X flips" (right) — counts each individual card flip, not pairs

### Card States
1. **Hidden** — coloured back panel with a large `?`
2. **Flipped** — white/light panel with large emoji (60–70% of card size), 3D Y-axis CSS flip animation ~300ms
3. **Matched** — stays face-up, gets a green glow/tint so kids can see their progress
4. **Mismatched** — brief shake animation, then flips back after ~800ms

### Peek Feature (if enabled)
- On game start: all cards flip face-up simultaneously
- Hold for 1.5 seconds
- All cards flip back, game begins

### First-Play Hint
- On the very first card tap, a brief animated tooltip/pulse appears on a second card: "Now find the match!"
- Disappears after the second card is tapped — never shown again that session
- Text-free alternative: two cards briefly pulse/glow to suggest "tap two" before the player's first move
- Keeps the mechanic self-evident without a wall of instructions

---

## Audio

All sounds generated via Web Audio API (no external files).

| Event | Sound |
|-------|-------|
| Card flip | Short soft tick (100ms) |
| Match | Rising two-note chime |
| Mismatch | Gentle low "boing" — not harsh |
| All pairs matched | Short fanfare (3–4 notes) |

- No sounds on page load — audio context initialised on first user interaction
- No mute button in v1 (device volume handles it)

---

## Celebration Screen

Replaces the board in-place when all pairs are matched.

- Large animated emoji burst (🎉)
- Big "You did it!" message
- Move count: "You did it in X flips!"
- Two buttons:
  - **Play Again** — same settings, new shuffle
  - **Change Settings** — returns to settings screen

---

## Technical Notes

- Single HTML file (`index.html`) with embedded JS and CSS, consistent with other games
- Emoji pool defined as plain JS arrays — no external assets or CDN
- Card size formula: `min(calc((100vw - padding - gaps) / cols), calc((100vh - header - padding - gaps) / rows))`
- Shuffle: Fisher-Yates on the paired array
- No timer — intentional, timers stress kids
- No server, no persistence needed — purely stateless per-session
- **Click-lock:** board input blocked during flip animation and during the mismatch evaluation window (prevents corrupted state from rapid tapping)
- **Landscape (4×5):** swap to 5 columns × 4 rows when viewport is wider than tall
- **No best-score persistence** — deliberate, keeps the game pressure-free; revisit if kids ask for it
