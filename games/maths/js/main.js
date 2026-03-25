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
  settings: document.getElementById('maths-settings'),
  game:     document.getElementById('maths-game'),
  results:  document.getElementById('maths-results'),
};

// --- Boot ---
loadSettings();
initSettingsScreen();
showScreen('settings');

// --- Initialise settings screen ---
function initSettingsScreen() {
  // Operation toggles
  document.getElementById('maths-op-row').addEventListener('click', e => {
    const btn = e.target.closest('[data-op]');
    if (!btn) return;
    settings.op = btn.dataset.op;
    updateToggles('maths-op-row', 'data-op', settings.op);
  });

  // Difficulty toggles
  document.getElementById('maths-diff-row').addEventListener('click', e => {
    const btn = e.target.closest('[data-diff]');
    if (!btn) return;
    settings.difficulty = btn.dataset.diff;
    updateToggles('maths-diff-row', 'data-diff', settings.difficulty);
    updateDifficultyHint();
    document.getElementById('maths-custom-opts').hidden = settings.difficulty !== 'custom';
  });

  // Mode buttons
  document.getElementById('maths-mode-row').addEventListener('click', e => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    settings.mode = btn.dataset.mode;
    updateModeButtons();
  });

  // Custom inputs
  document.getElementById('maths-min').addEventListener('change', e => {
    settings.custom.min = Number(e.target.value);
  });
  document.getElementById('maths-max').addEventListener('change', e => {
    settings.custom.max = Number(e.target.value);
  });
  document.getElementById('maths-table').addEventListener('change', e => {
    settings.custom.maxTable = Number(e.target.value);
  });
  document.getElementById('maths-negatives').addEventListener('change', e => {
    settings.custom.negatives = e.target.checked;
  });
  document.getElementById('maths-decimals').addEventListener('change', e => {
    settings.custom.decimals = e.target.checked;
  });

  // Start button
  document.getElementById('maths-start-btn').addEventListener('click', startGame);

  // Restore saved settings into UI
  applySettingsToUI();
}

function updateToggles(rowId, attr, activeVal) {
  document.getElementById(rowId).querySelectorAll(`[${attr}]`).forEach(btn => {
    const active = btn.dataset[attr.replace('data-', '')] === activeVal;
    btn.classList.toggle('maths-toggle--active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function updateModeButtons() {
  document.getElementById('maths-mode-row').querySelectorAll('[data-mode]').forEach(btn => {
    const active = btn.dataset.mode === settings.mode;
    btn.classList.toggle('maths-mode-btn--active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function updateDifficultyHint() {
  const preset = DIFFICULTY_PRESETS[settings.difficulty];
  document.getElementById('maths-diff-hint').textContent = preset.hint;
}

function applySettingsToUI() {
  updateToggles('maths-op-row', 'data-op', settings.op);
  updateToggles('maths-diff-row', 'data-diff', settings.difficulty);
  updateModeButtons();
  updateDifficultyHint();
  document.getElementById('maths-custom-opts').hidden = settings.difficulty !== 'custom';
  document.getElementById('maths-min').value = settings.custom.min;
  document.getElementById('maths-max').value = settings.custom.max;
  document.getElementById('maths-table').value = settings.custom.maxTable;
  document.getElementById('maths-negatives').checked = settings.custom.negatives;
  document.getElementById('maths-decimals').checked = settings.custom.decimals;
}

function getActiveRange() {
  if (settings.difficulty === 'custom') return { ...settings.custom, _difficulty: 'custom' };
  const p = DIFFICULTY_PRESETS[settings.difficulty];
  return { min: p.min, max: p.max, maxTable: p.maxTable, negatives: p.negatives, decimals: p.decimals, _difficulty: settings.difficulty };
}

// --- Screen management ---
function showScreen(name) {
  Object.keys(screens).forEach(k => screens[k].hidden = k !== name);
}

// --- Persistence ---
function saveSettings() {
  try {
    if (window.KidsGames) {
      const d = window.KidsGames.loadGameData('maths') || {};
      window.KidsGames.saveGameData('maths', { ...d, settings });
    } else {
      localStorage.setItem('maths_settings', JSON.stringify(settings));
    }
  } catch (e) { /* ignore */ }
}

function loadSettings() {
  try {
    let saved;
    if (window.KidsGames) {
      const d = window.KidsGames.loadGameData('maths');
      saved = d?.settings;
    } else {
      const raw = localStorage.getItem('maths_settings');
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
    const existing = window.KidsGames?.loadGameData('maths');
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
    onHint: () => {
      document.getElementById('maths-choices')
        ?.querySelectorAll('.maths-choice')
        .forEach(btn => {
          if (Number(btn.textContent) === activeSession._currentQuestion.answer) {
            btn.classList.add('maths-choice--hint');
          }
        });
    },
  });
  showScreen('game');
  initGameScreen();
  activeSession.start();
}

function initGameScreen() {
  const quitBtn = document.getElementById('maths-quit-btn');
  quitBtn.hidden = false;
  quitBtn.onclick = () => {
    activeSession?.end();
  };
}

// --- Question rendering ---
function renderQuestion(question, choiceNums) {
  const { left, op, right, result } = question;
  const opStr = { '+': '+', '-': '−', '*': '×', '/': '÷' }[op] ?? op;
  const safeLeft = Number(left);
  const safeRight = Number(right);
  const safeResult = Number(result);
  // Render equation with blank
  const html = `${safeLeft} ${opStr} ${safeRight} = <span class="maths-blank">?</span>`;
  const hasLargeNum = [safeLeft, safeRight, safeResult].some(n => Math.abs(n) >= 100);
  const qEl = document.getElementById('maths-question');
  qEl.innerHTML = html;
  qEl.classList.toggle('maths-question--long', hasLargeNum);

  // Render choice buttons
  const choicesEl = document.getElementById('maths-choices');
  document.activeElement?.blur();
  choicesEl.innerHTML = '';
  choiceNums.forEach(num => {
    const btn = document.createElement('button');
    btn.className = 'maths-choice';
    btn.textContent = num;
    btn.setAttribute('aria-label', `Answer: ${num}`);
    btn.addEventListener('click', () => activeSession?.answer(num));
    choicesEl.appendChild(btn);
  });
}

function renderAnswerFeedback({ correct, correctAnswer, chosen, requiresConfirmation }) {
  document.getElementById('maths-choices')?.querySelectorAll('.maths-choice').forEach(btn => {
    btn.classList.remove('maths-choice--hint');
    const num = Number(btn.textContent);
    if (num === correctAnswer) {
      btn.classList.add('maths-choice--reveal');
      if (!requiresConfirmation) btn.disabled = true;
    } else {
      btn.disabled = true;
      if (num === chosen && !correct) btn.classList.add('maths-choice--wrong');
    }
    if (num === chosen && correct) btn.classList.add('maths-choice--correct');
  });
}

function renderHud(hudState) {
  document.getElementById('maths-score').textContent = hudState.score;
  const center = document.getElementById('maths-hud-center');
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
  document.getElementById('maths-results-icon').textContent = stats.accuracy >= 80 ? '🏆' : stats.accuracy >= 50 ? '⭐' : '💪';
  document.getElementById('maths-results-title').textContent =
    stats.accuracy >= 80 ? 'Amazing!' : stats.accuracy >= 50 ? 'Well done!' : 'Keep practising!';

  const isBest = savePersonalBest(stats);

  const statsEl = document.getElementById('maths-stats');
  statsEl.innerHTML = `
    <div class="maths-stat-row">
      <span class="maths-stat-label">Score</span>
      <span class="maths-stat-value${isBest ? ' maths-stat-value--best' : ''}">${stats.score}${isBest ? ' ★' : ''}</span>
    </div>
    <div class="maths-stat-row">
      <span class="maths-stat-label">Accuracy</span>
      <span class="maths-stat-value">${stats.accuracy}%</span>
    </div>
    <div class="maths-stat-row">
      <span class="maths-stat-label">Best streak</span>
      <span class="maths-stat-value">${stats.bestStreak}</span>
    </div>
    ${stats.timeTaken ? `<div class="maths-stat-row">
      <span class="maths-stat-label">Time</span>
      <span class="maths-stat-value">${stats.timeTaken}s</span>
    </div>` : ''}
  `;

  document.getElementById('maths-play-again-btn').onclick = startGame;
  document.getElementById('maths-change-settings-btn').onclick = () => showScreen('settings');
  showScreen('results');
}

function savePersonalBest(stats) {
  const key = `pb_${settings.op}_${settings.difficulty}_${settings.mode}`;
  try {
    let current;
    if (window.KidsGames) {
      const store = window.KidsGames.loadGameData('maths') || {};
      current = store[key] || 0;
      if (stats.score > current) {
        window.KidsGames.saveGameData('maths', { ...store, [key]: stats.score });
        return true;
      }
    } else {
      current = Number(localStorage.getItem(`maths_${key}`)) || 0;
      if (stats.score > current) {
        localStorage.setItem(`maths_${key}`, stats.score);
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
