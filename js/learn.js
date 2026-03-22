// learn.js — Learn mode: keyboard exploration and finger-position lessons
// Tasks 11-14: State machine, drill engine, all 5 lesson groups, Lesson Select
//
// Public API:
//   startLearn(playerName, ageBracket) — enter Learn mode from main.js
//   cleanupLearn()                     — remove listeners, hide UI (Addendum 2 Fix W4)

import { playSound } from './audio.js';
import {
  initKeyboard, highlightKey, clearHighlights, flashCorrect, showKeyboard,
} from './keyboard.js';
import { getPlayer, savePlayer } from './storage.js';
import { trapFocus, releaseFocus } from './utils.js';


// ══════════════════════════════════════════════════════════════════
// LESSON GROUP DEFINITIONS
// ══════════════════════════════════════════════════════════════════

/**
 * Finger ownership map — maps each key to its finger name.
 * Used by Group 2 (leftRight) to build prompts.
 * Consistent with keyboard.js zone colour assignments.
 */
const FINGER_MAP = {
  'Q': 'left pinky',  'A': 'left pinky',  'Z': 'left pinky',
  'W': 'left ring',   'S': 'left ring',   'X': 'left ring',
  'E': 'left middle', 'D': 'left middle', 'C': 'left middle',
  'R': 'left index',  'F': 'left index',  'V': 'left index',
  'T': 'left index',  'G': 'left index',  'B': 'left index',
  'Y': 'right index', 'H': 'right index', 'N': 'right index',
  'U': 'right index', 'J': 'right index', 'M': 'right index',
  'I': 'right middle','K': 'right middle', ',': 'right middle',
  'O': 'right ring',  'L': 'right ring',  '.': 'right ring',
  'P': 'right pinky', ';': 'right pinky', '/': 'right pinky',
};

/**
 * Age-appropriate finger names for 4-5 bracket.
 * Uses friendlier words than "pinky" / "index" for very young children.
 */
const FINGER_NAMES_YOUNG = {
  'left pinky':   'left little finger',
  'left ring':    'left ring finger',
  'left middle':  'left tall finger',
  'left index':   'left pointer finger',
  'right index':  'right pointer finger',
  'right middle': 'right tall finger',
  'right ring':   'right ring finger',
  'right pinky':  'right little finger',
};

/**
 * Get a display-friendly key label.
 * Fix W2: semicolon → "the key next to L" for 4-5 bracket.
 * Fix O5: punctuation shown as "the key that looks like this: X" for 4-5.
 * @param {string} key
 * @param {string} bracket
 * @returns {string}
 */
function displayKey(key, bracket) {
  if (bracket === '4-5') {
    if (key === ';') return 'the key next to L';
    if (key === ',') return 'the key that looks like this: ,';
    if (key === '.') return 'the key that looks like this: .';
    if (key === '/') return 'the key that looks like this: /';
  }
  return key;
}

/**
 * Get a display-friendly finger name by age bracket.
 * @param {string} fingerName
 * @param {string} bracket
 * @returns {string}
 */
function displayFinger(fingerName, bracket) {
  if (bracket === '4-5') {
    return FINGER_NAMES_YOUNG[fingerName] || fingerName;
  }
  return fingerName;
}

/** All 5 lesson groups — authoritative content for Learn mode. */
const LESSON_GROUPS = [
  {
    id: 'homeRow',
    title: 'Home Row Discovery',
    description: {
      '4-5': "Let's find the home keys!",
      '6-8': 'Learn the home row \u2014 where your fingers rest.',
      '9-12': 'Home row: the foundation of touch typing.',
      'Adult': 'Home row positioning and muscle memory.',
    },
    keys: ['A', 'S', 'D', 'F', 'J', 'K', 'L', ';'],
    introText: {
      '4-5': 'Put your fingers on the bumpy keys! Can you feel the bumps on F and J?',
      '6-8': 'Rest your fingers on A-S-D-F and J-K-L-;. Feel the little bumps on F and J? Those help you find home without looking!',
      '9-12': 'Place your fingers on A S D F (left hand) and J K L ; (right hand). The raised bumps on F and J are your anchors.',
      'Adult': 'Home row position: left hand on ASDF, right hand on JKL;. The tactile bumps on F and J provide positional reference.',
    },
    prompts: {
      '4-5': 'Find the {key} key!',
      '6-8': 'Press the {key} key!',
      '9-12': 'Press {key}',
      'Adult': 'Press {key}',
    },
    repetitions: 3,
  },
  {
    id: 'leftRight',
    title: 'Left Hand / Right Hand',
    description: {
      '4-5': 'Which hand presses which keys?',
      '6-8': 'Learn which fingers press which keys.',
      '9-12': 'Finger ownership \u2014 left and right hand zones.',
      'Adult': 'Finger-to-key assignments for both hands.',
    },
    keys: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';',
           'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
           'Z', 'X', 'C', 'V', 'B', 'N', 'M'],
    introText: {
      '4-5': "Each finger has its own special keys! Let's see which ones.",
      '6-8': 'Every key belongs to a finger. The colours on the keyboard show you which finger presses which key!',
      '9-12': 'Each finger is responsible for a column of keys. The colour zones on the keyboard show ownership.',
      'Adult': 'Each finger covers a specific zone. Colour coding shows finger assignments.',
    },
    prompts: {
      '4-5': 'Your {finger} presses {key}! Give it a try!',
      '6-8': 'Press {key} with your {finger}!',
      '9-12': '{key} \u2014 {finger}',
      'Adult': '{key} ({finger})',
    },
    repetitions: 2,
  },
  {
    id: 'topRow',
    title: 'Top Row',
    description: {
      '4-5': "Let's reach up to the top row!",
      '6-8': 'The top row: Q through P.',
      '9-12': 'Top row keys with finger assignments.',
      'Adult': 'Top row: Q-W-E-R-T-Y-U-I-O-P.',
    },
    keys: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    introText: {
      '4-5': "Now let's reach up! Keep your fingers on the home row and stretch up to the top.",
      '6-8': 'Time for the top row! Reach up from home row \u2014 your fingers come right back after each press.',
      '9-12': 'Top row: Q W E R T Y U I O P. Reach up from home row and return.',
      'Adult': 'Top row practice. Reach from home row, press, and return.',
    },
    prompts: {
      '4-5': 'Reach up and press {key}!',
      '6-8': 'Press the {key} key on the top row!',
      '9-12': 'Press {key} (top row)',
      'Adult': 'Press {key}',
    },
    repetitions: 3,
  },
  {
    id: 'bottomRow',
    title: 'Bottom Row',
    description: {
      '4-5': "Now let's go down to the bottom row!",
      '6-8': 'The bottom row: Z through M and friends.',
      '9-12': 'Bottom row keys with finger assignments.',
      'Adult': 'Bottom row: Z-X-C-V-B-N-M and punctuation.',
    },
    keys: ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'],
    introText: {
      '4-5': "Let's curl our fingers down! The bottom row is just below home.",
      '6-8': 'The bottom row is right below home. Curl your fingers down to reach these keys.',
      '9-12': 'Bottom row: Z X C V B N M , . / \u2014 curl down from home row.',
      'Adult': 'Bottom row practice. Curl down from home row and return.',
    },
    prompts: {
      '4-5': 'Curl down and press {key}!',
      '6-8': 'Press the {key} key on the bottom row!',
      '9-12': 'Press {key} (bottom row)',
      'Adult': 'Press {key}',
    },
    repetitions: 3,
  },
  {
    id: 'combined',
    title: 'Putting It Together',
    description: {
      '4-5': "You know all the keys! Let's mix them up!",
      '6-8': 'Random keys from every row \u2014 can you get them all?',
      '9-12': 'Mixed practice from all rows. 20 correct in a row to complete.',
      'Adult': 'Full keyboard review. 20 consecutive correct to complete.',
    },
    keys: ['A','S','D','F','G','H','J','K','L',';',
           'Q','W','E','R','T','Y','U','I','O','P',
           'Z','X','C','V','B','N','M',',','.','/'],
    introText: {
      '4-5': "Let's play with ALL the keys! No rush \u2014 just press the right one!",
      '6-8': 'Time to mix it all together! Keys from every row \u2014 go at your own pace.',
      '9-12': 'Mixed practice. Keys from all three rows, random order.',
      'Adult': 'Full keyboard random drill. No timer.',
    },
    prompts: {
      '4-5': 'Find the {key} key!',
      '6-8': 'Press {key}!',
      '9-12': '{key}',
      'Adult': '{key}',
    },
  },
];

/** Group-specific celebration text. */
const GROUP_CELEBRATION = {
  homeRow: {
    '4-5': 'Yay! You found all the home keys!',
    '6-8': 'Brilliant! Home row complete!',
    '9-12': 'Home row complete. Nice work.',
    'Adult': 'Home row complete.',
  },
  leftRight: {
    '4-5': 'You know which hand presses which keys! Amazing!',
    '6-8': 'Awesome! You know your finger zones!',
    '9-12': 'Finger zones mastered.',
    'Adult': 'Finger assignments complete.',
  },
  topRow: {
    '4-5': 'You reached all the top keys! So clever!',
    '6-8': "Top row done! You're getting fast!",
    '9-12': 'Top row complete.',
    'Adult': 'Top row complete.',
  },
  bottomRow: {
    '4-5': 'You found all the bottom keys! Nearly done!',
    '6-8': 'Bottom row smashed! One more to go!',
    '9-12': 'Bottom row complete.',
    'Adult': 'Bottom row complete.',
  },
  combined: {
    '4-5': "WOW! You know ALL the keys! You're a typing star!",
    '6-8': "You did it! You're ready for the game!",
    '9-12': "Full keyboard mastered. Let's play.",
    'Adult': 'Keyboard review complete.',
  },
};

/** Age-appropriate nudge text templates. */
const NUDGE_TEXT = {
  '4-5': 'Oops! Try {target} instead!',
  '6-8': 'That was {pressed} \u2014 try {target}!',
  '9-12': 'That was {pressed}. Look for {target}.',
  'Adult': '{pressed} \u2014 target is {target}.',
};

/** Lesson group ordering for sequential unlock. */
const GROUP_ORDER = ['homeRow', 'leftRight', 'topRow', 'bottomRow', 'combined'];

/** Lesson card visual state config. */
const CARD_STATES = {
  locked: {
    icon: '\uD83D\uDD12',       // lock emoji
    ariaLabel: 'Locked',
    cssClass: 'lesson-card--locked',
    interactive: false,
  },
  in_progress: {
    icon: '\u25B6',               // play triangle
    ariaLabel: 'In progress \u2014 click to continue',
    cssClass: 'lesson-card--active',
    interactive: true,
  },
  complete: {
    icon: '\u2713',               // checkmark
    ariaLabel: 'Complete \u2014 click to replay',
    cssClass: 'lesson-card--complete',
    interactive: true,
  },
};


// ══════════════════════════════════════════════════════════════════
// INTERNAL STATE
// ══════════════════════════════════════════════════════════════════

/** @type {string|null} Current player name */
let _playerName = null;

/** @type {string} Current age bracket */
let _bracket = '6-8';

/** @type {object|null} Full player data object from storage */
let _playerData = null;

/** @type {'lessonSelect'|'intro'|'drill'|'celebration'|'idle'} Current phase */
let _phase = 'idle';

/** @type {number} Which LESSON_GROUPS entry is active (-1 = none) */
let _currentGroupIndex = -1;

/** @type {string[]} Remaining keys in the standard drill queue */
let _keyQueue = [];

/** @type {number} Total keys in this drill (for progress %) */
let _totalKeys = 0;

/** @type {number} Keys answered correctly so far */
let _completedKeys = 0;

/** @type {string|null} The key the player must press right now */
let _targetKey = null;

/** @type {number|null} Timer ID for auto-hiding nudge */
let _nudgeTimeout = null;

// -- Group 5 (combined) specific state --

/** @type {number} Correct count toward completion */
let _combinedCorrect = 0;

/** @type {string[]} Last 5 keys shown, to avoid immediate repeats */
let _combinedLastKeys = [];

// -- DOM (lazy-init per Addendum 2 Fix C2) --

/** @type {HTMLElement|null} The #learn-area div */
let _learnArea = null;

/** @type {boolean} Whether lazy DOM init has run */
let _learnInited = false;

/** @type {Function|null} Bound keydown handler for cleanup */
let _keydownHandler = null;


// ══════════════════════════════════════════════════════════════════
// DOM HELPERS
// ══════════════════════════════════════════════════════════════════

/**
 * Create a DOM element with optional class(es) and textContent.
 * Always uses textContent (never innerHTML) to prevent XSS.
 * @param {string} tag
 * @param {string|string[]|null} classNames
 * @param {string|null} [text]
 * @returns {HTMLElement}
 */
function mkEl(tag, classNames, text) {
  const node = document.createElement(tag);
  if (classNames) {
    const list = Array.isArray(classNames) ? classNames : classNames.split(' ');
    list.forEach(c => { if (c) node.classList.add(c); });
  }
  if (text !== undefined && text !== null) {
    node.textContent = text;
  }
  return node;
}

/**
 * Move focus to an element, adding tabindex="-1" if it is non-interactive
 * (Fix C2 — focus management on all transitions).
 * @param {HTMLElement|null} elem
 */
function focusEl(elem) {
  if (!elem) return;
  const nativelyFocusable = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(elem.tagName);
  if (!nativelyFocusable && !elem.getAttribute('tabindex')) {
    elem.setAttribute('tabindex', '-1');
  }
  elem.focus();
}


// ══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════

/**
 * Lazily resolve Learn mode DOM references.
 * Only runs once; subsequent calls are no-ops.
 */
function initLearnDOM() {
  if (_learnInited) return;
  _learnArea = document.getElementById('learn-area');
  _learnInited = true;
}

/**
 * Fisher-Yates in-place shuffle.
 * @param {any[]} arr
 * @returns {any[]} Same array, shuffled.
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build a shuffled key queue for a lesson group.
 * Each key repeated `repetitions` times, then shuffled.
 * For the leftRight group: re-shuffles up to 50 times to ensure
 * no three consecutive keys share the same finger zone.
 * @param {object} group
 * @returns {string[]}
 */
function buildKeyQueue(group) {
  const reps = group.repetitions || 2;

  // AD8: For 4-5 bracket, filter keys to reduce lesson length
  let keys = group.keys;
  if (_bracket === '4-5') {
    if (group.id === 'homeRow') {
      // Remove semicolon — 7 keys × 3 reps = 21 presses
      keys = keys.filter(k => k !== ';');
    } else if (group.id === 'leftRight') {
      // Keep home-row + top-row only (skip bottom-row keys)
      const bottomRow = ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'];
      keys = keys.filter(k => !bottomRow.includes(k));
    }
  }

  let queue = [];
  for (let r = 0; r < reps; r++) {
    queue = queue.concat(keys);
  }
  shuffle(queue);

  // leftRight constraint: no three consecutive same-zone keys
  if (group.id === 'leftRight') {
    for (let attempt = 0; attempt < 50; attempt++) {
      let valid = true;
      for (let i = 2; i < queue.length; i++) {
        if (FINGER_MAP[queue[i - 2]] === FINGER_MAP[queue[i - 1]] &&
            FINGER_MAP[queue[i - 1]] === FINGER_MAP[queue[i]]) {
          valid = false;
          break;
        }
      }
      if (valid) break;
      shuffle(queue);
    }
  }

  return queue;
}

/**
 * Pick a random key for the combined group, avoiding the last N shown.
 * @param {string[]} allKeys
 * @param {string[]} lastKeys
 * @returns {string}
 */
function pickRandomKey(allKeys, lastKeys) {
  const available = allKeys.filter(k => !lastKeys.includes(k));
  const pool = available.length > 0 ? available : allKeys;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Get the completion threshold for Group 5 based on age bracket.
 *
 * Fix C4 — age-appropriate completion criteria:
 *   4-5:  20 cumulative (counter never decreases)
 *   6-8:  15 consecutive, wrong key reduces by 1 (NOT reset)
 *   9-12 / Adult: 20 consecutive, wrong key resets to 0
 *
 * @returns {number}
 */
function getCombinedThreshold() {
  if (_bracket === '4-5') return 20;
  if (_bracket === '6-8') return 15;
  return 20;
}

/**
 * Build the prompt text for a target key, substituting {key} and {finger}.
 * @param {object} group
 * @param {string} key
 * @returns {string}
 */
function buildPromptText(group, key) {
  if (!key) return '';
  const template = group.prompts[_bracket] || group.prompts['Adult'];
  let text = template.replace('{key}', displayKey(key, _bracket));

  if (template.includes('{finger}')) {
    const finger = FINGER_MAP[key] || 'finger';
    text = text.replace('{finger}', displayFinger(finger, _bracket));
  }
  return text;
}


// ══════════════════════════════════════════════════════════════════
// HIDE / RESTORE PLAY-MODE UI
// ══════════════════════════════════════════════════════════════════

/** Hide HUD, stage bar, play area, typed row — they belong to Play mode. */
function hidePlayUI() {
  const ids = ['hud', 'stage-bar', 'typed-row'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const playArea = document.getElementById('play-area');
  if (playArea) playArea.hidden = true;
}

/** Restore Play-mode UI to default display. */
function restorePlayUI() {
  ['hud', 'stage-bar', 'typed-row'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  });
}


// ══════════════════════════════════════════════════════════════════
// LESSON SELECT VIEW  (Task 14)
// ══════════════════════════════════════════════════════════════════

/**
 * Render the Lesson Select grid showing all 5 groups with
 * locked / in_progress / complete visual states.
 * Called on Learn mode entry and after completing a lesson.
 */
function renderLessonSelect() {
  initLearnDOM();
  _phase = 'lessonSelect';

  // Show learn area, clear previous content
  _learnArea.hidden = false;
  _learnArea.innerHTML = '';
  _learnArea.classList.add('learn-visible');

  const wrapper = mkEl('div', 'lesson-select');

  // ── Header ──
  const header = mkEl('div', 'lesson-select-header');

  const backBtn = mkEl('button', ['btn', 'btn-secondary', 'btn-sm'],
    '\u2190 Back');
  backBtn.setAttribute('aria-label', 'Back to menu');
  backBtn.addEventListener('click', () => {
    cleanupLearn();
    if (window._main && window._main.showModeSelect) {
      window._main.showModeSelect();
    }
  });
  header.appendChild(backBtn);
  wrapper.appendChild(header);

  // ── Title ──
  const title = mkEl('h2', 'lesson-select-title', 'Choose a Lesson');
  wrapper.appendChild(title);

  // ── Read progress ──
  const progress = _playerData.learnProgress || {};

  // ── Card grid ──
  const cardGrid = mkEl('div', 'lesson-cards');
  cardGrid.setAttribute('role', 'list');

  let firstInteractiveCard = null;

  LESSON_GROUPS.forEach((group, idx) => {
    const state = progress[group.id] || 'locked';
    const cs = CARD_STATES[state];

    const card = mkEl('button', 'lesson-card');
    card.classList.add(cs.cssClass);
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label',
      `${group.title} \u2014 ${cs.ariaLabel}`);

    if (!cs.interactive) {
      card.setAttribute('aria-disabled', 'true');
      card.disabled = true;
    }

    // Icon
    const icon = mkEl('span', 'lesson-card__icon', cs.icon);
    icon.setAttribute('aria-hidden', 'true');
    card.appendChild(icon);

    // Info block
    const info = mkEl('div', 'lesson-card__info');
    info.appendChild(mkEl('span', 'lesson-card__title', group.title));
    info.appendChild(mkEl('span', 'lesson-card__desc',
      group.description[_bracket] || group.description['Adult']));
    info.appendChild(mkEl('span', 'lesson-card__keys',
      group.keys.length + ' keys'));
    card.appendChild(info);

    // Interactive handler
    if (cs.interactive) {
      card.addEventListener('click', () => startLessonGroup(idx));
      if (!firstInteractiveCard) firstInteractiveCard = card;
    }

    cardGrid.appendChild(card);
  });

  wrapper.appendChild(cardGrid);

  // ── "Start Playing!" button (shown after Home Row completion) ──
  if (progress.homeRow === 'complete') {
    const label = _bracket === '4-5'
      ? "Let's play the game!"
      : 'Start Playing!';
    const playBtn = mkEl('button', ['btn', 'btn-primary', 'btn-lg'], label);
    playBtn.setAttribute('aria-label', label);
    playBtn.addEventListener('click', () => {
      cleanupLearn();
      if (window._main && window._main.showModeSelect) {
        window._main.showModeSelect();
      }
    });
    wrapper.appendChild(playBtn);
  }

  _learnArea.appendChild(wrapper);

  // Show keyboard in full-opacity, no highlights
  const kbd = document.getElementById('keyboard');
  if (kbd) {
    initKeyboard(kbd);
    showKeyboard();
  }
  clearHighlights();

  // Hide play-specific UI
  hidePlayUI();

  // Focus first interactive card (Fix C2)
  requestAnimationFrame(() => {
    focusEl(firstInteractiveCard || backBtn);
  });
}


// ══════════════════════════════════════════════════════════════════
// LESSON GROUP LIFECYCLE
// ══════════════════════════════════════════════════════════════════

/**
 * Start (or replay) a lesson group by index.
 * Validates the group is not locked, builds key queue, shows intro.
 * @param {number} groupIndex — 0-4
 */
function startLessonGroup(groupIndex) {
  const group = LESSON_GROUPS[groupIndex];
  if (!group) return;

  const progress = _playerData.learnProgress || {};
  const state = progress[group.id] || 'locked';
  if (state === 'locked') return;        // Can't enter a locked group

  _currentGroupIndex = groupIndex;

  // Reset drill state
  _completedKeys = 0;
  _targetKey = null;
  _combinedCorrect = 0;
  _combinedLastKeys = [];

  if (group.id === 'combined') {
    _keyQueue = [];                       // combined uses random picks
    _totalKeys = getCombinedThreshold();
  } else {
    _keyQueue = buildKeyQueue(group);
    _totalKeys = _keyQueue.length;
  }

  _phase = 'intro';
  renderDrillView();
}


// ══════════════════════════════════════════════════════════════════
// DRILL VIEW RENDERING
// ══════════════════════════════════════════════════════════════════

/**
 * Render the drill view for the current phase (intro / drill / celebration).
 * Replaces all content in #learn-area.
 */
function renderDrillView() {
  initLearnDOM();
  const group = LESSON_GROUPS[_currentGroupIndex];
  if (!group) return;

  _learnArea.hidden = false;
  _learnArea.innerHTML = '';
  _learnArea.classList.add('learn-visible');

  const wrapper = mkEl('div', 'learn-drill');

  // ── Header bar ──
  const header = mkEl('div', 'learn-drill-header');

  const backBtn = mkEl('button', ['btn', 'btn-secondary', 'btn-sm'],
    '\u2190 Lessons');
  backBtn.setAttribute('aria-label', 'Back to lesson list');
  backBtn.addEventListener('click', () => {
    clearHighlights();
    renderLessonSelect();
  });
  header.appendChild(backBtn);

  header.appendChild(mkEl('span', 'learn-group-name', group.title));

  // Progress text (e.g. "5 / 24" or "12 / 20")
  const progText = mkEl('span', 'learn-progress-text');
  if (group.id === 'combined') {
    progText.textContent = _combinedCorrect + ' / ' + getCombinedThreshold();
  } else {
    progText.textContent = _completedKeys + ' / ' + _totalKeys;
  }
  header.appendChild(progText);

  wrapper.appendChild(header);

  // ── Progress bar ──
  const progBar = mkEl('div', 'learn-progress-bar');
  const progFill = mkEl('div', 'learn-progress-fill');
  if (group.id === 'combined') {
    const pct = Math.min(100, (_combinedCorrect / getCombinedThreshold()) * 100);
    progFill.style.width = pct + '%';
  } else {
    progFill.style.width = ((_completedKeys / _totalKeys) * 100) + '%';
  }
  progBar.appendChild(progFill);
  wrapper.appendChild(progBar);

  // ── Prompt area ──
  const promptArea = mkEl('div', 'learn-prompt-area');

  const promptEl = mkEl('p', 'learn-prompt-text');
  if (_bracket === '4-5') promptEl.classList.add('learn-prompt--young');
  promptEl.id = 'learn-prompt';
  promptEl.setAttribute('aria-live', 'polite');

  const nudgeEl = mkEl('p', 'learn-nudge-text');
  nudgeEl.id = 'learn-nudge';
  nudgeEl.hidden = true;
  nudgeEl.setAttribute('aria-live', 'polite');

  // ── Phase-specific content ──

  if (_phase === 'intro') {
    promptEl.textContent =
      group.introText[_bracket] || group.introText['Adult'];

    const subPrompt = mkEl('p', 'learn-sub-prompt');
    subPrompt.textContent = _bracket === '4-5'
      ? 'Press any key on the keyboard to begin!'
      : 'Press any key to start';

    promptArea.appendChild(promptEl);
    promptArea.appendChild(subPrompt);

    // Intro keyboard highlights
    clearHighlights();
    if (group.id === 'homeRow') {
      highlightKey('F');
      highlightKey('J');
    } else {
      // Highlight all group keys to give a visual preview
      group.keys.forEach(k => highlightKey(k));
    }

  } else if (_phase === 'drill') {
    promptEl.textContent = buildPromptText(group, _targetKey);
    promptArea.appendChild(promptEl);
    promptArea.appendChild(nudgeEl);

    // Combined group streak display
    if (group.id === 'combined') {
      const streakEl = mkEl('p', 'learn-streak-info');
      streakEl.id = 'learn-streak-info';
      const thr = getCombinedThreshold();
      if (_bracket === '4-5') {
        const rem = thr - _combinedCorrect;
        streakEl.textContent = _combinedCorrect + ' keys so far! ' +
          rem + ' more to go!';
      } else {
        streakEl.textContent = _combinedCorrect + ' / ' + thr + ' in a row';
      }
      promptArea.appendChild(streakEl);
    }

  } else if (_phase === 'celebration') {
    const celebText = GROUP_CELEBRATION[group.id]
      ? (GROUP_CELEBRATION[group.id][_bracket] ||
         GROUP_CELEBRATION[group.id]['Adult'])
      : 'Well done!';
    promptEl.textContent = celebText;
    promptEl.classList.add('learn-celebration-text');
    promptArea.appendChild(promptEl);

    // Navigation buttons (appear after 1.5s)
    const btnWrap = mkEl('div', 'learn-celebration-buttons');

    if (group.id === 'combined') {
      // Last group: "Start Playing!" and "Play Again"
      const goLabel = _bracket === '4-5'
        ? "Let's play the game!"
        : 'Start Playing!';
      const goBtn = mkEl('button', ['btn', 'btn-primary', 'btn-lg'], goLabel);
      goBtn.addEventListener('click', () => {
        releaseFocus();
        cleanupLearn();
        if (window._main && window._main.showModeSelect) {
          window._main.showModeSelect();
        }
      });
      btnWrap.appendChild(goBtn);

      const replayBtn = mkEl('button', ['btn', 'btn-secondary'], 'Play Again');
      replayBtn.addEventListener('click', () => {
        releaseFocus();
        startLessonGroup(_currentGroupIndex);
      });
      btnWrap.appendChild(replayBtn);
    } else {
      // Not last: "Continue" and "Replay"
      const contBtn = mkEl('button', ['btn', 'btn-primary', 'btn-lg'], 'Continue');
      contBtn.addEventListener('click', () => {
        releaseFocus();
        renderLessonSelect();
      });
      btnWrap.appendChild(contBtn);

      const replayBtn = mkEl('button', ['btn', 'btn-secondary'], 'Replay');
      replayBtn.addEventListener('click', () => {
        releaseFocus();
        startLessonGroup(_currentGroupIndex);
      });
      btnWrap.appendChild(replayBtn);
    }

    // Delayed reveal so the celebration text is read first
    btnWrap.style.opacity = '0';
    promptArea.appendChild(btnWrap);

    // M6: Spawn CSS confetti on celebration
    requestAnimationFrame(() => spawnLearnConfetti(_learnArea));

    setTimeout(() => {
      btnWrap.style.transition = 'opacity 0.3s ease';
      btnWrap.style.opacity = '1';
      trapFocus(btnWrap);
    }, 1500);
  }

  wrapper.appendChild(promptArea);
  _learnArea.appendChild(wrapper);

  // Keyboard visible
  showKeyboard();

  // Hide play-specific UI
  hidePlayUI();

  // Focus for intro / drill
  if (_phase === 'intro' || _phase === 'drill') {
    requestAnimationFrame(() => focusEl(promptEl));
  }
}


// ══════════════════════════════════════════════════════════════════
// KEYPRESS HANDLING
// ══════════════════════════════════════════════════════════════════

/**
 * Root keydown handler for Learn mode.
 * Dispatches to the correct phase handler.
 * @param {KeyboardEvent} e
 */
function handleLearnKeyPress(e) {
  // Ignore modifier combos, Tab (for a11y navigation), Escape
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.key === 'Tab') return;

  if (_phase === 'intro') {
    e.preventDefault();
    transitionToDrill();
    return;
  }

  if (_phase === 'drill') {
    if (e.key.length !== 1) return;       // only printable characters
    e.preventDefault();
    handleDrillKey(e.key.toUpperCase());
    return;
  }

  // In lessonSelect / celebration / idle: keypresses are ignored
  // (buttons handle navigation)
}

/**
 * Move from intro phase into the drill, selecting the first target key.
 */
function transitionToDrill() {
  const group = LESSON_GROUPS[_currentGroupIndex];
  _phase = 'drill';

  if (group.id === 'combined') {
    _targetKey = pickRandomKey(group.keys, _combinedLastKeys);
    _combinedLastKeys.push(_targetKey);
    if (_combinedLastKeys.length > 5) _combinedLastKeys.shift();
  } else {
    _targetKey = _keyQueue.shift();
  }

  clearHighlights();
  if (_targetKey) {
    highlightKey(_targetKey);
    if (group.id === 'leftRight') highlightFingerZone(_targetKey);
  }

  renderDrillView();
}

/**
 * Handle a single key during the drill phase.
 * @param {string} pressed — uppercase character
 */
function handleDrillKey(pressed) {
  if (!_targetKey) return;

  // Normalise both sides to uppercase for comparison
  const isCorrect = pressed.toUpperCase() === _targetKey.toUpperCase();

  if (isCorrect) {
    onCorrectKey();
  } else {
    onWrongKey(pressed);
  }
}


// ── Correct / Wrong handlers ─────────────────────────────────────

/** Called when the player presses the right key. */
function onCorrectKey() {
  const group = LESSON_GROUPS[_currentGroupIndex];

  playSound('learnCorrect');
  flashCorrect(_targetKey);
  hideNudge();

  if (group.id === 'combined') {
    onCombinedCorrect();
  } else {
    onStandardCorrect();
  }
}

/** Advance the standard (non-combined) drill by one key. */
function onStandardCorrect() {
  const group = LESSON_GROUPS[_currentGroupIndex];
  _completedKeys++;

  if (_keyQueue.length === 0) {
    // All keys done — celebrate!
    completeLessonGroup();
    return;
  }

  // Next key
  _targetKey = _keyQueue.shift();
  clearHighlights();
  highlightKey(_targetKey);
  if (group.id === 'leftRight') highlightFingerZone(_targetKey);

  updateDrillUI();
}

/**
 * Advance the combined drill on a correct key.
 * Fix C4: age-appropriate completion criteria.
 */
function onCombinedCorrect() {
  const group = LESSON_GROUPS[_currentGroupIndex];
  const threshold = getCombinedThreshold();

  _combinedCorrect++;

  if (_combinedCorrect >= threshold) {
    completeLessonGroup();
    return;
  }

  // Next random key
  _targetKey = pickRandomKey(group.keys, _combinedLastKeys);
  _combinedLastKeys.push(_targetKey);
  if (_combinedLastKeys.length > 5) _combinedLastKeys.shift();

  clearHighlights();
  highlightKey(_targetKey);

  updateDrillUI();
}

/**
 * Called when the player presses the wrong key.
 * No penalty for 4-5 bracket in any group.
 * For combined group: age-specific penalty (Fix C4).
 * @param {string} pressed — the key that was actually pressed
 */
function onWrongKey(pressed) {
  const group = LESSON_GROUPS[_currentGroupIndex];

  playSound('learnNudge');
  showNudge(pressed, _targetKey);

  // Re-pulse the correct key
  clearHighlights();
  highlightKey(_targetKey);
  if (group.id === 'leftRight') highlightFingerZone(_targetKey);

  // Combined group streak penalty (Fix C4)
  if (group.id === 'combined') {
    if (_bracket === '4-5') {
      // No penalty — cumulative counter never decreases
    } else if (_bracket === '6-8') {
      // Reduce by 1, minimum 0
      _combinedCorrect = Math.max(0, _combinedCorrect - 1);
    } else {
      // 9-12 and Adult: full reset
      _combinedCorrect = 0;
    }
    updateDrillUI();
  }
}


// ── Nudge display ────────────────────────────────────────────────

/**
 * Show an encouraging nudge message below the prompt.
 * @param {string} pressed — key the player pressed
 * @param {string} target  — key they should have pressed
 */
function showNudge(pressed, target) {
  if (_nudgeTimeout) {
    clearTimeout(_nudgeTimeout);
    _nudgeTimeout = null;
  }

  const nudgeEl = document.getElementById('learn-nudge');
  if (!nudgeEl) return;

  const group = LESSON_GROUPS[_currentGroupIndex];
  let text;

  if (group && group.id === 'leftRight') {
    // Mention the correct finger for zone-learning
    const finger = FINGER_MAP[target] || 'finger';
    text = _bracket === '4-5'
      ? 'That key belongs to your ' + displayFinger(finger, _bracket) + '!'
      : 'That key belongs to your ' + finger + '!';
  } else {
    const template = NUDGE_TEXT[_bracket] || NUDGE_TEXT['Adult'];
    text = template
      .replace('{pressed}', displayKey(pressed, _bracket))
      .replace('{target}', displayKey(target, _bracket));
  }

  nudgeEl.textContent = text;
  nudgeEl.hidden = false;
  nudgeEl.classList.remove('fade-in');
  // Force reflow so animation replays
  void nudgeEl.offsetWidth;
  nudgeEl.classList.add('fade-in');

  // Auto-hide after 3 seconds
  _nudgeTimeout = setTimeout(hideNudge, 3000);
}

/** Hide the nudge element and clear its timer. */
function hideNudge() {
  if (_nudgeTimeout) {
    clearTimeout(_nudgeTimeout);
    _nudgeTimeout = null;
  }
  const nudgeEl = document.getElementById('learn-nudge');
  if (nudgeEl) {
    nudgeEl.hidden = true;
    nudgeEl.classList.remove('fade-in');
  }
}


// ── In-place UI update (avoids full re-render on every keypress) ─

/**
 * Patch the prompt text, progress bar, and streak counter
 * without tearing down and rebuilding the entire drill view.
 */
function updateDrillUI() {
  const group = LESSON_GROUPS[_currentGroupIndex];
  if (!group || !_learnArea) return;

  // Prompt text
  const promptEl = document.getElementById('learn-prompt');
  if (promptEl && _targetKey) {
    promptEl.textContent = buildPromptText(group, _targetKey);
  }

  // Progress text + fill bar
  const progText = _learnArea.querySelector('.learn-progress-text');
  const progFill = _learnArea.querySelector('.learn-progress-fill');

  if (group.id === 'combined') {
    const thr = getCombinedThreshold();
    if (progText) progText.textContent = _combinedCorrect + ' / ' + thr;
    if (progFill) {
      progFill.style.width = Math.min(100, (_combinedCorrect / thr) * 100) + '%';
    }

    // Streak info
    const streakEl = document.getElementById('learn-streak-info');
    if (streakEl) {
      if (_bracket === '4-5') {
        streakEl.textContent = _combinedCorrect + ' keys so far! ' +
          (thr - _combinedCorrect) + ' more to go!';
      } else {
        streakEl.textContent = _combinedCorrect + ' / ' + thr + ' in a row';
      }
    }
  } else {
    if (progText) progText.textContent = _completedKeys + ' / ' + _totalKeys;
    if (progFill) {
      progFill.style.width = ((_completedKeys / _totalKeys) * 100) + '%';
    }
  }
}


// ══════════════════════════════════════════════════════════════════
// CONFETTI CELEBRATION  (M6)
// ══════════════════════════════════════════════════════════════════

/**
 * Inject the confetti CSS keyframes once (idempotent).
 */
function ensureConfettiStyle() {
  if (!document.getElementById('learn-confetti-style')) {
    const style = document.createElement('style');
    style.id = 'learn-confetti-style';
    style.textContent = '@keyframes learnConfettiFall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(400px) rotate(720deg); opacity: 0; } }';
    document.head.appendChild(style);
  }
}

/**
 * Spawn CSS-only confetti pieces inside a container.
 * Pieces animate downward and clean themselves up after 3 seconds.
 * @param {HTMLElement} container — the element to place confetti over
 */
function spawnLearnConfetti(container) {
  ensureConfettiStyle();

  const colours = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const confettiContainer = document.createElement('div');
  confettiContainer.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; pointer-events: none; z-index: 100;';
  container.style.position = 'relative';
  container.appendChild(confettiContainer);

  for (let i = 0; i < 25; i++) {
    const piece = document.createElement('div');
    const size = 6 + Math.random() * 8;
    const colour = colours[Math.floor(Math.random() * colours.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const duration = 1.5 + Math.random() * 1;
    piece.style.cssText = `
      position: absolute; top: -10px; left: ${left}%;
      width: ${size}px; height: ${size}px;
      background: ${colour}; border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation: learnConfettiFall ${duration}s ease-in ${delay}s forwards;
      opacity: 0;
    `;
    confettiContainer.appendChild(piece);
  }

  // Cleanup after animations complete
  setTimeout(() => confettiContainer.remove(), 3000);
}


// ══════════════════════════════════════════════════════════════════
// LESSON COMPLETION
// ══════════════════════════════════════════════════════════════════

/**
 * Complete the current lesson group.
 * Updates storage, unlocks next group, triggers celebration phase.
 */
function completeLessonGroup() {
  const group = LESSON_GROUPS[_currentGroupIndex];
  _phase = 'celebration';

  playSound('stageClear');
  clearHighlights();

  // Persist progress
  if (!_playerData.learnProgress) _playerData.learnProgress = {};
  _playerData.learnProgress[group.id] = 'complete';

  // Unlock the next group in sequence (if any)
  const idx = GROUP_ORDER.indexOf(group.id);
  if (idx >= 0 && idx < GROUP_ORDER.length - 1) {
    const nextId = GROUP_ORDER[idx + 1];
    const nextState = _playerData.learnProgress[nextId];
    if (!nextState || nextState === 'locked') {
      _playerData.learnProgress[nextId] = 'in_progress';
    }
  }

  savePlayer(_playerName, _playerData);

  // Show celebration view
  renderDrillView();
}


// ── Zone highlighting helper ─────────────────────────────────────

/**
 * Highlight all keys in the same finger zone as `key`.
 * Used by leftRight group to visually reinforce zone ownership.
 * The target key itself is highlighted separately via highlightKey().
 * @param {string} key
 */
function highlightFingerZone(key) {
  const finger = FINGER_MAP[key];
  if (!finger) return;
  for (const [k, f] of Object.entries(FINGER_MAP)) {
    if (f === finger && k !== key) {
      highlightKey(k);
    }
  }
}


// ══════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════

/**
 * Enter Learn mode. Called by main.js when the player picks "Learn".
 *
 * @param {string} playerName — current player name
 * @param {string} ageBracket — e.g. '4-5', '6-8', '9-12', 'Adult'
 */
export function startLearn(playerName, ageBracket) {
  initLearnDOM();

  _playerName = playerName;
  _bracket = ageBracket || '6-8';
  _playerData = getPlayer(playerName);

  if (!_playerData) {
    console.warn('[learn] Player not found:', playerName);
    return;
  }

  // Ensure learnProgress exists with sensible defaults
  if (!_playerData.learnProgress) {
    _playerData.learnProgress = {
      homeRow: 'in_progress',
      leftRight: 'locked',
      topRow: 'locked',
      bottomRow: 'locked',
      combined: 'locked',
    };
    savePlayer(_playerName, _playerData);
  }

  // Safety: homeRow should always be at least in_progress
  if (_playerData.learnProgress.homeRow === 'locked') {
    _playerData.learnProgress.homeRow = 'in_progress';
    savePlayer(_playerName, _playerData);
  }

  // Hide overlay (mode-select lives there)
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.hidden = true;
    overlay.style.display = 'none';
  }

  // Attach keydown listener (one reference for cleanup)
  if (_keydownHandler) {
    document.removeEventListener('keydown', _keydownHandler);
  }
  _keydownHandler = (e) => handleLearnKeyPress(e);
  document.addEventListener('keydown', _keydownHandler);

  // Show Lesson Select as the default entry point
  renderLessonSelect();
}

/**
 * Clean up Learn mode — remove keydown listener, hide UI, restore Play UI.
 * Exported so main.js can call it during mode switches (Addendum 2 Fix W4).
 */
export function cleanupLearn() {
  // Release any active focus trap
  releaseFocus();

  // Remove keydown listener
  if (_keydownHandler) {
    document.removeEventListener('keydown', _keydownHandler);
    _keydownHandler = null;
  }

  // Clear nudge timer
  if (_nudgeTimeout) {
    clearTimeout(_nudgeTimeout);
    _nudgeTimeout = null;
  }

  // Clear keyboard visual state
  clearHighlights();

  // Hide learn area
  if (_learnArea) {
    _learnArea.hidden = true;
    _learnArea.innerHTML = '';
    _learnArea.classList.remove('learn-visible');
  }

  // Restore Play-mode chrome
  restorePlayUI();

  // Reset internal state
  _phase = 'idle';
  _currentGroupIndex = -1;
  _targetKey = null;
}
