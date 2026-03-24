# Phase 1: Shared Design Tokens — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a shared CSS design token system (`shared/tokens.css`) with four named themes, and refactor all pages (hub, opposites, type trainer) to use it.

**Architecture:** A single `tokens.css` file defines base tokens (spacing, radii, font sizes, transitions) and four theme variants (colourful-light, colourful-dark, clean-light, clean-dark). Each page's inline or external CSS references these shared tokens. The build script concatenates `shared/tokens.css` into every output file.

**Tech Stack:** CSS custom properties, bash build script

**Design doc:** `docs/plans/2026-03-24-shared-design-system-design.md`

**Personas for review:** T1 (Frontend Engineer), T2 (Accessibility & Device Specialist), U1 (Young Child 4-5)

---

## Token Naming Convention

Games currently use two different naming schemes:
- Opposites/hub: `--bg`, `--card`, `--primary`, `--text`, `--text-light`
- Type trainer: `--bg-primary`, `--bg-game`, `--text-primary`, `--btn-primary-bg`

The shared system will use **semantic names** that work across all games:

### Base Tokens (theme-agnostic)
```
--font-family          Nunito (all ages)
--space-xs → --space-2xl   Spacing scale (4px → 48px)
--radius-sm → --radius-full   Border radius scale
--text-xs → --text-3xl   Font size scale
--transition-fast / --transition-normal
```

### Theme Tokens (vary per theme)
```
Backgrounds:   --bg, --bg-surface, --bg-game, --bg-overlay
Text:          --text-primary, --text-secondary, --text-muted
Borders:       --border, --border-light
Shadows:       --shadow, --shadow-lg
Accents:       --accent-primary, --accent-secondary, --accent-tertiary,
               --accent-purple, --accent-warm, --accent-pink, --accent-blue
               NOTE: Accent colours are for backgrounds/borders/decorative use.
               NOT safe as text colour on light themes. Use --text-primary/secondary
               for readable text. Always pair with animation/shape cues for feedback.
Feedback:      --success-bg, --success-text, --error-bg, --error-text,
               --warning-bg, --warning-text
Buttons:       --btn-primary-bg, --btn-primary-text, --btn-primary-hover
               (MUST be solid colours — no gradients. Gradients applied in
               component CSS using background: linear-gradient() directly.)
               --btn-secondary-bg, --btn-secondary-text, --btn-secondary-border
```

### Game-Specific Tokens (stay in game CSS)
- Type trainer: `--zone-*` finger colours, `--key-gap`, `--key-height`, `--heart-colour`, `--streak-*`, `--kbd-*`, `--stage-bar-*`, `--overlay-*`, `--danger-*`
- These reference shared theme tokens where possible (e.g. `--kbd-bg` → use `--bg-surface`)
- Game-specific tokens MUST have blocks for ALL four theme selectors (not just clean-light/dark)

---

## Task 1: Create shared/tokens.css with Base Tokens

**Files:**
- Create: `shared/tokens.css`

**Read first:** `games/type-trainer/css/style.css:1-30` (existing base tokens for reference)

**Step 1: Create the shared directory and base tokens file**

Create `shared/tokens.css` with the `:root` base tokens block:

```css
/* shared/tokens.css — Design tokens for Kids Games hub
   Four themes: colourful-light, colourful-dark, clean-light, clean-dark
   Set via data-theme attribute on <html> */

/* === Base Tokens (theme-agnostic) === */
:root {
  /* Typography */
  --font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;

  /* Spacing scale */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;  /* Oversized touch targets for young children */

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;

  /* Font sizes */
  --text-xs: 11px;   /* Admin/hint text only — not readable by ages 4-5 */
  --text-sm: 13px;   /* Secondary text — not reliable for pre-readers */
  --text-base: 16px;
  --text-lg: 20px;
  --text-xl: 24px;
  --text-2xl: 30px;
  --text-3xl: 36px;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 300ms ease;
}
```

Also add at the end of the base block:
```css
  /* === Usage Guide ===
     --bg:         Main page background
     --bg-surface: Elevated surfaces (cards, panels, modals)
     --bg-game:    Game play area (canvas container)
     --bg-overlay: Semi-transparent overlay behind modals

     Accent colours are for backgrounds, borders, and decorative fills.
     NOT safe as text colour on light themes — use --text-primary/secondary.
     On dark themes, all accents pass AA as text.
     Always pair colour feedback with animation/shape cues.

     --text-xs/--text-sm: Not readable by ages 4-5. Use --text-base+ for
     any content young children need to read.
  */

  /* TODO Phase 4: @media (prefers-contrast: more) overrides */
  /* TODO Phase 4: @media (prefers-reduced-motion: reduce) — disable animations */
```

**Acceptance criteria:**
- File exists at `shared/tokens.css`
- Contains all base tokens matching the type trainer's existing scale
- Added `--radius-2xl: 24px` for the larger card radii used in opposites/hub
- Added `--space-3xl: 64px` for oversized touch targets
- Includes usage guide comments and future TODO placeholders

**Verification:** `grep -c 'var(--' shared/tokens.css` — should be 0 (base tokens are values, not references)

**Commit:**
```bash
git add shared/tokens.css
git commit -m "feat: create shared/tokens.css with base design tokens"
```

---

## Task 2: Add Colourful Light Theme

**Files:**
- Modify: `shared/tokens.css`

**Read first:** `games/opposites/index.html:8-30` (current opposites colour palette), `hub.html:20-40` (hub palette — identical)

**Step 1: Add the colourful-light theme block**

Append to `shared/tokens.css`:

```css
/* === Colourful Light (default for ages 4-8) === */
:root[data-theme="colourful-light"] {
  /* Backgrounds */
  --bg: #FFF8E7;
  --bg-surface: #FFFFFF;
  --bg-game: #FFFFFF;
  --bg-overlay: rgba(255, 248, 231, 0.95);

  /* Text */
  --text-primary: #2D3436;
  --text-secondary: #636E72;
  --text-muted: #6E6E7E;       /* Darkened from #8A8A9A — 4.9:1 on white, 4.6:1 on cream */

  /* Borders */
  --border: #E2E8F0;
  --border-light: #EEEEEA;

  /* Shadows */
  --shadow: 0 8px 30px rgba(0,0,0,0.08);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.12);

  /* Accent colours — for backgrounds/borders/decorative use, NOT as text on light bg */
  --accent-primary: #FF6B6B;
  --accent-secondary: #4ECDC4;
  --accent-tertiary: #D4A300;   /* Darkened from #FFE66D — visible on cream (3.8:1) */
  --accent-purple: #A78BFA;
  --accent-warm: #FB923C;
  --accent-pink: #F472B6;
  --accent-blue: #60A5FA;

  /* Feedback */
  --success-bg: #D1FAE5;
  --success-text: #065F46;
  --error-bg: #FEE2E2;
  --error-text: #B91C1C;       /* Darkened from #DC2626 — 5.3:1 on error-bg */
  --warning-bg: #FEF3C7;
  --warning-text: #92400E;

  /* Buttons — MUST be solid colours, not gradients.
     Colourful gradient applied in component CSS via background: linear-gradient() */
  --btn-primary-bg: #7C5FE0;   /* Solid purple — used for border-color, outline, etc. */
  --btn-primary-text: #FFFFFF;  /* 4.8:1 on #7C5FE0 */
  --btn-primary-hover: #6A4FCC;
  --btn-secondary-bg: transparent;
  --btn-secondary-text: #2D3436;
  --btn-secondary-border: #E2E8F0;
  --btn-secondary-hover: #F5F5F0;

  /* HUD / Shell bar */
  --hud-bg: #FFFFFF;
  --hud-text: #2D3436;
  --hud-accent: #7C5FE0;       /* Darkened from #A78BFA — 4.6:1 on white */
}
```

**Acceptance criteria:**
- Colours match the current opposites/hub palette exactly
- Feedback colours (success/error/warning) match hardcoded values currently used in opposites
- Text contrast ratios meet WCAG AA (4.5:1 minimum for body text)

**Verification:** Check `--text-primary` (#2D3436) against `--bg` (#FFF8E7) — contrast ratio should be ≥ 4.5:1

**Commit:**
```bash
git add shared/tokens.css
git commit -m "feat: add colourful-light theme to shared tokens"
```

---

## Task 3: Add Colourful Dark Theme

**Files:**
- Modify: `shared/tokens.css`

**Read first:** The colourful-light theme just added (for palette reference)

**Step 1: Add the colourful-dark theme block**

This is a new theme — same candy palette but adjusted for dark backgrounds. Append to `shared/tokens.css`:

```css
/* === Colourful Dark (ages 4-8, dark preference) === */
:root[data-theme="colourful-dark"] {
  /* Backgrounds */
  --bg: #1A1520;
  --bg-surface: #251E2C;
  --bg-game: #1A1520;
  --bg-overlay: rgba(26, 21, 32, 0.95);

  /* Text */
  --text-primary: #F0ECF4;
  --text-secondary: #BDB4C8;
  --text-muted: #9590A5;       /* Lightened from #8A8098 — 4.8:1 on surface */

  /* Borders */
  --border: #3A3244;
  --border-light: #2E2838;

  /* Shadows */
  --shadow: 0 8px 30px rgba(0,0,0,0.25);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.35);

  /* Accent colours (brighter for dark bg contrast) — all pass 7:1+ on dark bg */
  --accent-primary: #FF8A8A;
  --accent-secondary: #6EE7D8;
  --accent-tertiary: #F5DC78;   /* Slightly desaturated from #FFE66D — reduces halation */
  --accent-purple: #C4A8FF;
  --accent-warm: #FFB06A;
  --accent-pink: #F9A8D4;
  --accent-blue: #80B4FF;

  /* Feedback */
  --success-bg: rgba(52, 211, 153, 0.15);
  --success-text: #6EE7B7;
  --error-bg: rgba(255, 107, 107, 0.15);
  --error-text: #FF8A8A;
  --warning-bg: rgba(255, 230, 109, 0.15);
  --warning-text: #F5DC78;

  /* Buttons — solid colours only */
  --btn-primary-bg: #C4A8FF;
  --btn-primary-text: #1A1520;
  --btn-primary-hover: #A888EE;
  --btn-secondary-bg: transparent;
  --btn-secondary-text: #F0ECF4;
  --btn-secondary-border: #3A3244;
  --btn-secondary-hover: #2E2838;

  /* HUD / Shell bar */
  --hud-bg: #251E2C;
  --hud-text: #F0ECF4;
  --hud-accent: #C4A8FF;
}
```

**Acceptance criteria:**
- Dark backgrounds with warm undertone (not pure black, not blue-tinted like the type trainer dark)
- Candy accent colours are 10-20% brighter than light theme equivalents for contrast
- Text contrast meets WCAG AA against dark backgrounds

**Verification:** Check `--text-primary` (#F0ECF4) against `--bg` (#1A1520) — contrast ≥ 4.5:1. Check `--text-secondary` (#BDB4C8) against `--bg` — should be ≥ 4.5:1.

**Commit:**
```bash
git add shared/tokens.css
git commit -m "feat: add colourful-dark theme to shared tokens"
```

---

## Task 4: Add Clean Light Theme

**Files:**
- Modify: `shared/tokens.css`

**Read first:** `games/type-trainer/css/style.css:30-75` (existing light theme tokens)

**Step 1: Add the clean-light theme block**

Based on the type trainer's existing light theme. Append to `shared/tokens.css`:

```css
/* === Clean Light (default for ages 9+) === */
:root[data-theme="clean-light"] {
  /* Backgrounds */
  --bg: #FAFAF8;
  --bg-surface: #F5F5F0;
  --bg-game: #FFFFFF;
  --bg-overlay: rgba(250, 250, 248, 0.95);

  /* Text */
  --text-primary: #1A1A2E;
  --text-secondary: #4A4A5A;
  --text-muted: #6E6E7E;       /* Darkened from #8A8A9A — 5.0:1 on bg-surface */

  /* Borders */
  --border: #E0E0D8;
  --border-light: #EEEEEA;

  /* Shadows */
  --shadow: 0 4px 16px rgba(0,0,0,0.06);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.1);

  /* Accent colours (muted, restrained) */
  --accent-primary: #536E7A;
  --accent-secondary: #4A8E85;
  --accent-tertiary: #9A7D2E;   /* Darkened from #C4A44A — visible on light bg */
  --accent-purple: #7A6BA0;
  --accent-warm: #B87A4A;
  --accent-pink: #B06090;
  --accent-blue: #4A80B0;

  /* Feedback */
  --success-bg: #D1FAE5;
  --success-text: #065F46;
  --error-bg: #FEE2E2;
  --error-text: #B91C1C;       /* Darkened from #DC2626 — 5.3:1 on error-bg */
  --warning-bg: #FEF3C7;
  --warning-text: #92400E;

  /* Buttons — solid colours */
  --btn-primary-bg: #0B2C44;
  --btn-primary-text: #FFFFFF;
  --btn-primary-hover: #1A4A63;
  --btn-secondary-bg: transparent;
  --btn-secondary-text: #0B2C44;
  --btn-secondary-border: #536E7A;
  --btn-secondary-hover: #ECF1F4;

  /* HUD / Shell bar */
  --hud-bg: #F5F5F0;
  --hud-text: #1A1A2E;
  --hud-accent: #536E7A;
}
```

**Acceptance criteria:**
- Backgrounds, text, and button colours match current type trainer light theme exactly
- Accent colours are muted compared to colourful themes
- Shadows are subtler than colourful theme (smaller offset, less opacity)
- Primary and secondary text meet WCAG AAA (7:1); muted text meets AA (4.5:1)

**Verification:** Check `--text-primary` (#1A1A2E) against `--bg` (#FAFAF8) — contrast ≥ 7:1. Check `--text-muted` (#6E6E7E) against `--bg-surface` (#F5F5F0) — contrast ≥ 4.5:1

**Commit:**
```bash
git add shared/tokens.css
git commit -m "feat: add clean-light theme to shared tokens"
```

---

## Task 5: Add Clean Dark Theme

**Files:**
- Modify: `shared/tokens.css`

**Read first:** `games/type-trainer/css/style.css:76-140` (existing dark theme tokens)

**Step 1: Add the clean-dark theme block**

Based on the type trainer's existing dark theme. Append to `shared/tokens.css`:

```css
/* === Clean Dark (ages 9+, dark preference) === */
:root[data-theme="clean-dark"] {
  /* Backgrounds */
  --bg: #0E0E1A;
  --bg-surface: #0F0F2A;
  --bg-game: #0A0A1A;
  --bg-overlay: rgba(5, 5, 20, 0.93);

  /* Text */
  --text-primary: #E8E8F0;
  --text-secondary: #A3A3C2;
  --text-muted: #8585A8;

  /* Borders */
  --border: #1A1A4A;
  --border-light: #1A1A3A;

  /* Shadows */
  --shadow: 0 4px 16px rgba(0,0,0,0.3);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.4);

  /* Accent colours */
  --accent-primary: #7AF;
  --accent-secondary: #14B8A6;
  --accent-tertiary: #FBBF24;
  --accent-purple: #A855F7;
  --accent-warm: #F97316;
  --accent-pink: #F472B6;
  --accent-blue: #60A5FA;

  /* Feedback */
  --success-bg: rgba(34, 197, 94, 0.15);
  --success-text: #4ADE80;
  --error-bg: rgba(220, 60, 60, 0.15);
  --error-text: #FF6B6B;
  --warning-bg: rgba(251, 191, 36, 0.15);
  --warning-text: #FBBF24;

  /* Buttons — solid colours */
  --btn-primary-bg: #7AF;
  --btn-primary-text: #0A0A1A;
  --btn-primary-hover: #99BBFF;
  --btn-secondary-bg: transparent;
  --btn-secondary-text: #7AF;
  --btn-secondary-border: #7AF;
  --btn-secondary-hover: #1A2A4A;

  /* HUD / Shell bar */
  --hud-bg: #0F0F2A;
  --hud-text: #E8E8F0;   /* near-white text — --hud-accent (#7AF) is for icons/highlights only */
  --hud-accent: #7AF;
}
```

**Acceptance criteria:**
- Colours match current type trainer dark theme exactly
- All text meets WCAG AA minimum (4.5:1 primary, secondary; 3:1 muted)

**Verification:** Check `--text-primary` (#E8E8F0) against `--bg` (#0E0E1A) — contrast ≥ 7:1

**Commit:**
```bash
git add shared/tokens.css
git commit -m "feat: add clean-dark theme to shared tokens"
```

---

## Task 6: Refactor Hub Page to Use Shared Tokens

**Files:**
- Modify: `hub.html`
- Read: `shared/tokens.css` (for token names)

**Step 1: Remove inline `:root` variables from hub.html**

Delete the entire `:root { ... }` block from the `<style>` tag. These are now in `shared/tokens.css`.

**Step 2: Add a temporary `<link>` to shared tokens for dev mode**

Add before the existing `<style>` tag:
```html
<link rel="stylesheet" href="shared/tokens.css">
```

(This will be replaced by inlining during build, but allows the dev version to work.)

**Step 3: Set default theme on html element**

Change `<html lang="en">` to `<html lang="en" data-theme="colourful-light">`.

**Step 4: Replace hardcoded values with token references**

Key replacements throughout the `<style>` block:

| Old | New |
|-----|-----|
| `#FFF8E7` | `var(--bg)` |
| `#FFFFFF` (card bg) | `var(--bg-surface)` |
| `#FF6B6B` | `var(--accent-primary)` |
| `#4ECDC4` | `var(--accent-secondary)` |
| `#FFE66D` | `var(--accent-tertiary)` |
| `#A78BFA` | `var(--accent-purple)` |
| `#2D3436` | `var(--text-primary)` |
| `#636E72` | `var(--text-secondary)` |
| `0 8px 30px rgba(0,0,0,0.08)` | `var(--shadow)` |
| `0 12px 40px rgba(0,0,0,0.12)` | `var(--shadow-lg)` |
| `#D1FAE5` (any-device badge) | `var(--success-bg)` |
| `#065F46` (any-device text) | `var(--success-text)` |
| `#FEF3C7` (keyboard badge) | `var(--warning-bg)` |
| `#92400E` (keyboard text) | `var(--warning-text)` |
| `24px` (gap) | `var(--space-lg)` |
| `16px` (small gap) | `var(--space-md)` |
| `24px` (border-radius) | `var(--radius-2xl)` |
| `14px` (btn border-radius) | `var(--radius-xl)` |
| `10px` (badge radius) | `var(--radius-lg)` |
| `font-size: 3rem` (h1) | `font-size: var(--text-3xl)` |
| `font-size: 1.1rem` | `font-size: var(--text-base)` |
| `font-size: 1.5rem` | `font-size: var(--text-xl)` |
| `font-size: 0.95rem` | `font-size: var(--text-sm)` |
| `font-size: 0.85rem` | `font-size: var(--text-sm)` |
| `font-size: 0.8rem` | `font-size: var(--text-sm)` |
| `font-size: 0.75rem` | `font-size: var(--text-xs)` |

Also add `font-family: var(--font-family)` to the `body` rule and remove the hardcoded `'Nunito', sans-serif`.

**Step 5: Open hub.html in browser, verify it looks identical**

Visual diff: the page should look exactly the same as before.

**Acceptance criteria:**
- No hardcoded colour values remain in hub.html `<style>` block (all use `var(--*)`)
- Font sizes use token scale
- Spacing uses token scale where tokens exist (larger values like `32px 24px` padding can stay hardcoded if no exact token match)
- Page looks visually identical to before

**Verification:** Open `hub.html` in browser. Visual comparison — should be pixel-identical to current version.

**Commit:**
```bash
git add hub.html
git commit -m "refactor: hub page uses shared design tokens"
```

---

## Task 7: Refactor Opposites Game to Use Shared Tokens

**Files:**
- Modify: `games/opposites/index.html`
- Read: `shared/tokens.css` (for token names)

**Step 1: Remove inline `:root` variables**

Delete the `:root { ... }` block from the `<style>` tag.

**Step 2: Add temporary `<link>` for dev mode**

Add before the `<style>` tag:
```html
<link rel="stylesheet" href="../../shared/tokens.css">
```

**Step 3: Set default theme on html element**

Change `<html lang="en">` to `<html lang="en" data-theme="colourful-light">`.

**Step 4: Replace colour references with token names**

The opposites game uses short variable names (`--bg`, `--card`, `--primary`, etc.) which differ from the shared token names. Perform these CSS variable renames throughout the `<style>` block:

| Old var | New var |
|---------|---------|
| `var(--bg)` | `var(--bg)` (same name, no change) |
| `var(--card)` | `var(--bg-surface)` |
| `var(--primary)` | `var(--accent-primary)` |
| `var(--secondary)` | `var(--accent-secondary)` |
| `var(--accent)` | `var(--accent-tertiary)` |
| `var(--purple)` | `var(--accent-purple)` |
| `var(--orange)` | `var(--accent-warm)` |
| `var(--green)` | `var(--success-text)` |
| `var(--blue)` | `var(--accent-purple)` (or hardcode `#60A5FA` if needed) |
| `var(--text)` | `var(--text-primary)` |
| `var(--text-light)` | `var(--text-secondary)` |
| `var(--shadow)` | `var(--shadow)` (same name) |
| `var(--shadow-lg)` | `var(--shadow-lg)` (same name) |

Also replace remaining hardcoded colours:
| Old | New |
|-----|-----|
| `#E2E8F0` (borders) | `var(--border)` |
| `#D1FAE5` (correct bg) | `var(--success-bg)` |
| `#FEE2E2` (wrong bg) | `var(--error-bg)` |

**Step 5: Replace hardcoded spacing/sizing with tokens**

Same approach as hub: replace hardcoded `font-size`, `border-radius`, `gap`, `margin`, `padding` with token references where a close match exists. Values with no token match (e.g. `36px 28px` padding) stay hardcoded.

**Step 6: Update `font-family` to use token**

In the `body` rule and any element that specifies `font-family: 'Nunito', sans-serif`, replace with `font-family: var(--font-family)`.

**Step 7: Verify visually**

Open `games/opposites/index.html` in browser. Should look identical to before.

**Acceptance criteria:**
- No hardcoded colour values remain (all use `var(--*)`)
- Font sizes and border-radii use token scale where matches exist
- `font-family` uses shared token
- Game is visually identical to before
- Game still functions (play a round, verify scoring, animations, sound)

**Verification:** Play a full game of opposites in browser, verify correct/wrong animations and feedback still work.

**Commit:**
```bash
git add games/opposites/index.html
git commit -m "refactor: opposites game uses shared design tokens"
```

---

## Task 8: Refactor Type Trainer CSS to Use Shared Tokens

**Files:**
- Modify: `games/type-trainer/css/style.css`
- Modify: `games/type-trainer/index.html`
- Read: `shared/tokens.css` (for token names)

This is the largest task. The type trainer has its own complete token system that needs to be aligned with the shared tokens.

**Step 1: Add temporary `<link>` to shared tokens in dev HTML**

In `games/type-trainer/index.html`, add before the existing `<link>`:
```html
<link rel="stylesheet" href="../../shared/tokens.css">
```

**Step 2: Set default theme**

Change `<html lang="en" data-theme="light">` to `<html lang="en" data-theme="clean-light">`.

**Step 3: Remove base tokens from style.css**

Delete the `:root { ... }` block (lines 1-30 approx) that defines `--font-ui`, `--font-mono`, `--space-*`, `--radius-*`, `--text-*`, `--transition-*`. These are now in shared tokens.

Keep the `:root` finger zone variables — these are game-specific.

**Step 4: Rename the theme selectors**

| Old selector | New selector |
|---|---|
| `:root[data-theme="light"]` | `:root[data-theme="clean-light"]` |
| `:root[data-theme="dark"]` | `:root[data-theme="clean-dark"]` |

**Step 5: Remove duplicate token definitions from theme blocks**

The type trainer's light/dark theme blocks define `--bg-primary`, `--bg-game`, `--text-primary`, etc. Many of these now come from `shared/tokens.css`. Remove any tokens from the type trainer's theme blocks that are **identical** to the shared tokens.

**Keep** game-specific tokens that the shared system doesn't cover:
- `--bg-grid` (type trainer specific)
- `--kbd-*` (keyboard styling)
- `--heart-colour`, `--streak-*` (game HUD)
- `--stage-bar-*` (progress bar)
- `--danger-zone`, `--danger-text` (delete player)
- Any token whose value differs from the shared version

**Step 6: Rename token references in CSS rules**

Throughout the type trainer CSS, rename references to match shared tokens:

| Old reference | New reference |
|---|---|
| `var(--font-ui)` | `var(--font-family)` |
| `var(--bg-primary)` | `var(--bg)` |
| `var(--bg-surface)` | `var(--bg-surface)` (same) |
| `var(--text-primary)` | `var(--text-primary)` (same) |
| `var(--text-secondary)` | `var(--text-secondary)` (same) |
| `var(--text-muted)` | `var(--text-muted)` (same) |
| `var(--border-default)` | `var(--border)` |
| `var(--border-light)` | `var(--border-light)` (same) |
| `var(--btn-primary-bg)` | `var(--btn-primary-bg)` (same) |
| `var(--btn-primary-text)` | `var(--btn-primary-text)` (same) |
| `var(--btn-primary-hover)` | `var(--btn-primary-hover)` (same) |

**Step 7: Add colourful theme blocks for ALL game-specific tokens**

First, find ALL `data-theme` selector blocks in the file:
```bash
grep -n 'data-theme' games/type-trainer/css/style.css
```

For every `data-theme="clean-light"` block, create a corresponding `data-theme="colourful-light"` block with the same game-specific tokens (finger zones, keyboard, heart/streak, stage bar, overlay, danger). Values can be identical to clean-light for now — they can diverge later.

Same for `data-theme="clean-dark"` → duplicate as `data-theme="colourful-dark"`.

This ensures game-specific tokens are defined regardless of which theme the user selects.

**Step 8: Update main.js theme references**

In `games/type-trainer/js/main.js`:

a) Update `toggleTheme()` — it currently does `current === 'dark' ? 'light' : 'dark'`. Replace with a mapping that toggles light/dark within the same style family:
```javascript
const themeToggleMap = {
  'clean-light': 'clean-dark',
  'clean-dark': 'clean-light',
  'colourful-light': 'colourful-dark',
  'colourful-dark': 'colourful-light'
};
const next = themeToggleMap[current] || 'clean-light';
```

b) Update `getDefaultThemeForBracket()` — currently returns `'light'` or `'dark'`. Change to return `'colourful-light'` for 4-5/6-8 brackets and `'clean-light'` for 9-12/Adult.

c) Add localStorage migration shim in the `DOMContentLoaded` handler, before the existing theme load:
```javascript
// Migrate old theme values
const migration = { 'light': 'clean-light', 'dark': 'clean-dark' };
const saved = localStorage.getItem('typingGame_theme');
if (migration[saved]) {
  localStorage.setItem('typingGame_theme', migration[saved]);
}
```

d) Update the theme load check from `savedTheme === 'dark' || savedTheme === 'light'` to accept any of the four new theme names.

This is a temporary fix — Phase 2 (shared shell) will move theme management out of the game entirely.

**Step 9: Verify visually**

Open `games/type-trainer/index.html` in browser. Should look identical to before in both light and dark modes.

**Acceptance criteria:**
- No base tokens defined in type trainer CSS (spacing, radii, font sizes come from shared)
- Theme selectors renamed to new 4-theme convention
- Game-specific tokens (finger zones, keyboard, streak) still in game CSS
- Type trainer looks identical in both clean-light and clean-dark
- Game still functions (start a game, play a few rounds, verify keyboard, sounds, scoring)

**Verification:** Open in browser, toggle between clean-light and clean-dark, play a round in each.

**Commit:**
```bash
git add games/type-trainer/css/style.css games/type-trainer/index.html games/type-trainer/js/main.js
git commit -m "refactor: type trainer uses shared design tokens"
```

---

## Task 9: Update Build Script

**Files:**
- Modify: `build.sh`

**Read first:** Current `build.sh` for the existing build flow

**Step 1: Add shared CSS concatenation to the type trainer build**

Before the awk step that inlines CSS, concatenate `shared/tokens.css` + `games/type-trainer/css/style.css` into a temp CSS file, then pass that to awk instead.

Create both temp files and trap together, before either is populated:
```bash
JS_TEMP=$(mktemp)
CSS_TEMP=$(mktemp)
trap "rm -f '$JS_TEMP' '$CSS_TEMP'" EXIT
```

Then after JS concatenation, add:
```bash
# --- Concatenate shared + game CSS ---
cat shared/tokens.css "$GAME_DIR/css/style.css" > "$CSS_TEMP"
```

Update the awk command to use `$CSS_TEMP` instead of `$CSS_FILE`.

**Step 2: Add shared CSS injection to the opposites copy step**

The opposites game currently gets a simple `cp`. Now it needs shared tokens injected. Use sed or awk to replace the `<link rel="stylesheet" href="../../shared/tokens.css">` with an inlined `<style>` block containing the tokens, OR concatenate the tokens CSS into the game's existing `<style>` block.

Simplest approach: use sed to insert the tokens CSS content right after the opening `<style>` tag:

```bash
echo "--- Building Opposites Game ---"
# Inject shared tokens into the inline style block
awk -v tokens_file="shared/tokens.css" '
  /<style>/ {
    print
    while ((getline line < tokens_file) > 0) { print line }
    close(tokens_file)
    next
  }
  { print }
' games/opposites/index.html > "$DOCS_DIR/opposites.html"
```

**Step 3: Add shared CSS injection to the hub copy step**

Same approach as opposites — inject tokens into the hub's `<style>` tag:

```bash
echo "--- Building Landing Page ---"
awk -v tokens_file="shared/tokens.css" '
  /<style>/ {
    print
    while ((getline line < tokens_file) > 0) { print line }
    close(tokens_file)
    next
  }
  { print }
' hub.html > "$DOCS_DIR/index.html"
```

**Step 4: Add preflight check for shared/tokens.css**

Add to the preflight section:
```bash
if [ ! -f "shared/tokens.css" ]; then
  echo "Error: shared/tokens.css not found." >&2
  exit 1
fi
```

**Step 5: Remove the `<link>` to shared tokens from built output**

The dev-mode `<link>` tags added in Tasks 6-8 will be present in the source HTML but shouldn't be in the built output (since tokens are inlined). Add a sed step or awk rule to strip lines containing `shared/tokens.css` from each output file.

In the awk commands for opposites and hub, add a rule to strip the dev-mode link tag:
```awk
/<link[^>]*shared\/tokens\.css[^>]*>/ { next }
```

For the type trainer, add the same rule to the existing awk pipeline.

**Build assumption:** Each source HTML must have exactly one `<style>` tag; tokens are injected after it. Add a comment in build.sh noting this.

**Acceptance criteria:**
- Build produces three HTML files in docs/
- Each file contains the shared tokens inlined in `<style>`
- No `<link>` references to `shared/tokens.css` in any output
- Type trainer build still passes all 4 sanity checks

**Verification:** Run `bash build.sh`, verify all checks pass. `grep 'shared/tokens' docs/*.html` should return nothing. `grep 'colourful-light' docs/*.html` should match in all three files.

**Commit:**
```bash
git add build.sh
git commit -m "build: inject shared tokens into all game output files"
```

---

## Task 10: Run Build and Verify All Four Themes

**Step 1: Run the build**

```bash
bash build.sh
```

Expected: All sanity checks pass.

**Step 2: Test colourful-light theme**

Open `docs/index.html` in browser. Default should be colourful-light. Verify:
- Hub: warm cream background, candy colours, correct card styling
- Type trainer: navigate to it, verify game looks correct with colourful palette
- Opposites: navigate to it, verify game looks correct

**Step 3: Test the other three themes**

Manually change `data-theme` in browser dev tools on each page:
- `colourful-dark` — verify dark warm backgrounds, bright candy accents
- `clean-light` — verify clean white/grey, muted accents
- `clean-dark` — verify deep dark, cyan accents (same as old type trainer dark)

**Step 4: Play each game in at least two themes**

Verify gameplay still works (canvas, sounds, scoring, animations).

**Step 5: Commit the built output**

```bash
git add docs/index.html docs/type-trainer.html docs/opposites.html
git commit -m "build: regenerate docs/ with shared design tokens"
```

---

## Review Gate

After Task 10, run a persona review with **T1 (Frontend Engineer)**, **T2 (Accessibility & Device Specialist)**, and **U1 (Young Child 4-5)** against:
- The `shared/tokens.css` file
- The git diff of all changes
- The design doc

Check:
- T1: Are tokens well-structured? Is the build correct? Any CSS maintainability issues?
- T2: Do all four themes meet contrast requirements? Are font sizes appropriate?
- U1: Does the colourful theme feel engaging for a 4-5 year old?

---

## Task Dependencies

```
Task 1 (base tokens) → Task 2-5 (themes, parallel)
                              ↓
                    Task 6-8 (refactors, parallel)
                              ↓
                    Task 9 (build script)
                              ↓
                    Task 10 (verify + build)
                              ↓
                    Review Gate
```

- Tasks 2-5: Independent, can run in parallel
- Tasks 6-7: Independent, can run in parallel after themes exist
- Task 8: Independent but ~2-3x larger than Tasks 6-7 (CSS rename, JS theme logic, colourful theme blocks). Consider splitting into subtasks if needed.
- Task 9: Depends on 6-8 (needs to know the `<link>` tags to strip)
- Task 10: Depends on 9
