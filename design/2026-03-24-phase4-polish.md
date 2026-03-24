# Phase 4: Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Final polish — birthday/age nudge, OS colour scheme detection, reduced motion support, and GitHub release packaging.

**Architecture:** Small, independent improvements layered onto the completed Phase 1-3 foundation.

**Depends on:** Phases 1-3 must be complete.

**Design doc:** `docs/plans/2026-03-24-shared-design-system-design.md`

**Personas for review:** T2 (Accessibility & Device), U1 (Young Child 4-5), U3 (Parent Setting Up)

---

## Task 1: Birthday / Age Nudge

**Files:**
- Modify: `shared/shell.js`

The nudge appears **inside the player management overlay** (not as an unsolicited popup) to ensure a parent is present. Young children cannot read the nudge text, so it should only appear when someone is actively managing players.

**Step 1: Add nudge to the player select overlay**

In `showPlayerSelect()`, after rendering player cards, check if any player is due for a nudge. If so, show a small banner at the top of the player grid:

```javascript
function getPlayersDueForNudge(players) {
  return Object.values(players).filter(p => {
    const lastNudge = p.lastAgeNudge || p.createdAt;
    const daysSinceNudge = (Date.now() - new Date(lastNudge).getTime()) / 86400000;
    return daysSinceNudge >= 365 && getAge(p) !== null;
  });
}

// In showPlayerSelect(), before the player grid:
const dueForNudge = getPlayersDueForNudge(players);
if (dueForNudge.length > 0) {
  const names = dueForNudge.map(p => p.name).join(', ');
  html = `
    <div class="kg-nudge-banner">
      <span class="kg-nudge-banner__icon">🎂</span>
      <span class="kg-nudge-banner__text">Time for a birthday check for ${escapeHtml(names)}!</span>
      <button class="kg-btn kg-btn--secondary kg-nudge-banner__btn" id="kg-nudge-update">Update ages</button>
      <button class="kg-nudge-banner__dismiss" aria-label="Dismiss">✕</button>
    </div>` + html;
}
```

**Step 2: Handle nudge interactions**

```javascript
// "Update ages" opens the age update form for the first due player
document.getElementById('kg-nudge-update')?.addEventListener('click', () => {
  const player = dueForNudge[0];
  showAgeUpdate(player);
});

// Dismiss records a "seen" timestamp with 7-day cooldown
document.querySelector('.kg-nudge-banner__dismiss')?.addEventListener('click', () => {
  dueForNudge.forEach(p => {
    savePlayer(p.name, { lastAgeNudgeSeen: new Date().toISOString().slice(0, 10) });
  });
  document.querySelector('.kg-nudge-banner').remove();
});
```

**Step 3: Add cooldown logic**

Update `getPlayersDueForNudge` to also check the "seen" timestamp:
```javascript
// Don't show if dismissed less than 7 days ago
const lastSeen = p.lastAgeNudgeSeen || '2000-01-01';
const daysSinceSeen = (Date.now() - new Date(lastSeen).getTime()) / 86400000;
if (daysSinceSeen < 7) return false;
```

**Step 4: `showAgeUpdate()` function**

```javascript
function showAgeUpdate(player) {
  const overlay = document.getElementById('kg-addplayer-overlay');
  document.getElementById('kg-addplayer-heading').textContent = 'Update age for ' + escapeHtml(player.name);
  document.getElementById('kg-name-input').value = player.name;
  document.getElementById('kg-name-input').disabled = true;
  document.getElementById('kg-addplayer-submit').disabled = false;
  overlay.hidden = false;
  document.getElementById('kg-player-overlay').hidden = true;

  const form = document.getElementById('kg-addplayer-form');
  const handler = (e) => {
    e.preventDefault();
    const dob = document.getElementById('kg-dob-input').value || null;
    const manualAge = document.getElementById('kg-age-input').value
      ? parseInt(document.getElementById('kg-age-input').value) : null;

    savePlayer(player.name, {
      dob: dob || player.dob,
      manualAge: dob ? null : (manualAge || player.manualAge),
      lastAgeNudge: new Date().toISOString().slice(0, 10),
    });

    overlay.hidden = true;
    document.getElementById('kg-name-input').disabled = false;
    document.getElementById('kg-addplayer-heading').textContent = 'New Player';
    form.removeEventListener('submit', handler);
    showPlayerSelect(); // Return to player list
  };
  form.addEventListener('submit', handler);
}
```

**Step 2: Add nudge CSS**

In `shared/shell.css`:

```css
.kg-nudge-banner {
  width: 100%;
  margin-bottom: var(--space-sm);
  background: var(--warning-bg);
  border-radius: var(--radius-xl);
  padding: var(--space-sm) var(--space-md);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-family: var(--font-family);
  font-weight: 700;
  font-size: var(--text-sm);
  color: var(--text-primary);
  box-sizing: border-box;
}
.kg-nudge-banner__dismiss {
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--text-lg);
  color: var(--text-secondary);
  margin-left: auto;
}
```

**Acceptance criteria:**
- Nudge appears once per year after player's first visit
- "Yep" dismisses and records the check date
- "I'm older now" opens age update form
- Updating age recalculates bracket and theme default
- Nudge is non-blocking (game is playable behind it)

**Verification:** Manually set `lastAgeNudge` to a year-old date in localStorage, reload, verify nudge appears.

**Commit:**
```bash
git add shared/shell.js shared/shell.css
git commit -m "feat: add yearly birthday/age nudge for players"
```

---

## Task 2: OS Colour Scheme Detection

**Files:**
- Modify: `shared/shell.js`

For first-time visitors (no player yet), detect OS dark/light preference and apply the appropriate default theme before the player creation overlay appears.

**Step 1: Add auto-detection in shell init**

Before `initShell()` shows the player select, apply OS preference:

```javascript
function applyOSThemePreference() {
  // Only applies if no active player (first visit or guest)
  if (getActivePlayer()) return;

  // Note: matchMedia returns false for both 'light' and 'no-preference'.
  // We default to colourful-light in both cases — intentional design decision.
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = prefersDark ? 'colourful-dark' : 'colourful-light';
  document.documentElement.setAttribute('data-theme', theme);
}
```

Call `applyOSThemePreference()` at the start of `initShell()`.

**Step 2: Listen for OS theme changes**

```javascript
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  // Only auto-switch if no player has explicitly chosen a theme
  const player = getActivePlayer();
  if (player) return; // player has their own theme preference
  const theme = e.matches ? 'colourful-dark' : 'colourful-light';
  document.documentElement.setAttribute('data-theme', theme);
});
```

**Acceptance criteria:**
- First visit on a dark-mode OS shows colourful-dark background behind the player creation overlay
- First visit on light-mode OS shows colourful-light
- Once a player is selected, their saved theme takes precedence
- OS theme changes don't override a logged-in player's choice

**Verification:** Toggle OS dark mode in browser devtools, verify theme changes for guest, doesn't change for logged-in player.

**Commit:**
```bash
git add shared/shell.js
git commit -m "feat: detect OS colour scheme for first-visit theme"
```

---

## Task 3: Reduced Motion Support

**Files:**
- Modify: `shared/tokens.css`
- Modify: `shared/shell.css`
- Modify: `games/opposites/index.html`

**Step 1: Add prefers-reduced-motion rule to tokens.css**

At the end of the file:

```css
/* Reduced motion: disable all animations for users who prefer it */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

This disables all CSS animations and transitions completely (no residual frames). Game logic timing (JS setTimeout) is unaffected. The nudge `slideDown` animation (Phase 4 Task 1) will be skipped — the nudge banner appears instantly in its final position, which is correct behaviour.

**Step 2: Ensure game logic doesn't depend on animation timing**

Check that `setTimeout` delays in games (used for advancing to next question, showing feedback, etc.) are not tied to CSS animation durations. They should use their own JS timing, which is already the case in both games.

**Acceptance criteria:**
- All CSS animations disabled when OS prefers-reduced-motion is set
- Game logic timing unaffected (JS timeouts still work)
- No jarring visual glitches when animations are disabled

**Verification:** Enable "Reduce motion" in browser devtools, navigate through hub/games, verify no animations, verify games still function.

**Commit:**
```bash
git add shared/tokens.css games/opposites/index.html
git commit -m "feat: respect prefers-reduced-motion OS setting"
```

---

## Task 4: GitHub Release Packaging

**Files:**
- Create: `.github/workflows/release.yml` (optional, manual for now)
- Modify: `build.sh`

Add a `--release` flag to `build.sh` that creates a zip archive of the built files for download.

**Step 1: Add release option to build.sh**

After the normal build completes, add:

```bash
# --- Optional: create release zip ---
if [ "${1:-}" = "--release" ]; then
  RELEASE_DIR="release"
  mkdir -p "$RELEASE_DIR"
  ZIP_NAME="kids-games-$(date +%Y%m%d).zip"

  # Create a README for the zip
  echo "Open index.html in your web browser to play." > "$RELEASE_DIR/README.txt"

  # Create zip of docs/ contents + README
  cd "$DOCS_DIR"
  zip -r "../$RELEASE_DIR/$ZIP_NAME" index.html type-trainer.html opposites.html
  cd ..
  cd "$RELEASE_DIR" && zip "$ZIP_NAME" README.txt && rm README.txt && cd ..

  echo ""
  echo "Release package: $RELEASE_DIR/$ZIP_NAME"
fi
```

**Step 2: Update .gitignore**

Add `release/` to `.gitignore`.

**Step 3: Document in README**

Add to the "Build for deployment" section:

```markdown
### Create a downloadable release package

```bash
bash build.sh --release
# Creates release/kids-games-YYYYMMDD.zip
```

**Acceptance criteria:**
- `bash build.sh` works as before (no zip)
- `bash build.sh --release` creates a zip in `release/`
- Zip contains all three HTML files (playable offline)
- `release/` directory is gitignored

**Verification:** Run `bash build.sh --release`, verify zip exists and contains the three HTML files.

**Commit:**
```bash
git add build.sh .gitignore README.md
git commit -m "feat: add --release flag to build.sh for zip packaging"
```

---

## Task 5: Build and Final Verification

**Step 1: Run the full build**

```bash
bash build.sh
```

**Step 2: Cross-browser testing checklist**

Test `docs/index.html` in:
- [ ] Chrome (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (if available)
- [ ] Chrome mobile emulator (iPhone, Android)
- [ ] Edge

For each browser:
- Create a player
- Switch themes (all 4)
- Play both games
- Verify sound works
- Verify localStorage persists on refresh

**Step 3: Accessibility spot check**

- Tab through the shell bar — all buttons focusable?
- Overlays trap focus?
- Screen reader: does "Who's playing?" heading announce?
- Theme changes don't break contrast in any theme?

**Step 4: Commit built files**

```bash
git add docs/
git commit -m "build: final regeneration with all polish features"
```

---

## Review Gate

After Task 5, review with **T2**, **U1**, **U3**:

- T2: Does reduced motion work? Colour scheme detection correct? Touch targets ok?
- U1: Does the nudge feel friendly, not confusing? Is the colourful theme still engaging?
- U3: Can a parent hand over the device in 30 seconds? Is setup flow clear?

---

## Task Dependencies

```
Task 1 (nudge) ──────────┐
Task 2 (OS theme detect) ─┤→ Task 5 (build + verify)
Task 3 (reduced motion) ──┤
Task 4 (release zip) ─────┘
```

- Tasks 1-4 are all independent and can run in parallel
- Task 5 depends on all of them
