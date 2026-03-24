# Kids Games Hub - Restructure Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the type-trainer repo into a multi-game kids hub with a landing page, integrating the opposites game as the second game.

**Architecture:** Move each game's source into a `games/<name>/` folder, create a landing page at repo root, and update the build script to produce one self-contained HTML per game plus the landing page — all deployed to `docs/` via GitHub Pages.

**Tech Stack:** Vanilla HTML5/CSS3/JS (no dependencies), bash build script, GitHub Pages

---

## Key Decisions

### 1. Repo Naming

Rename GitHub repo from `type-trainer` → `kids-games`.

- URL becomes: `https://robertbeverton.github.io/kids-games/`
- Short, memorable, extensible
- Old GitHub URL will auto-redirect (GitHub handles repo renames)
- **Note:** The redirect is repo-level only. The type-trainer game moves from `/` to `/type-trainer.html`, so old direct bookmarks will land on the hub landing page instead. Acceptable for this audience.

### 2. Directory Structure

```
kids-games/
├── games/
│   ├── type-trainer/
│   │   ├── index.html           # Dev entry point (existing, paths updated)
│   │   ├── css/
│   │   │   └── style.css        # Existing type trainer styles
│   │   └── js/
│   │       ├── main.js          # Existing 8 modules
│   │       ├── play.js
│   │       ├── audio.js
│   │       ├── stages.js
│   │       ├── keyboard.js
│   │       ├── storage.js
│   │       ├── adaptive.js
│   │       └── utils.js
│   └── opposites/
│       └── index.html           # Self-contained single file
│
├── hub.html                     # Landing page source (root level, simple single file)
├── build.sh                     # Master build script (replaces existing)
├── README.md                    # Updated for multi-game repo
├── .gitignore
│
└── docs/                        # GitHub Pages root
    ├── index.html               # Landing page (copied from hub.html)
    ├── type-trainer.html         # Type trainer (built from games/type-trainer/)
    ├── opposites.html            # Opposites game (copied from games/opposites/)
    └── plans/                   # Planning docs (NOTE: publicly accessible via Pages)
```

**Key structural decisions:**
- Landing page lives at root as `hub.html` — no need for a dedicated `landing/` directory for a single file
- No `dist/` intermediate directory — build writes directly to `docs/` since that's the only deployment target. Self-contained games are just copied straight to `docs/`, no point in a two-hop copy.
- `docs/plans/` remains here — these are publicly accessible via GitHub Pages, which is acceptable for planning docs on a personal project.

### 3. Landing Page Design

A card-based game picker matching the playful visual style:

- Same `Nunito` font, warm `#FFF8E7` background, floating gradient shapes
- Responsive grid of game cards
- Each card: game emoji/icon, title, short description, age range badge
- Cards link to their respective game HTML files
- CSS `:hover` and `:active` interaction feedback on cards (important for younger kids who need visible response)
- No JavaScript needed — pure HTML/CSS
- Includes favicon (emoji-based SVG) and Open Graph meta tags for nice link previews

**Card design:**
```
┌─────────────────────┐
│     ⌨️              │
│   Type Trainer       │
│   Learn to type!     │
│   [Ages 4-12+]      │
│                      │
│   ► Play             │
└─────────────────────┘
```

### 4. Build System Updates

The existing `build.sh` does:
1. Concatenate 8 JS files in order
2. Strip import/export statements
3. Inline CSS + JS into HTML template
4. Copy to dist/ and docs/ (as `docs/index.html`)

Updated `build.sh` will:
1. **Type Trainer:** Same inline build, but source from `games/type-trainer/`, output directly to `docs/type-trainer.html`
2. **Opposites:** Simple copy from `games/opposites/index.html` → `docs/opposites.html`
3. **Landing Page:** Simple copy from `hub.html` → `docs/index.html`

**CRITICAL:** The old build.sh writes to `docs/index.html` as the type trainer. The new script must write the type trainer to `docs/type-trainer.html` and the landing page to `docs/index.html`. Getting this wrong would overwrite the landing page with the game.

**Adding a new game checklist:**
1. Create `games/<name>/index.html` (and subfolders if modular)
2. Add build/copy step to `build.sh`
3. **Update `hub.html`** with a new game card (manual step)
4. Run build, test, commit

### 5. Game Navigation

Each game gets a "Back to Games" link:

- **Type Trainer:** Integrated into the existing HUD bar as the leftmost element (avoids collision with existing score/buttons)
- **Opposites & simple games:** Floating top-left corner link, styled to match the game's theme
- Links to `index.html` (the landing page, relative path)
- Doesn't interfere with gameplay

### 6. What Changes for Existing Type Trainer

- Source files move from root to `games/type-trainer/`
- `index.html` internal paths stay the same (css/style.css, js/*.js are relative)
- `build.sh` source paths updated for new location
- Build output changes from `docs/index.html` → `docs/type-trainer.html`
- Build output naming changes from `typing-game.html` → `type-trainer.html`
- "Back to Games" nav link added to HUD bar
- No functional changes to the game itself

### 7. What Changes for Opposites Game

- **Prerequisite:** The opposites game HTML exists as a local file but is NOT yet in the repo. It must be added to git first (not `git mv` — it's untracked).
- Placed at `games/opposites/index.html`
- "Back to Games" navigation link added
- No other changes needed (already self-contained)
- Future: build out features (player profiles, difficulty modes, etc.) — separate effort

### 8. localStorage Namespacing

All games share the same origin when served via GitHub Pages. To prevent key collisions:

- Type trainer already uses keys like `players`, `currentPlayer`, etc. These should be prefixed with `typetrainer_` (or left as-is for backwards compatibility and migrated later)
- Opposites game (and all future games) should namespace keys: `opposites_scores`, etc.
- **For this restructure:** No migration of existing type trainer keys (would break saved player data). Just establish the convention for new games going forward.

### 9. GitHub Repo Rename

**Must happen AFTER all code changes are committed and pushed.** The rename changes the remote URL, so having uncommitted work during a rename creates confusion.

Steps:
1. Commit and push all restructuring changes (tasks 1-8)
2. Rename repo via GitHub Settings → General → Repository name: `type-trainer` → `kids-games`
3. Update local remote: `git remote set-url origin https://github.com/RobertBeverton/kids-games.git`
4. Verify push works to new remote

---

## Scope / Out of Scope

**In scope:**
- Directory restructuring
- Landing page creation (with favicon + OG meta tags)
- Build script update
- Opposites game integration (as-is)
- "Back to Games" nav on each game
- README update
- Repo rename (GitHub) — after all changes pushed

**Out of scope (future work):**
- Building out opposites game features (profiles, difficulty, stages)
- Shared CSS/theme system across games
- Adding more games
- Service worker / PWA support
- Analytics
- Migrating existing type trainer localStorage keys

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Build script breaks | Test build before and after restructure |
| Build overwrites landing page | Explicit separate output paths: type-trainer.html vs index.html |
| GitHub Pages URL change | GitHub auto-redirects at repo level; game URL changes from `/` to `/type-trainer.html` (acceptable) |
| Local dev workflow change | Document new paths in README |
| localStorage collisions | Namespace convention for new games; defer migration of existing keys |
| Opposites game not in git | Add file to git before restructuring (not git mv) |

---

## Task Overview (high-level)

1. **Add opposites game to repo** — git add the untracked file
2. **Create directory structure** — mkdir games/type-trainer, games/opposites
3. **Move type trainer source** — git mv css/, js/, index.html into games/type-trainer/
4. **Move opposites game** — git mv opposites-game.html → games/opposites/index.html
5. **Create landing page** — hub.html at repo root with game cards, favicon, OG tags
6. **Add "Back to Games" nav** — HUD integration for type trainer, floating link for opposites
7. **Update build.sh** — new source paths, multi-game output, landing page copy
8. **Test build** — verify all three HTML files in docs/ work correctly
9. **Update README** — new repo description and structure
10. **Commit and push** — all changes on current remote
11. **Rename repo on GitHub** — type-trainer → kids-games (manual step)
12. **Update git remote** — point to new repo URL
