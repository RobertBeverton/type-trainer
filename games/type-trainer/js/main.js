// main.js — Entry point, game state machine
// Refactored: shell handles player selection, theme, navigation

import { loadGameData, createPlayer, getPlayerList, getPlayer, deletePlayer, savePlayer, saveGameData, updatePlayerStats, updatePlayerBracket, exportData, importData } from './storage.js';
import { initAudio, setupMuteButton, applyPlayerAudioSettings } from './audio.js';
import { initKeyboard, highlightKey, clearHighlights, flashCorrect, flashWrong, toggleVisibilityMode } from './keyboard.js';
import { getStagesForBracket } from './stages.js';
import { startGame as startPlayGame, cleanupPlay } from './play.js';
// Note: In concatenated build, startPlayGame alias is lost.
// play.js exports 'startGame', so the build will use that name directly.
// main.js's local function is 'enterPlayMode' to avoid collision.
import './adaptive.js';
import { trapFocus, releaseFocus } from './utils.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// DOM references (resolved once on DOMContentLoaded)
// ---------------------------------------------------------------------------

let overlay = null;

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
// Play mode
// ---------------------------------------------------------------------------

function enterPlayMode(bracket, speed) {
  const stages = getStagesForBracket(bracket);
  const gameData = window.KidsGames ? window.KidsGames.loadGameData('typetrainer') : {};

  startPlayGame(bracket, stages, {
    previousHighScore: gameData.highScore || 0,
    totalGamesPlayed: gameData.totalGamesPlayed || 0,
    speedPreference: speed,
    onSpeedChange: (newSpeed) => {
      if (window.KidsGames) {
        const existing = window.KidsGames.loadGameData('typetrainer');
        window.KidsGames.saveGameData('typetrainer', { ...existing, speedPreference: newSpeed });
      }
    },
    onQuit: () => { window.location.href = 'index.html'; },
    getPlayerName: () => window.KidsGames?.player?.name || 'Player',
    onGameOver: (stats) => {
      if (!window.KidsGames) return;
      const existing = window.KidsGames.loadGameData('typetrainer');

      // Rolling accuracy (70% historical, 30% this game)
      const prevAcc = existing.stats?.accuracy || 0;
      const totalGames = (existing.totalGamesPlayed || 0) + 1;
      const accuracy = totalGames === 1
        ? stats.accuracy
        : prevAcc * 0.7 + stats.accuracy * 0.3;

      // Fastest word (keep best)
      let fastestWord = existing.stats?.fastestWord || null;
      if (stats.fastestWord && (!fastestWord || stats.fastestWord.ms < fastestWord.ms)) {
        fastestWord = stats.fastestWord;
      }

      // Fastest word per length (merge, keeping the faster one)
      const fastestByLength = { ...(existing.stats?.fastestByLength || {}) };
      if (stats.fastestByLength) {
        for (const len of Object.keys(stats.fastestByLength)) {
          const incoming = stats.fastestByLength[len];
          const ex = fastestByLength[len];
          if (!ex || incoming.ms < ex.ms) fastestByLength[len] = incoming;
        }
      }

      window.KidsGames.saveGameData('typetrainer', {
        ...existing,
        highScore: Math.max(existing.highScore || 0, stats.score),
        highestStage: Math.max(existing.highestStage || 0, stats.stageReached),
        totalGamesPlayed: totalGames,
        stats: {
          ...existing.stats,
          accuracy,
          fastestWord,
          fastestByLength,
          longestStreak: Math.max(existing.stats?.longestStreak || 0, stats.longestStreak),
          weakKeys: stats.weakKeys.slice(0, 5),
          totalKeysPressed: (existing.stats?.totalKeysPressed || 0) + stats.totalKeysPressed,
          totalCorrect: (existing.stats?.totalCorrect || 0) + stats.totalCorrect,
        },
      });
    },
  });
}

function getDefaultSpeed(bracket) {
  const defaults = { '4-5': 1.0, '6-8': 1.8, '9-12': 2.3, '13+': 3.0 };
  return defaults[bracket] || 1.8;
}

function startFromShell() {
  const ctx = window.KidsGames ? window.KidsGames.player : null;
  if (!ctx) return; // shell hasn't initialised yet

  const bracket = ctx.ageBracket;
  const gameData = window.KidsGames ? window.KidsGames.loadGameData('typetrainer') : {};
  const speedPref = gameData.speedPreference || getDefaultSpeed(bracket);

  enterPlayMode(bracket, speedPref);
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
}

// ---------------------------------------------------------------------------
// Expose for cross-module access
// ---------------------------------------------------------------------------

// play.js needs to call back into main
// for screen transitions. Expose on window for now.
window._main = {
  getCurrentPlayer: () => window.KidsGames?.player
};

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  overlay = document.getElementById('overlay');

  // Wire up audio mute button
  setupMuteButton();

  // Ensure AudioContext is created on first keydown (browser autoplay policy)
  document.addEventListener('keydown', () => { initAudio(); }, { once: true });

  // Keyboard initialisation
  const keyboardContainer = document.getElementById('keyboard');
  if (keyboardContainer) {
    initKeyboard(keyboardContainer);
  }

  // Keyboard toggle button
  const toggleBtn = document.getElementById('keyboard-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const newMode = toggleVisibilityMode();
      const label = toggleBtn.querySelector('.hud-btn__label');
      if (label) {
        switch (newMode) {
          case 'show': label.textContent = 'Keyboard'; break;
          case 'hide': label.textContent = 'Keyboard (off)'; break;
        }
      }
      toggleBtn.classList.toggle('hud-btn--active', newMode === 'show');
    });
  }

  // Speed picker button
  const speedBtn = document.getElementById('speed-btn');
  const speedLabel = document.getElementById('speed-label');
  const SPEEDS = [
    { label: 'Easy', value: 1.0 },
    { label: 'Normal', value: 1.8 },
    { label: 'Hard', value: 2.3 },
    { label: 'Extra Hard', value: 3.0 },
  ];
  if (speedBtn && speedLabel) {
    speedBtn.addEventListener('click', () => {
      // Get current speed from play.js callbacks — toggle to next
      const gameData = window.KidsGames ? window.KidsGames.loadGameData('typetrainer') : {};
      const currentSpeed = gameData.speedPreference || 1.8;
      const currentIdx = SPEEDS.findIndex(s => s.value === currentSpeed);
      const next = SPEEDS[(currentIdx + 1) % SPEEDS.length];
      if (window.KidsGames) {
        const existing = window.KidsGames.loadGameData('typetrainer');
        window.KidsGames.saveGameData('typetrainer', { ...existing, speedPreference: next.value });
      }
      speedLabel.textContent = next.label;
    });
  }

  // Register for shell player changes, then start
  if (window.KidsGames) {
    window.KidsGames.onPlayerChange(() => {
      try { cleanupPlay(); } catch (_) { /* may not be active */ }
      startFromShell();
    });
    startFromShell();
  } else {
    // Fallback: no shell — start with default bracket
    enterPlayMode('6-8', 1.8);
  }
});
