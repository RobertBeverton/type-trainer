# Assessment Personas

**Purpose:** A library of personas for reviewing Kids Games from different perspectives — code quality, accessibility, educational value, and real-world play experience.

**How to use:**
1. Pick 2-4 relevant personas before reviewing a feature or game
2. Walk through the work from each persona's perspective
3. Log issues surfaced and score the persona afterwards
4. Drop any persona that stays below 2.0 after 5+ uses

---

## Ranking System

Each persona gets scored after use on three dimensions:

| Dimension | Scale | Meaning |
|-----------|-------|---------|
| **Insight Value** | 1-5 | Did this persona surface issues others didn't? |
| **Frequency** | 1-5 | How often is this persona relevant to reviews? |
| **Uniqueness** | 1-5 | Does this persona overlap heavily with others? (5 = very unique) |

**Usefulness Score** = average of all three. Drop any persona that stays below 2.0 after 5+ uses.

---

## Current Standings

Sorted by score, then uses. Click a persona name to jump to its full definition.

### Technical Personas

| Persona | Role | Score | Uses | Trend | Best Catch |
|---------|------|:-----:|:----:|:-----:|------------|
| [T1](#t1---frontend-engineer) | Frontend Engineer | — | 0 | | Not yet used |
| [T2](#t2---accessibility--device-specialist) | Accessibility & Device | — | 0 | | Not yet used |
| [T3](#t3---educational-content-reviewer) | Educational Content | — | 0 | | Not yet used |

### User Personas

| Persona | Role | Score | Uses | Best Catch |
|---------|------|:-----:|:----:|------------|
| [U1](#u1---young-child-4-5) | Young Child (4-5) | — | 0 | Not yet used |
| [U2](#u2---older-child-8-10) | Older Child (8-10) | — | 0 | Not yet used |
| [U3](#u3---parent-setting-up) | Parent Setting Up | — | 0 | Not yet used |

---

## Technical Personas (3)

### T1 - Frontend Engineer
**Score: — · 0 uses** · [↑ standings](#current-standings)

- **Focus:** Code quality, vanilla JS patterns, Canvas 2D performance, memory management, game loop architecture, maintainability across games, build script correctness
- **Key questions:** Is the code clean and idiomatic? Are there memory leaks (event listeners, animation frames not cancelled)? Does the game loop run smoothly at 60fps? Are patterns consistent across games? Could a new game be added without untangling spaghetti?

**What to look for:**
- `requestAnimationFrame` properly cancelled on game end / screen change
- Event listeners cleaned up (especially `resize`, `keydown`)
- No global state pollution between games
- Canvas rendering efficient (not redrawing unchanged elements)
- localStorage usage safe (JSON parse wrapped, quota handled)
- `build.sh` produces correct output, no stale files
- CSS maintainable (custom properties, no magic numbers)

*Not yet used in any audit.*

### T2 - Accessibility & Device Specialist
**Score: — · 0 uses** · [↑ standings](#current-standings)

- **Focus:** WCAG 2.2 basics, color contrast, font sizes, touch targets, keyboard navigation, screen reader labels, responsive layout, cross-browser compatibility, mobile/tablet behaviour
- **Key questions:** Can a child on a cheap Android tablet play this? Do touch targets meet 44px minimum? Is contrast sufficient for young eyes? Does keyboard input work alongside touch? Does it degrade gracefully on small screens?

**What to look for:**
- Touch targets large enough for small/clumsy fingers (48px+ preferred for kids)
- Color contrast meets AA (4.5:1 text, 3:1 large text/UI)
- Font sizes readable without zooming (16px+ body, larger for game UI)
- No hover-only interactions (kids use touch)
- Viewport meta tag correct, no horizontal scroll on mobile
- On-screen keyboard doesn't obscure game area
- Canvas content has text alternatives or aria labels where meaningful
- Game playable in both portrait and landscape
- Works in Chrome, Safari, Firefox (the browsers kids actually use)

*Not yet used in any audit.*

### T3 - Educational Content Reviewer
**Score: — · 0 uses** · [↑ standings](#current-standings)

- **Focus:** Age-appropriateness of content, difficulty progression, instructional clarity, educational value, word lists and vocabulary, positive reinforcement design
- **Key questions:** Are word lists appropriate for each age bracket? Does difficulty ramp smoothly or spike? Are instructions understandable by the target age without adult help? Does the game reward effort, not just success? Would a teacher approve of the content?

**What to look for:**
- Word lists match expected reading level for each age bracket
- No words with inappropriate meanings or connotations for kids
- Difficulty progression is gradual, not cliff-like
- Instructions use simple language (short sentences, common words)
- Failure feedback is encouraging, not punishing ("Try again!" not "Wrong!")
- Scoring/streaks motivate without causing frustration
- Game teaches the skill it claims to (typing accuracy, vocabulary, etc.)
- Visual and audio feedback reinforces correct answers
- No timers so aggressive they cause anxiety in young players

*Not yet used in any audit.*

[↑ Back to standings](#current-standings)

---

## User Personas (3)

### U1 - Young Child (4-5)
**Score: — · 0 uses** · [↑ standings](#current-standings)

- **Profile:** 5 years old, just learning to read. Uses a shared family tablet. Knows their letters but not all words. Needs big, colourful targets and instant feedback. A parent is nearby but the child wants to "do it myself."
- **Tests:** Can they play without reading instructions? Are tap/click targets big enough for imprecise fingers? Is failure gentle? Do visual cues guide them without text? Is audio feedback clear and rewarding?

**What to look for:**
- Game is playable with minimal or no reading ability
- Visual cues (colours, animations, icons) communicate what to do
- Touch targets are oversized — small fingers miss easily
- Failure doesn't feel punishing (no harsh sounds, no "game over" screens that require reading to dismiss)
- Success is celebrated (sounds, animations, colour changes)
- On-screen keyboard letters are big enough to identify and tap
- Game doesn't require sustained concentration beyond 2-3 minutes per round
- No tiny "X" buttons or small UI elements needed to navigate

*Not yet used in any audit.*

### U2 - Older Child (8-10)
**Score: — · 0 uses** · [↑ standings](#current-standings)

- **Profile:** 8 years old, reads confidently, types with two fingers but getting faster. Plays independently on a laptop or tablet. Gets bored if it's too easy, frustrated if difficulty spikes. Wants to beat their own score and see progress.
- **Tests:** Does difficulty scale enough to stay interesting? Is there a reason to keep playing after the first round? Does it feel patronising? Are there enough words/challenges to avoid repetition? Can they track their own progress?

**What to look for:**
- Higher age brackets provide genuine challenge, not just longer words
- Score/streak tracking gives a reason to replay
- Player profiles let them track improvement over time
- Word repetition doesn't feel obvious within a session
- Speed/difficulty ramps to match improving skill
- Game doesn't talk down to them (no baby language at age 8+)
- Can self-serve — pick their game, choose settings, start playing without help
- Session length feels right (not over too quickly, not dragging)

*Not yet used in any audit.*

### U3 - Parent Setting Up
**Score: — · 0 uses** · [↑ standings](#current-standings)

- **Profile:** Parent in their 30s. Found the link, wants to get their child playing quickly. Might bookmark it for next time. Doesn't want to create accounts, install anything, or configure settings. Wants to glance at the screen and trust the content is appropriate.
- **Tests:** Is the landing page obvious? Can they hand the device over in under 30 seconds? Is it clear which game suits which age? Does it look trustworthy and ad-free? Can they bookmark and return without any state being lost?

**What to look for:**
- Hub page immediately communicates what this is and who it's for
- Game cards show age suitability clearly
- No account creation, no popups, no cookie banners
- Games load fast — child's patience is limited
- Age bracket selection is prominent and easy to understand
- Parent can see the game is ad-free and safe at a glance
- Bookmarking works — returning to the URL gets you back to the hub
- Player profiles persist via localStorage (no data loss between sessions)
- No unexpected sounds on page load (parent might be in a quiet setting)

*Not yet used in any audit.*

[↑ Back to standings](#current-standings)

---

## Quick Reference — Persona Selection Guide

| Reviewing... | Recommended Personas |
|--------------|---------------------|
| New game (full review) | All — T1, T2, T3, U1, U2, U3 |
| Game loop / canvas code | T1, T2 |
| Word lists / content | T3, U1, U2 |
| Difficulty / progression | T3, U1, U2 |
| UI layout / responsiveness | T2, U1, U3 |
| Hub / landing page | T2, U3 |
| Build / deployment | T1 |
| Sound / audio feedback | T3, U1, U3 |
| New age bracket | T3, U1, U2 |
| Accessibility audit | T2, U1 |
