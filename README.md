# Type Trainer

A touch typing game for kids and adults, built for my twins (age 5) and nieces (age 8) — but fun for all ages.

**[Play it now](https://robertbeverton.github.io/type-trainer/)** (single HTML file, no install needed)

## Features

- **Learn Mode** — Zero-pressure keyboard exploration. Press any key to hear it, see it light up, and learn where it lives. Guided lessons progress from home row through the full keyboard.
- **Play Mode** — Letters and words fall from the top of the screen. Type them before they reach the bottom. Stages progress from single letters to 7-letter words.
- **Age Brackets** — Four difficulty levels (4-5, 6-8, 9-12, Adult) with tuned speeds, lives, and word lists.
- **Adaptive Difficulty** — Speed adjusts in real-time based on your accuracy. Getting everything right? It speeds up. Struggling? It slows down.
- **Finger Zone Keyboard** — On-screen UK QWERTY keyboard colour-coded by finger zones, helping build proper touch typing habits. For younger players, the next key to press is highlighted.
- **Per-Player Profiles** — Multiple players with individual progress, stats, and settings saved locally.
- **Sound Effects** — Synthesised audio feedback (Web Audio API) — satisfying pops for correct keys, gentle nudges for mistakes. No alarming sounds for young players.
- **Light & Dark Themes** — Light theme for kids, dark for older players. Saved per player.

## Age Brackets

| Bracket | Speed | Lives | Max Items | Word Stages |
|---------|-------|-------|-----------|-------------|
| 4-5     | Gentle | 5 | 1 at a time | Letters → CVC words |
| 6-8     | Moderate | 4 | 2 | Letters → 5-letter words |
| 9-12    | Brisk | 3 | 3 | Letters → 6-letter words |
| Adult   | Fast | 3 | 7 | Letters → 7-letter marathon |

## Getting Started

### Play

Download `dist/typing-game.html` and open it in any modern browser. That's it — everything is in one file.

Or clone and open the development version:

```bash
git clone https://github.com/RobertBeverton/type-trainer.git
cd type-trainer
# Open index.html in your browser
```

### Build the single-file version

```bash
./build.sh
# Creates dist/typing-game.html (~220KB, fully self-contained)
```

Requires `bash` and `awk` (available on macOS/Linux, or Git Bash on Windows).

## Tech

- Vanilla HTML5 / CSS3 / JavaScript (ES modules)
- Canvas 2D for the falling letters game loop
- Web Audio API for synthesised sounds
- CSS custom properties for theming
- localStorage for player data
- No dependencies, no framework, no build tools beyond a shell script

## Feedback

Found a bug? Got an idea? [Open an issue](https://github.com/RobertBeverton/type-trainer/issues).

## Author

Created by **Robert Beverton** with a lot of help from Claude.
