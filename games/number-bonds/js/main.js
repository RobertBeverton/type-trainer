// main.js — Entry point, wires settings + game together
import { GameSession } from './game.js';

// --- Settings state ---
let settings = {
  op: '+',
  difficulty: 'medium',
  mode: 'sprint',
  custom: { min: 1, max: 100, maxTable: 12, negatives: false, decimals: false }
};

const DIFFICULTY_PRESETS = {
  easy:   { min: 1, max: 10,  maxTable: 5,  negatives: false, decimals: false, hint: 'Numbers 1–10, tables to 5' },
  medium: { min: 1, max: 20,  maxTable: 10, negatives: false, decimals: false, hint: 'Numbers 1–20, tables to 10' },
  hard:   { min: 1, max: 100, maxTable: 12, negatives: false, decimals: false, hint: 'Numbers 1–100, tables to 12' },
  custom: { hint: 'Your own settings' },
};

// --- DOM refs ---
const screens = {
  settings: document.getElementById('nb-settings'),
  game:     document.getElementById('nb-game'),
  results:  document.getElementById('nb-results'),
};

// --- Boot ---
loadSettings();
initSettingsScreen();
showScreen('settings');

// --- Initialise settings screen ---
function initSettingsScreen() {
  // Operation toggles
  document.getElementById('nb-op-row').addEventListener('click', e => {
    const btn = e.target.closest('[data-op]');
    if (!btn) return;
    settings.op = btn.dataset.op;
    updateToggles('nb-op-row', 'data-op', settings.op);
  });

  // Difficulty toggles
  document.getElementById('nb-diff-row').addEventListener('click', e => {
    const btn = e.target.closest('[data-diff]');
    if (!btn) return;
    settings.difficulty = btn.dataset.diff;
    updateToggles('nb-diff-row', 'data-diff', settings.difficulty);
    updateDifficultyHint();
    document.getElementById('nb-custom-opts').hidden = settings.difficulty !== 'custom';
  });

  // Mode buttons
  document.getElementById('nb-mode-row').addEventListener('click', e => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    settings.mode = btn.dataset.mode;
    updateModeButtons();
  });

  // Custom inputs
  document.getElementById('nb-min').addEventListener('change', e => {
    settings.custom.min = Number(e.target.value);
  });
  document.getElementById('nb-max').addEventListener('change', e => {
    settings.custom.max = Number(e.target.value);
  });
  document.getElementById('nb-table').addEventListener('change', e => {
    settings.custom.maxTable = Number(e.target.value);
  });
  document.getElementById('nb-negatives').addEventListener('change', e => {
    settings.custom.negatives = e.target.checked;
  });
  document.getElementById('nb-decimals').addEventListener('change', e => {
    settings.custom.decimals = e.target.checked;
  });

  // Start button
  document.getElementById('nb-start-btn').addEventListener('click', startGame);

  // Restore saved settings into UI
  applySettingsToUI();
}

function updateToggles(rowId, attr, activeVal) {
  document.getElementById(rowId).querySelectorAll(`[${attr}]`).forEach(btn => {
    const active = btn.dataset[attr.replace('data-', '')] === activeVal;
    btn.classList.toggle('nb-toggle--active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function updateModeButtons() {
  document.getElementById('nb-mode-row').querySelectorAll('[data-mode]').forEach(btn => {
    const active = btn.dataset.mode === settings.mode;
    btn.classList.toggle('nb-mode-btn--active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function updateDifficultyHint() {
  const preset = DIFFICULTY_PRESETS[settings.difficulty];
  document.getElementById('nb-diff-hint').textContent = preset.hint;
}

function applySettingsToUI() {
  updateToggles('nb-op-row', 'data-op', settings.op);
  updateToggles('nb-diff-row', 'data-diff', settings.difficulty);
  updateModeButtons();
  updateDifficultyHint();
  document.getElementById('nb-custom-opts').hidden = settings.difficulty !== 'custom';
  document.getElementById('nb-min').value = settings.custom.min;
  document.getElementById('nb-max').value = settings.custom.max;
  document.getElementById('nb-table').value = settings.custom.maxTable;
  document.getElementById('nb-negatives').checked = settings.custom.negatives;
  document.getElementById('nb-decimals').checked = settings.custom.decimals;
}

function getActiveRange() {
  if (settings.difficulty === 'custom') return settings.custom;
  const p = DIFFICULTY_PRESETS[settings.difficulty];
  return { min: p.min, max: p.max, maxTable: p.maxTable, negatives: p.negatives, decimals: p.decimals };
}

// --- Screen management ---
function showScreen(name) {
  Object.keys(screens).forEach(k => screens[k].hidden = k !== name);
}

// --- Persistence ---
function saveSettings() {
  try {
    if (window.KidsGames) {
      const d = window.KidsGames.loadGameData('numberbonds') || {};
      window.KidsGames.saveGameData('numberbonds', { ...d, settings });
    } else {
      localStorage.setItem('nb_settings', JSON.stringify(settings));
    }
  } catch (e) { /* ignore */ }
}

function loadSettings() {
  try {
    let saved;
    if (window.KidsGames) {
      const d = window.KidsGames.loadGameData('numberbonds');
      saved = d?.settings;
    } else {
      const raw = localStorage.getItem('nb_settings');
      saved = raw ? JSON.parse(raw) : null;
    }
    if (saved) {
      settings = { ...settings, ...saved };
    }
  } catch (e) { /* ignore */ }
  applyAgeBracketDefault();
}

function applyAgeBracketDefault() {
  // Only if no settings have been saved yet
  try {
    const existing = window.KidsGames?.loadGameData('numberbonds');
    if (existing?.settings?.difficulty) return; // already set
    const bracket = window.KidsGames?.player?.ageBracket;
    if (bracket === '4-5') settings.difficulty = 'easy';
    else if (bracket === '9-12') settings.difficulty = 'hard';
    else settings.difficulty = 'medium';
  } catch (e) { /* ignore */ }
}

// --- Game start ---
let activeSession = null;

function startGame() {
  saveSettings();
  const range = getActiveRange();
  activeSession = new GameSession({
    op: settings.op,
    mode: settings.mode,
    range,
    onQuestion: renderQuestion,
    onAnswer: renderAnswerFeedback,
    onScore: renderHud,
    onEnd: showResults,
  });
  showScreen('game');
  initGameScreen();
  activeSession.start();
}

function initGameScreen() {
  const quitBtn = document.getElementById('nb-quit-btn');
  quitBtn.hidden = settings.mode !== 'endless';
  quitBtn.onclick = () => {
    activeSession?.end();
  };
}

// --- Question rendering ---
function renderQuestion(question, choiceNums) {
  // Render equation with blank
  const { left, op, right, result, blank } = question;
  const opStr = { '+': '+', '-': '−', '*': '×', '/': '÷' }[op] ?? op;
  const safeLeft = Number(left);
  const safeRight = Number(right);
  const safeResult = Number(result);
  let html;
  if (blank === 'left') {
    html = `<span class="nb-blank">?</span> ${opStr} ${safeRight} = ${safeResult}`;
  } else {
    html = `${safeLeft} ${opStr} <span class="nb-blank">?</span> = ${safeResult}`;
  }
  const hasLargeNum = [safeLeft, safeRight, safeResult].some(n => Math.abs(n) >= 100);
  const qEl = document.getElementById('nb-question');
  qEl.innerHTML = html;
  // Shrink font if any number has 3+ digits (custom large ranges)
  qEl.classList.toggle('nb-question--long', hasLargeNum);

  // Render choice buttons
  const choicesEl = document.getElementById('nb-choices');
  choicesEl.innerHTML = '';
  choiceNums.forEach(num => {
    const btn = document.createElement('button');
    btn.className = 'nb-choice';
    btn.textContent = num;
    btn.setAttribute('aria-label', `Answer: ${num}`);
    btn.addEventListener('click', () => activeSession?.answer(num));
    choicesEl.appendChild(btn);
  });
}

function renderAnswerFeedback({ correct, correctAnswer, chosen }) {
  document.getElementById('nb-choices')?.querySelectorAll('.nb-choice').forEach(btn => {
    btn.disabled = true;
    const num = Number(btn.textContent);
    if (num === correctAnswer) btn.classList.add('nb-choice--reveal');
    if (num === chosen && !correct) btn.classList.add('nb-choice--wrong');
    if (num === chosen && correct) btn.classList.add('nb-choice--correct');
  });
}

function renderHud(hudState) {
  document.getElementById('nb-score').textContent = hudState.score;
  const center = document.getElementById('nb-hud-center');
  if (hudState.mode === 'sprint') {
    center.textContent = `⏱ ${hudState.timeLeft}s`;
  } else if (hudState.mode === 'round') {
    center.textContent = `${hudState.questionNum} / ${hudState.totalQuestions}`;
  } else {
    center.textContent = '';
  }
}

// --- Results rendering ---
function showResults(stats) {
  // Use accuracy % so thresholds work consistently across all modes and score ranges
  document.getElementById('nb-results-icon').textContent = stats.accuracy >= 80 ? '🏆' : stats.accuracy >= 50 ? '⭐' : '💪';
  document.getElementById('nb-results-title').textContent =
    stats.accuracy >= 80 ? 'Amazing!' : stats.accuracy >= 50 ? 'Well done!' : 'Keep practising!';

  const isBest = savePersonalBest(stats);

  const statsEl = document.getElementById('nb-stats');
  statsEl.innerHTML = `
    <div class="nb-stat-row">
      <span class="nb-stat-label">Score</span>
      <span class="nb-stat-value${isBest ? ' nb-stat-value--best' : ''}">${stats.score}${isBest ? ' ★' : ''}</span>
    </div>
    <div class="nb-stat-row">
      <span class="nb-stat-label">Accuracy</span>
      <span class="nb-stat-value">${stats.accuracy}%</span>
    </div>
    <div class="nb-stat-row">
      <span class="nb-stat-label">Best streak</span>
      <span class="nb-stat-value">${stats.bestStreak}</span>
    </div>
    ${stats.timeTaken ? `<div class="nb-stat-row">
      <span class="nb-stat-label">Time</span>
      <span class="nb-stat-value">${stats.timeTaken}s</span>
    </div>` : ''}
  `;

  document.getElementById('nb-play-again-btn').onclick = startGame;
  document.getElementById('nb-change-settings-btn').onclick = () => showScreen('settings');
  showScreen('results');
}

function savePersonalBest(stats) {
  const key = `pb_${settings.op}_${settings.difficulty}_${settings.mode}`;
  try {
    let current;
    if (window.KidsGames) {
      const store = window.KidsGames.loadGameData('numberbonds') || {};
      current = store[key] || 0;
      if (stats.score > current) {
        window.KidsGames.saveGameData('numberbonds', { ...store, [key]: stats.score });
        return true;
      }
    } else {
      current = Number(localStorage.getItem(`nb_${key}`)) || 0;
      if (stats.score > current) {
        localStorage.setItem(`nb_${key}`, stats.score);
        return true;
      }
    }
  } catch (e) { /* ignore */ }
  return false;
}

// --- Shell player change ---
if (window.KidsGames) {
  window.KidsGames.onPlayerChange(() => {
    loadSettings();
    applySettingsToUI();
  });
}
