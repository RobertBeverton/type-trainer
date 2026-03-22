// main.js — Entry point, game state machine
// Implements: Player Selection (Task 4), Mode Selection (Task 5), Mobile Gate

import { loadGameData, createPlayer, getPlayerList, getPlayer, deletePlayer, savePlayer, saveGameData, updatePlayerStats, updatePlayerBracket } from './storage.js';
import { initAudio, setupMuteButton, applyPlayerAudioSettings } from './audio.js';
import { initKeyboard, highlightKey, clearHighlights, flashCorrect, flashWrong, toggleVisibilityMode } from './keyboard.js';
import { getStagesForBracket } from './stages.js';
import { startGame as startPlayGame, cleanupPlay } from './play.js';
// Note: In concatenated build, startPlayGame alias is lost.
// play.js exports 'startGame', so the build will use that name directly.
// main.js's local function is 'enterPlayMode' to avoid collision.
import './adaptive.js';
import { startLearn as startLearnMode, cleanupLearn } from './learn.js';
import { trapFocus, releaseFocus } from './utils.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** @type {{ name: string, data: object } | null} */
let currentPlayer = null;

/** @type {'playerSelect' | 'modeSelect' | 'learn' | 'play'} */
let appState = 'playerSelect';

// ---------------------------------------------------------------------------
// DOM references (resolved once on DOMContentLoaded)
// ---------------------------------------------------------------------------

let overlay = null;
let mobileGate = null;

// ---------------------------------------------------------------------------
// Utility: focus management (Fix C2)
// ---------------------------------------------------------------------------

/**
 * Focus an element, adding tabindex="-1" if needed so non-interactive
 * elements (headings, divs) can receive programmatic focus.
 * @param {HTMLElement|null} el
 */
function focusElement(el) {
  if (!el) return;
  // Only set tabindex on non-natively-focusable elements (headings, divs)
  // Setting tabindex="-1" on buttons/inputs removes them from tab order
  const nativelyFocusable = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
  if (!nativelyFocusable && !el.getAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1');
  }
  el.focus();
}

// ---------------------------------------------------------------------------
// Utility: DOM helpers
// ---------------------------------------------------------------------------

/** Create an element with optional class(es) and textContent. */
function el(tag, classNames, text) {
  const node = document.createElement(tag);
  if (classNames) {
    const classes = Array.isArray(classNames) ? classNames : classNames.split(' ');
    classes.forEach(c => { if (c) node.classList.add(c); });
  }
  if (text !== undefined && text !== null) {
    node.textContent = text;
  }
  return node;
}

// ---------------------------------------------------------------------------
// Mobile / Touch Gate
// ---------------------------------------------------------------------------

/**
 * Detect whether the device is touch-only (no physical keyboard).
 * Show the mobile gate if so, and dismiss it on a real keydown event.
 */
function initMobileGate() {
  mobileGate = document.getElementById('mobile-gate');
  if (!mobileGate) return;

  const isTouchOnly = ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    && !window.matchMedia('(pointer: fine)').matches;

  if (isTouchOnly) {
    mobileGate.hidden = false;

    // Allow dismissal when a real keyboard event fires
    const dismissOnKey = (e) => {
      // Ignore virtual keyboard keys that fire on touch
      // A real keyboard event from a physical keyboard will have isTrusted = true
      if (e.isTrusted && e.key.length === 1) {
        mobileGate.hidden = true;
        window.removeEventListener('keydown', dismissOnKey);
      }
    };
    window.addEventListener('keydown', dismissOnKey);
  } else {
    mobileGate.hidden = true;
  }
}

// ---------------------------------------------------------------------------
// Theme management
// ---------------------------------------------------------------------------

/**
 * Return the default theme for a given age bracket.
 * 4-5 and 6-8 → light; 9-12 and Adult → dark.
 * @param {string} ageBracket
 * @returns {'light' | 'dark'}
 */
function getDefaultThemeForBracket(ageBracket) {
  return (ageBracket === '4-5' || ageBracket === '6-8') ? 'light' : 'dark';
}

/**
 * Apply a theme ('light' or 'dark') to the document and update toggle icons.
 * @param {'light' | 'dark'} theme
 */
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeToggleIcons(theme);
}

/**
 * Update all theme toggle button icons to reflect the current theme.
 * Shows sun (☀) in dark mode (click to go light), moon (🌙) in light mode (click to go dark).
 * @param {'light' | 'dark'} theme
 */
function updateThemeToggleIcons(theme) {
  const icon = theme === 'dark' ? '\u2600' : '\uD83C\uDF19';
  document.querySelectorAll('.theme-icon').forEach(el => {
    el.textContent = icon;
  });
}

/**
 * Toggle between light and dark theme. Saves preference to current player.
 * @returns {'light' | 'dark'} The new theme
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);

  // Save to current player's settings
  if (currentPlayer) {
    const playerData = getPlayer(currentPlayer.name);
    if (playerData) {
      playerData.settings = playerData.settings || {};
      playerData.settings.theme = next;
      savePlayer(currentPlayer.name, playerData);
      currentPlayer.data = playerData;
    }
  }

  return next;
}

// ---------------------------------------------------------------------------
// Reusable arrow-key navigation for radio groups (H11)
// ---------------------------------------------------------------------------

/**
 * Add arrow-key, Home and End navigation to a radio group container.
 * Works with any container whose children have role="radio".
 * Uses the 'active' class that already exists on the radio buttons
 * (either 'selected' for bracket-btn or 'mode-btn--active' for mode-btn).
 * @param {HTMLElement} container - The [role="radiogroup"] container
 */
function setupRadioGroupKeys(container) {
  container.addEventListener('keydown', (e) => {
    const radios = Array.from(container.querySelectorAll('[role="radio"]'));
    const currentIdx = radios.findIndex(r => r.getAttribute('aria-checked') === 'true');
    if (currentIdx === -1) return;

    let newIdx = currentIdx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      newIdx = (currentIdx + 1) % radios.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      newIdx = (currentIdx - 1 + radios.length) % radios.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      newIdx = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newIdx = radios.length - 1;
    } else {
      return;
    }

    // Update aria and tabindex
    radios.forEach((r, i) => {
      r.setAttribute('aria-checked', i === newIdx ? 'true' : 'false');
      r.setAttribute('tabindex', i === newIdx ? '0' : '-1');
      // Support both class conventions used in the codebase
      if (i === newIdx) {
        r.classList.add('mode-btn--active');
        r.classList.add('selected');
      } else {
        r.classList.remove('mode-btn--active');
        r.classList.remove('selected');
      }
    });
    radios[newIdx].focus();
    radios[newIdx].click(); // trigger the selection handler
  });
}

// ---------------------------------------------------------------------------
// Age bracket labels
// ---------------------------------------------------------------------------

/** Human-readable label for each age bracket. */
const BRACKET_LABELS = {
  '4-5': 'ages 4-5',
  '6-8': 'ages 6-8',
  '9-12': 'ages 9-12',
  'Adult': 'Adult'
};

// ---------------------------------------------------------------------------
// Task 4: Player Selection Screen
// ---------------------------------------------------------------------------

function showPlayerSelect() {
  cleanupAll();
  appState = 'playerSelect';
  overlay.innerHTML = '';
  overlay.hidden = false;
  overlay.style.display = 'flex';
  overlay.className = 'overlay overlay--player-select';

  // Remove simplified HUD (no player selected)
  const hud = document.querySelector('.hud');
  if (hud) hud.classList.remove('hud--simplified');

  // Game title branding
  const titleEl = el('h1', 'game-title', 'Type Trainer');
  titleEl.id = 'overlay-heading';
  overlay.appendChild(titleEl);
  overlay.appendChild(el('p', 'game-tagline', "Who\u2019s playing?"));

  const players = getPlayerList();
  const grid = el('div', 'player-grid');
  grid.setAttribute('role', 'list');
  grid.setAttribute('aria-label', 'Player profiles');

  let firstCard = null;

  players.forEach(name => {
    const playerData = getPlayer(name);
    if (!playerData) return;

    const card = el('div', 'player-card');
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', '0');
    const bracketLabel = BRACKET_LABELS[playerData.ageBracket] || playerData.ageBracket;
    card.setAttribute('aria-label', `${name}, ${bracketLabel}`);

    // Avatar (first letter)
    card.appendChild(el('div', 'player-card-avatar', name.charAt(0).toUpperCase()));

    // Name
    card.appendChild(el('span', 'player-card-name', name));

    // Age bracket badge
    card.appendChild(el('span', 'player-card-badge', bracketLabel));

    // Stats mini-grid
    const statsDiv = el('div', 'player-card-stats');
    const highScore = playerData.highScore || 0;
    const highestStage = playerData.highestStage || 0;
    const stats = playerData.stats || {};
    const fw = stats.fastestWord;

    // Best score
    const scoreStatDiv = el('div', 'player-card-stat');
    const scoreValueEl = el('span', 'player-card-stat-value', highScore > 0 ? `\uD83C\uDFC6 ${highScore.toLocaleString()}` : '\u2014');
    if (highScore > 0) {
      scoreValueEl.classList.add('player-card-stat-value--score');
      scoreValueEl.style.cssText = 'font-size: 1.1em; font-weight: 700;';
    }
    scoreStatDiv.appendChild(scoreValueEl);
    scoreStatDiv.appendChild(el('span', 'player-card-stat-label', 'Best score'));
    statsDiv.appendChild(scoreStatDiv);

    // Stage reached
    const stageStatDiv = el('div', 'player-card-stat');
    stageStatDiv.appendChild(el('span', 'player-card-stat-value', highestStage > 0 ? `Stg ${highestStage}` : '\u2014'));
    stageStatDiv.appendChild(el('span', 'player-card-stat-label', 'Stage'));
    statsDiv.appendChild(stageStatDiv);

    // Fastest word (if any)
    if (fw) {
      const fwDiv = el('div', 'player-card-stat');
      fwDiv.appendChild(el('span', 'player-card-stat-value', fw.word));
      fwDiv.appendChild(el('span', 'player-card-stat-label', `${(fw.ms / 1000).toFixed(1)}s fastest`));
      statsDiv.appendChild(fwDiv);
    }

    // Games played
    const gamesPlayed = playerData.totalGamesPlayed || 0;
    const gamesDiv = el('div', 'player-card-stat');
    gamesDiv.appendChild(el('span', 'player-card-stat-value', gamesPlayed > 0 ? String(gamesPlayed) : '\u2014'));
    gamesDiv.appendChild(el('span', 'player-card-stat-label', 'Games'));
    statsDiv.appendChild(gamesDiv);

    card.appendChild(statsDiv);

    // Click / keyboard navigation
    const doSelect = () => selectPlayer(name);
    card.addEventListener('click', (e) => {
      if (e.target.closest('.player-card-delete')) return;
      doSelect();
    });
    card.addEventListener('keydown', (e) => {
      if (e.target.closest('.player-card-delete')) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doSelect(); }
    });

    // Delete button (top-right, absolute)
    const deleteBtn = el('button', 'player-card-delete', '\u00D7');
    deleteBtn.setAttribute('aria-label', `Delete ${name}`);
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showDeleteConfirmation(name);
    });
    card.appendChild(deleteBtn);

    grid.appendChild(card);
    if (!firstCard) firstCard = card;
  });

  // Add Player card
  const addCard = el('div', ['player-card', 'player-card--add']);
  addCard.setAttribute('role', 'button');
  addCard.setAttribute('tabindex', '0');
  addCard.setAttribute('aria-label', 'Add new player');
  addCard.appendChild(el('div', 'player-card-add-icon', '+'));
  addCard.appendChild(el('span', 'player-card-add-label', 'Add Player'));
  addCard.addEventListener('click', () => showAddPlayer());
  addCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showAddPlayer(); }
  });
  grid.appendChild(addCard);

  // Top score banner (AD5): show when 2+ players exist and at least one has a score
  if (players.length >= 2) {
    const allPlayerData = players.map(name => ({ name, data: getPlayer(name) }));
    const topPlayer = allPlayerData.reduce((best, p) =>
      (p.data && p.data.highScore > (best.data ? best.data.highScore : 0)) ? p : best
    , allPlayerData[0]);

    if (topPlayer && topPlayer.data && topPlayer.data.highScore > 0) {
      const banner = el('div', 'top-score-banner');
      banner.style.cssText = 'text-align: center; padding: 12px; margin-bottom: 16px; border-radius: 8px; background: var(--surface); font-size: 16px;';
      banner.textContent = `\uD83C\uDFC6 Top Score: ${topPlayer.name} \u2014 ${topPlayer.data.highScore.toLocaleString()}`;
      overlay.appendChild(banner);
    }
  }

  overlay.appendChild(grid);

  // Footer credit
  const footer = el('div', 'game-footer');
  const credit = document.createTextNode('Created by Robert Beverton \u00B7 v1.2.0 \u00B7 ');
  footer.appendChild(credit);
  const feedbackLink = document.createElement('a');
  feedbackLink.href = 'https://github.com/RobertBeverton/type-trainer/issues';
  feedbackLink.target = '_blank';
  feedbackLink.rel = 'noopener noreferrer';
  feedbackLink.textContent = 'Feedback & Ideas';
  footer.appendChild(feedbackLink);
  overlay.appendChild(footer);

  requestAnimationFrame(() => {
    focusElement(firstCard || addCard);
  });
}

// ---------------------------------------------------------------------------
// Fix W3: Custom Delete Confirmation (in-overlay, not window.confirm)
// ---------------------------------------------------------------------------

/**
 * Show an in-overlay confirmation panel for deleting a player.
 * Focus moves to the "No, keep" button (safe option).
 * @param {string} name - Player name to confirm deletion of
 */
function showDeleteConfirmation(name) {
  // Build a confirmation panel overlaid inside the existing overlay
  const confirmPanel = el('div', 'delete-confirm-panel');
  confirmPanel.setAttribute('role', 'alertdialog');
  confirmPanel.setAttribute('aria-modal', 'true');
  confirmPanel.setAttribute('aria-label', `Confirm deletion of ${name}`);

  const confirmText = el('p', 'delete-confirm-text');
  confirmText.innerHTML = `Delete ${name}?<br>All progress will be lost.<br>This cannot be undone.`;
  confirmPanel.appendChild(confirmText);

  const btnRow = el('div', 'delete-confirm-buttons');

  // "Yes, delete" button — danger styled
  const yesBtn = el('button', ['btn', 'btn-sm', 'btn-danger'], 'Yes, delete');
  yesBtn.setAttribute('aria-label', `Confirm delete ${name}`);
  yesBtn.addEventListener('click', () => {
    releaseFocus();
    deletePlayer(name);
    // Clear last player reference if we just deleted them
    try {
      if (localStorage.getItem('typingGame_lastPlayer') === name) {
        localStorage.removeItem('typingGame_lastPlayer');
      }
    } catch (_) {}
    showPlayerSelect(); // Refresh list
  });
  btnRow.appendChild(yesBtn);

  // "No, keep" button — primary styled (safe option)
  const noBtn = el('button', ['btn', 'btn-sm', 'btn-primary'], 'No, keep');
  noBtn.setAttribute('aria-label', `Cancel, keep ${name}`);
  noBtn.addEventListener('click', () => {
    releaseFocus();
    confirmPanel.remove();
  });
  btnRow.appendChild(noBtn);

  confirmPanel.appendChild(btnRow);
  overlay.appendChild(confirmPanel);

  // Escape key cancels the dialog (Fix C5)
  confirmPanel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      releaseFocus();
      confirmPanel.remove();
    }
  });

  // Trap focus within the confirmation dialog (Fix C5)
  trapFocus(confirmPanel);

  // Focus the safe option (Fix C2 + Fix W3)
  requestAnimationFrame(() => {
    focusElement(noBtn);
  });
}

// ---------------------------------------------------------------------------
// Task 4: Add Player Form
// ---------------------------------------------------------------------------

/**
 * Render the add-player form: name input with visible label, age bracket picker,
 * and start button. Focus goes to the name input (Fix C2).
 */
function showAddPlayer() {
  overlay.innerHTML = '';
  overlay.className = 'overlay';

  // Title
  overlay.appendChild(el('h2', null, 'New Player'));

  // Visible label (Fix C3)
  const label = el('label', 'input-label', 'Your name');
  label.setAttribute('for', 'player-name-input');
  overlay.appendChild(label);

  // Name input
  const nameInput = document.createElement('input');
  nameInput.id = 'player-name-input';
  nameInput.className = 'input-field';
  nameInput.setAttribute('maxlength', '20');
  nameInput.setAttribute('autocomplete', 'off');
  nameInput.setAttribute('type', 'text');
  overlay.appendChild(nameInput);

  // Age question
  overlay.appendChild(el('p', null, 'How old is the player?'));

  // Bracket picker
  const brackets = ['4-5', '6-8', '9-12', 'Adult'];
  const picker = el('div', 'bracket-picker');
  picker.setAttribute('role', 'radiogroup');
  picker.setAttribute('aria-label', 'Age bracket');

  let selectedBracket = null;

  brackets.forEach((bracket, idx) => {
    const btn = el('button', 'bracket-btn', bracket);
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', 'false');
    btn.setAttribute('tabindex', idx === 0 ? '0' : '-1');
    btn.setAttribute('type', 'button');
    btn.addEventListener('click', () => {
      // Deselect siblings
      picker.querySelectorAll('.bracket-btn').forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-checked', 'false');
        b.setAttribute('tabindex', '-1');
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-checked', 'true');
      btn.setAttribute('tabindex', '0');
      selectedBracket = bracket;
      updateStartBtn();
      // Theme is applied on submit (selectPlayer), not here (Fix M17)
    });
    picker.appendChild(btn);
  });

  setupRadioGroupKeys(picker);
  overlay.appendChild(picker);

  // Error message container (hidden by default)
  const errorMsg = el('p', 'input-error');
  errorMsg.setAttribute('role', 'alert');
  errorMsg.setAttribute('aria-live', 'polite');
  errorMsg.hidden = true;
  overlay.appendChild(errorMsg);

  // Start button — disabled until name + bracket selected
  const startBtn = el('button', ['btn', 'btn-primary', 'btn-lg'], "Let's go!");
  startBtn.disabled = true;
  startBtn.setAttribute('type', 'button');
  overlay.appendChild(startBtn);

  /** Enable start button only when name is non-empty and bracket is selected. */
  function updateStartBtn() {
    const hasName = nameInput.value.trim().length > 0;
    startBtn.disabled = !(hasName && selectedBracket);
  }

  nameInput.addEventListener('input', updateStartBtn);

  startBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name || !selectedBracket) return;

    // Check for duplicate
    if (getPlayer(name)) {
      errorMsg.textContent = `"${name}" already exists. Choose a different name.`;
      errorMsg.hidden = false;
      focusElement(nameInput);
      return;
    }

    errorMsg.hidden = true;
    const created = createPlayer(name, selectedBracket);
    if (created) {
      selectPlayer(name);
    } else {
      errorMsg.textContent = 'Could not create player. Try a different name.';
      errorMsg.hidden = false;
      focusElement(nameInput);
    }
  });

  // Allow Enter key in the name input to trigger start
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !startBtn.disabled) {
      e.preventDefault();
      startBtn.click();
    }
  });

  // Back button
  const backBtn = el('button', ['btn', 'btn-secondary', 'btn-sm'], 'Back');
  backBtn.setAttribute('type', 'button');
  backBtn.addEventListener('click', () => {
    // Reset theme to light when going back (no player selected)
    setTheme('light');
    showPlayerSelect();
  });
  overlay.appendChild(backBtn);

  // Focus management (Fix C2): focus the name input
  requestAnimationFrame(() => {
    focusElement(nameInput);
  });
}

// ---------------------------------------------------------------------------
// Task 4: Select Player
// ---------------------------------------------------------------------------

/**
 * Set the current player and apply their theme, then show mode select.
 * @param {string} name - Player name
 */
function selectPlayer(name) {
  const data = getPlayer(name);
  if (!data) return;

  currentPlayer = { name, data };

  // Apply saved theme preference, falling back to bracket default
  const theme = (data.settings && data.settings.theme) || getDefaultThemeForBracket(data.ageBracket);
  setTheme(theme);

  // Apply player's audio settings
  applyPlayerAudioSettings(data.settings);

  // Simplified HUD for youngest players (hides streak + keyboard toggle)
  const hud = document.querySelector('.hud');
  if (hud) {
    hud.classList.toggle('hud--simplified', data.ageBracket === '4-5');
  }

  // Remember last selected player for early theme application on reload
  try { localStorage.setItem('typingGame_lastPlayer', name); } catch (_) {}

  // Proceed to mode selection
  showModeSelect();
}

// ---------------------------------------------------------------------------
// Task 5: Mode Selection Screen
// ---------------------------------------------------------------------------

/**
 * Calculate learn progress from a player's learnProgress object.
 * Returns { completed, total } where completed is the number of lessons
 * with status 'complete' and total is the total number of lessons.
 * @param {object} learnProgress
 * @returns {{ completed: number, total: number }}
 */
function getLearnProgressSummary(learnProgress) {
  if (!learnProgress) return { completed: 0, total: 5 };
  const lessons = ['homeRow', 'leftRight', 'topRow', 'bottomRow', 'combined'];
  let completed = 0;
  lessons.forEach(key => {
    if (learnProgress[key] === 'complete') {
      completed++;
    }
  });
  return { completed, total: lessons.length };
}

/**
 * Render the mode selection screen into the overlay.
 * Shows Learn and Play buttons with age-adaptive prominence.
 * Learn button shows progress if any lessons completed (Fix W10).
 * Focus management: focuses the prominent button (Fix C2).
 */
function showModeSelect() {
  cleanupAll(); // Fix W4: clean up any active mode
  appState = 'modeSelect';
  overlay.innerHTML = '';
  overlay.hidden = false;
  overlay.style.display = 'flex';
  overlay.className = 'overlay';

  if (!currentPlayer) {
    showPlayerSelect();
    return;
  }

  const { name, data } = currentPlayer;
  const bracket = data.ageBracket;

  // Greeting
  const heading = el('h2', null, `Hi, ${name}!`);
  heading.id = 'overlay-heading';
  overlay.appendChild(heading);

  // Tappable age badge (T13 / AD4)
  const ageBadge = document.createElement('button');
  ageBadge.className = 'age-badge-btn';
  ageBadge.textContent = `Ages ${currentPlayer.data.ageBracket} \u270F`;
  ageBadge.setAttribute('aria-label', `Change age bracket, currently ${currentPlayer.data.ageBracket}`);
  ageBadge.setAttribute('type', 'button');

  ageBadge.addEventListener('click', () => {
    // Toggle accordion
    let accordion = document.getElementById('bracket-accordion');
    if (accordion) {
      accordion.remove();
      return;
    }
    accordion = document.createElement('div');
    accordion.id = 'bracket-accordion';
    accordion.style.cssText = 'display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; justify-content: center;';

    const brackets = ['4-5', '6-8', '9-12', 'Adult'];
    accordion.setAttribute('role', 'radiogroup');
    accordion.setAttribute('aria-label', 'Change age bracket');
    brackets.forEach(b => {
      const isActive = b === currentPlayer.data.ageBracket;
      const btn = document.createElement('button');
      btn.className = 'mode-btn' + (isActive ? ' mode-btn--active' : '');
      btn.textContent = b;
      btn.style.cssText = 'min-width: 60px; padding: 8px 16px;';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
      btn.addEventListener('click', () => {
        if (b === currentPlayer.data.ageBracket) return;
        // Update bracket
        updatePlayerBracket(currentPlayer.name, b);
        currentPlayer.data = getPlayer(currentPlayer.name);
        // Apply theme
        const theme = (b === '4-5' || b === '6-8') ? 'light' : 'dark';
        setTheme(theme);
        // Refresh the mode select screen
        showModeSelect();
      });
      accordion.appendChild(btn);
    });

    setupRadioGroupKeys(accordion);

    // Insert after the badge
    ageBadge.parentNode.insertBefore(accordion, ageBadge.nextSibling);
  });

  overlay.appendChild(ageBadge);

  // Speed slider
  const speedPref = (data.settings && data.settings.speedPreference) || 1.0;
  const speedSection = document.createElement('div');
  speedSection.style.cssText = 'display: flex; align-items: center; gap: 12px; margin: 8px 0 4px; width: 100%; max-width: 280px; justify-content: center;';
  const speedLabel = document.createElement('label');
  speedLabel.textContent = 'Speed';
  speedLabel.style.cssText = 'font-size: 13px; font-weight: 600; color: var(--text-secondary); min-width: 44px;';
  speedLabel.setAttribute('for', 'speed-slider');
  const speedSlider = document.createElement('input');
  speedSlider.type = 'range';
  speedSlider.id = 'speed-slider';
  speedSlider.min = '0.5';
  speedSlider.max = '3.0';
  speedSlider.step = '0.1';
  speedSlider.value = String(speedPref);
  speedSlider.style.cssText = 'flex: 1; accent-color: var(--btn-primary-bg);';
  speedSlider.setAttribute('aria-label', 'Game speed');
  const speedValue = document.createElement('span');
  speedValue.style.cssText = 'font-size: 13px; font-weight: 700; color: var(--text-primary); min-width: 36px; text-align: right;';
  speedValue.textContent = speedPref.toFixed(1) + 'x';
  speedSlider.addEventListener('input', () => {
    const val = parseFloat(speedSlider.value);
    speedValue.textContent = val.toFixed(1) + 'x';
    // Save immediately
    const player = getPlayer(name);
    if (player) {
      if (!player.settings) player.settings = {};
      player.settings.speedPreference = val;
      savePlayer(name, player);
      currentPlayer.data = player;
    }
  });
  speedSection.appendChild(speedLabel);
  speedSection.appendChild(speedSlider);
  speedSection.appendChild(speedValue);
  overlay.appendChild(speedSection);

  overlay.appendChild(el('p', null, 'What would you like to do?'));

  // Mode buttons container
  const buttonsContainer = el('div', 'mode-select-buttons');

  // --- Learn button ---
  const learnBtn = document.createElement('button');
  learnBtn.className = 'mode-btn';
  learnBtn.setAttribute('type', 'button');

  const learnTitle = el('span', 'mode-btn-title', 'Learn');
  learnBtn.appendChild(learnTitle);

  // Learn description with progress (Fix W10)
  const learnProgress = getLearnProgressSummary(data.learnProgress);
  let learnDescText = 'Explore the keyboard at your own pace';
  const learnDesc = el('span', 'mode-btn-desc');

  if (learnProgress.completed >= learnProgress.total) {
    // All complete — show checkmark
    learnDescText = 'Learn to type \u2714';
  } else if (learnProgress.completed > 0) {
    // Partial progress — show count
    learnDescText = `Learn to type \u2014 ${learnProgress.completed}/${learnProgress.total} complete`;
  }
  learnDesc.textContent = learnDescText;

  // Progress dots for partial completion (Fix W10)
  if (learnProgress.completed > 0 && learnProgress.completed < learnProgress.total) {
    const dotsContainer = el('span', 'mode-btn-dots');
    dotsContainer.setAttribute('aria-hidden', 'true');
    const lessons = ['homeRow', 'leftRight', 'topRow', 'bottomRow', 'combined'];
    lessons.forEach(key => {
      const dot = el('span', 'progress-dot');
      if (data.learnProgress[key] === 'complete') {
        dot.classList.add('filled');
      }
      dotsContainer.appendChild(dot);
    });
    learnBtn.appendChild(learnDesc);
    learnBtn.appendChild(dotsContainer);
  } else {
    learnBtn.appendChild(learnDesc);
  }

  learnBtn.addEventListener('click', () => {
    appState = 'learn';
    enterLearnMode();
  });

  // --- Play button ---
  const playBtn = document.createElement('button');
  playBtn.className = 'mode-btn';
  playBtn.setAttribute('type', 'button');

  const playTitle = el('span', 'mode-btn-title', 'Play');
  playBtn.appendChild(playTitle);

  const playDesc = el('span', 'mode-btn-desc', 'Type falling letters before they land!');
  playBtn.appendChild(playDesc);

  playBtn.addEventListener('click', () => {
    appState = 'play';
    enterPlayMode();
  });

  // --- Prominence logic based on age bracket ---
  // 4-5 and 6-8: Learn prominent, Play subtle, Learn first
  // 9-12 and Adult: Play prominent, Learn subtle, Play first
  let prominentBtn, subtleBtn;

  if (bracket === '4-5' || bracket === '6-8') {
    learnBtn.classList.add('prominent');
    playBtn.classList.add('subtle');
    buttonsContainer.appendChild(learnBtn);
    buttonsContainer.appendChild(playBtn);
    prominentBtn = learnBtn;
    subtleBtn = playBtn;
  } else {
    playBtn.classList.add('prominent');
    learnBtn.classList.add('subtle');
    buttonsContainer.appendChild(playBtn);
    buttonsContainer.appendChild(learnBtn);
    prominentBtn = playBtn;
    subtleBtn = learnBtn;
  }

  overlay.appendChild(buttonsContainer);

  // Switch Player button
  const switchBtn = el('button', ['btn', 'btn-secondary', 'btn-sm'], 'Switch Player');
  switchBtn.setAttribute('type', 'button');
  switchBtn.addEventListener('click', () => {
    currentPlayer = null;
    // Reset to light theme for player select
    setTheme('light');
    showPlayerSelect();
  });
  overlay.appendChild(switchBtn);

  // Theme toggle button (standalone, for mode select screen)
  const themeBtn = document.createElement('button');
  themeBtn.className = 'theme-toggle-standalone';
  themeBtn.setAttribute('type', 'button');
  themeBtn.setAttribute('aria-label', 'Toggle light/dark theme');
  const themeBtnIcon = el('span', 'theme-icon');
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  themeBtnIcon.textContent = currentTheme === 'dark' ? '\u2600' : '\uD83C\uDF19';
  themeBtn.appendChild(themeBtnIcon);
  const themeBtnLabel = el('span', null);
  themeBtnLabel.textContent = currentTheme === 'dark' ? 'Light mode' : 'Dark mode';
  themeBtn.appendChild(themeBtnLabel);
  themeBtn.addEventListener('click', () => {
    const newTheme = toggleTheme();
    themeBtnLabel.textContent = newTheme === 'dark' ? 'Light mode' : 'Dark mode';
  });
  overlay.appendChild(themeBtn);

  // Focus management (Fix C2): focus the prominent mode button
  requestAnimationFrame(() => {
    focusElement(prominentBtn);
  });
}

// ---------------------------------------------------------------------------
// Placeholder mode starters (replaced in later tasks)
// ---------------------------------------------------------------------------

/** Learn mode entry point — delegates to learn.js. */
function enterLearnMode() {
  if (!currentPlayer) return;
  startLearnMode(currentPlayer.name, currentPlayer.data.ageBracket);
}

/** Start Play mode — resolve stages for bracket, pass callbacks (Fix W10). */
function enterPlayMode() {
  if (!currentPlayer) return;

  const { name, data } = currentPlayer;
  const bracket = data.ageBracket;
  const stages = getStagesForBracket(bracket);

  // Hide overlay
  overlay.hidden = true;
  overlay.style.display = 'none';

  const previousHighScore = (data && data.highScore) || 0;

  // Start game with callbacks — play.js never imports from main.js
  const speedPref = (data.settings && data.settings.speedPreference) || 1.0;
  startPlayGame(bracket, stages, {
    previousHighScore,
    totalGamesPlayed: currentPlayer.data.totalGamesPlayed || 0,
    speedPreference: speedPref,
    onSpeedChange: (newSpeed) => {
      if (!currentPlayer) return;
      const p = getPlayer(currentPlayer.name);
      if (p) {
        if (!p.settings) p.settings = {};
        p.settings.speedPreference = newSpeed;
        savePlayer(currentPlayer.name, p);
        currentPlayer.data = p;
      }
    },
    onQuit: () => {
      showModeSelect();
    },
    getPlayerName: () => currentPlayer ? currentPlayer.name : 'Player',
    onGameOver: (stats) => {
      if (!currentPlayer) return;
      const player = getPlayer(currentPlayer.name);
      if (!player) return;

      // Update high score
      player.highScore = Math.max(player.highScore || 0, stats.score);
      player.highestStage = Math.max(player.highestStage || 0, stats.stageReached);
      player.totalGamesPlayed = (player.totalGamesPlayed || 0) + 1;

      // Rolling accuracy (70% historical, 30% this game)
      const prevAcc = player.stats?.accuracy || 0;
      player.stats = player.stats || {};
      player.stats.accuracy = player.totalGamesPlayed === 1
        ? stats.accuracy
        : prevAcc * 0.7 + stats.accuracy * 0.3;

      // Fastest word (keep best — overall)
      if (stats.fastestWord &&
          (!player.stats.fastestWord || stats.fastestWord.ms < player.stats.fastestWord.ms)) {
        player.stats.fastestWord = stats.fastestWord;
      }

      // Fastest word per length (merge, keeping the faster one)
      if (stats.fastestByLength) {
        player.stats.fastestByLength = player.stats.fastestByLength || {};
        for (const len of Object.keys(stats.fastestByLength)) {
          const incoming = stats.fastestByLength[len];
          const existing = player.stats.fastestByLength[len];
          if (!existing || incoming.ms < existing.ms) {
            player.stats.fastestByLength[len] = incoming;
          }
        }
      }

      // Longest streak (keep best)
      player.stats.longestStreak = Math.max(
        player.stats.longestStreak || 0,
        stats.longestStreak
      );

      // Weak keys
      player.stats.weakKeys = stats.weakKeys.slice(0, 5);

      // Totals
      player.stats.totalKeysPressed = (player.stats.totalKeysPressed || 0) + stats.totalKeysPressed;
      player.stats.totalCorrect = (player.stats.totalCorrect || 0) + stats.totalCorrect;

      savePlayer(currentPlayer.name, player);
    },
  });
}

// ---------------------------------------------------------------------------
// Mode cleanup (Fix W4 from review 2)
// ---------------------------------------------------------------------------

/**
 * Clean up all active game modes. Called at the start of every screen
 * transition to ensure no orphaned listeners or animation frames.
 */
function cleanupAll() {
  // Clean up Play mode
  try { cleanupPlay(); } catch (_) { /* play.js may not be initialised */ }
  // Clean up Learn mode
  try { cleanupLearn(); } catch (_) { /* learn.js may not be initialised */ }
}

// ---------------------------------------------------------------------------
// Expose for cross-module access
// ---------------------------------------------------------------------------

// Other modules (learn.js, play.js) will need to call back into main
// for screen transitions. Expose on window for now.
window._main = {
  showPlayerSelect,
  showModeSelect,
  getCurrentPlayer: () => currentPlayer
};

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  overlay = document.getElementById('overlay');

  // ── Early theme application ──
  // Check for a previously selected player and apply their theme immediately
  // to avoid the jarring light→dark flash when the page loads.
  try {
    const lastName = localStorage.getItem('typingGame_lastPlayer');
    if (lastName) {
      const lastPlayer = getPlayer(lastName);
      if (lastPlayer) {
        const savedTheme = (lastPlayer.settings && lastPlayer.settings.theme)
          || getDefaultThemeForBracket(lastPlayer.ageBracket);
        setTheme(savedTheme);
      }
    }
  } catch (_) {
    // localStorage unavailable — stay on default light theme
  }

  // Initialise mobile/touch gate
  initMobileGate();

  // Wire up audio mute button (Task 10)
  setupMuteButton();

  // Ensure AudioContext is created on first keydown (browser autoplay policy)
  document.addEventListener('keydown', () => { initAudio(); }, { once: true });

  // ── Keyboard initialisation (Task 6) ──
  const keyboardContainer = document.getElementById('keyboard');
  if (keyboardContainer) {
    initKeyboard(keyboardContainer);
  }

  // ── Keyboard toggle button (Task 8) ──
  // Listener attached ONCE here (Addendum 2 Fix C3: never add listeners in repeated functions)
  const toggleBtn = document.getElementById('keyboard-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const newMode = toggleVisibilityMode();
      const label = toggleBtn.querySelector('.hud-btn__label');
      if (label) {
        switch (newMode) {
          case 'adaptive':   label.textContent = 'Keyboard'; break;
          case 'force-hide': label.textContent = 'Keyboard (off)'; break;
          case 'force-show': label.textContent = 'Keyboard (on)'; break;
        }
      }
      toggleBtn.classList.toggle('hud-btn--active', newMode === 'force-show');
    });
  }

  // ── HUD theme toggle button ──
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    // Set initial icon
    const initTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const icon = themeToggleBtn.querySelector('.theme-icon');
    if (icon) icon.textContent = initTheme === 'dark' ? '\u2600' : '\uD83C\uDF19';

    themeToggleBtn.addEventListener('click', () => {
      toggleTheme();
    });
  }

  // Start with player selection
  showPlayerSelect();
});
