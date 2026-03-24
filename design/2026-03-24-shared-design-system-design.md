# Shared Design System & Shell — Design Document

**Goal:** Create a consistent visual identity and shared navigation shell across all games in the kids-games hub, with shared player profiles and age-adaptive theming.

**Status:** Design complete, awaiting implementation plan.

---

## 1. Design Tokens (`shared/tokens.css`)

A single CSS file defining all shared variables, loaded by every page.

### Base Tokens (theme-agnostic)
- Font: Nunito (all ages, all themes — clear and readable)
- Spacing scale: xs through 2xl
- Border radii, font sizes, transitions, shadows

### Four Named Themes
Set via `data-theme` attribute on `<html>`:

| Theme | Background | Palette | Feel |
|-------|-----------|---------|------|
| `colourful-light` | Warm cream (#FFF8E7) | Candy colors, vibrant | Playful |
| `colourful-dark` | Dark warm | Same candy palette, contrast-adjusted | Playful dark |
| `clean-light` | Clean white/grey | Muted, restrained | Minimal |
| `clean-dark` | Deep dark | Current type-trainer dark style | Minimal dark |

- Age bracket sets the **default** theme (4-8 → colourful-light, 9+ → clean-light)
- Player can override to any theme — no "kids theme" labelling
- Stored in player profile

### Game-Specific Tokens
Games may define additional tokens (e.g. type trainer's 8 finger-zone colours). These live in the game's own CSS, not in shared tokens.

---

## 2. Shared Shell (Top Bar)

A persistent ~48px bar at the top of every page, injected by the build script.

### Layout (left to right)
- **Games button** — icon + text, opens dropdown card grid of all games (each card has emoji icon + title for pre-readers). Closes on tap-outside or game selection. Hidden or redundant on hub page.
- **Page title** — "Kids Games" on hub, game name when in a game
- **Spacer** (pushes remaining items right)
- **Player avatar + name** — first letter circle + name. Tap to open player-select overlay.
- **Theme picker** — dropdown or cycle for the four theme options
- **Volume/mute button** — shared across all games using Web Audio

### Behaviour
- Fixed to top of viewport
- Games render below in remaining space
- Shell markup lives in `shared/shell.html`, styles in `shared/shell.css`, logic in `shared/shell.js`
- Build script injects into every output HTML file

---

## 3. Player Profiles

### Profile Structure (localStorage)
```
kidsgames_player_Evie = {
  name: "Evie",
  dob: "2021-03-15",       // or null if manual age
  manualAge: null,          // or 5 if no DoB provided
  theme: "colourful-light",
  createdAt: "2026-03-24"
}
```

### Age Bracket Derivation
- Calculated at runtime from DoB or manualAge
- Brackets: 4-5, 6-8, 9-12, 13+
- Used by games for difficulty parameters
- Birthday nudge: gentle prompt once per year ("Still 7?")

### Player Creation Flow
- First visit: "Who's playing?" screen with create-player form
- Fields: name, DoB date picker OR manual age number input
- Returns to this screen on future visits if multiple players exist
- Remembers last active player for quick re-entry

### Game-Specific Data (separate keys)
```
kidsgames_typetrainer_Evie = { highScore, highestStage, stats, ... }
kidsgames_opposites_Evie = { bestStreak, gamesPlayed, ... }
```

Each game reads/writes only its own namespace via `window.KidsGames` API.

---

## 4. Game Integration API

Games interact with the shell via `window.KidsGames`:

```js
window.KidsGames.player        // { name, ageBracket, theme }
window.KidsGames.loadGameData('typetrainer')
window.KidsGames.saveGameData('typetrainer', data)
```

### What games handle:
- Gameplay, rendering, scoring
- Game-specific difficulty based on age bracket
- Game-specific data persistence via the API

### What games do NOT handle:
- Theme switching (shell + CSS variables)
- Player selection (shell)
- Back navigation (shell bar)
- Volume/mute (shell provides state)

---

## 5. Build System

### New shared source files
```
shared/
  tokens.css    # Design tokens (4 themes + base)
  shell.html    # Bar markup (HTML fragment)
  shell.css     # Bar styles
  shell.js      # Player management, theme, storage API
```

### Build process per game
1. Concatenate `shared/tokens.css` + game CSS → inline `<style>`
2. Concatenate `shared/shell.js` + game JS → inline `<script>`
3. Inject `shared/shell.html` at top of `<body>`
4. Output to `docs/<game>.html`

Hub page uses the same pipeline (no game-specific JS, just the games grid).

---

## 6. Migration

### Phase 1: Shared Design Tokens
- Create `shared/tokens.css` with all four themes
- Refactor hub + opposites to use tokens
- Refactor type trainer CSS to use shared tokens where possible
- Verify all four themes visually

### Phase 2: Shared Shell
- Create shell HTML/CSS/JS
- Implement player creation/selection, theme picker, Games dropdown, volume
- Implement `window.KidsGames` API
- Wire up hub page, update build script

### Phase 3: Game Integration
- Opposites first (simpler): player context, bracket difficulty, data persistence
- Type trainer second: strip player select/mode select/theme toggle, expose `startGame(bracket, settings)` entry point, migrate localStorage

### Phase 4: Polish
- Birthday nudge
- GitHub release zip for offline download
- Cross-browser/device testing

Each phase is independently deployable.

---

## 7. Refactoring Impact

### Type Trainer (biggest change)
- **Remove:** Player select screen, mode select screen, theme toggle, mobile gate
- **Keep:** Gameplay, canvas, keyboard, audio, stages, adaptive difficulty
- **Rewrite:** `main.js` orchestration → simpler `startGame(bracket, settings)` entry point
- **Migrate:** Existing localStorage data to new namespaced format

### Opposites (moderate change)
- **Add:** Bracket-based difficulty (harder words for older kids)
- **Add:** Game data persistence
- **Remove:** Standalone CSS variables (use shared tokens)
- **Remove:** Back link (shell provides navigation)

### Hub (moderate change)
- **Remove:** Standalone CSS, back link concept
- **Add:** Becomes the "no game loaded" state of the shell
- **Keep:** Games grid cards

---

## Design Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Font | Nunito for all ages | Clear, readable, doesn't look babyish to older kids |
| Theme names | Colourful/Clean × Light/Dark | Avoids "kids theme" labelling that patronises |
| Theme default | Age-derived, player-overridable | Smart default, full control |
| Age storage | DoB preferred, manual age fallback | Auto-adjusts over time |
| Architecture | Separate pages, shell injected at build | Simple, debuggable, matches existing build |
| Player identity | Required before play | Kids benefit from "this is mine" feeling |
| Score persistence | Only when actionable | Avoid complexity for complexity's sake |
| Games in dropdown | Icon + title | Pre-readers recognise icons faster than words |
| Standalone offline | Deferred to GitHub release zip | Site-first, package later |
