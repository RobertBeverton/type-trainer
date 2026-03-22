// keyboard.js — On-screen keyboard rendering & highlighting
// Tasks 6, 7, 8: Keyboard HTML/CSS rendering, interaction states, visibility toggle

// ── Layout Data ────────────────────────────────────────────────
// Each row is an array of { key, zone, label? } objects.
// `key`   = the character or key name (used for matching keyboard events)
// `zone`  = finger zone name (matches data-zone CSS attribute)
// `label` = optional display label (defaults to key if omitted)
//
// UK QWERTY layout. Number row included but may be hidden for
// younger age brackets.

/** @enum {string} Finger zone constants */
const ZONE = {
  LP: 'left-pinky',
  LR: 'left-ring',
  LM: 'left-middle',
  LI: 'left-index',
  RI: 'right-index',
  RM: 'right-middle',
  RR: 'right-ring',
  RP: 'right-pinky',
};

/** @type {Array<{id: string, keys: Array<{key: string, zone: string, label?: string}>}>} */
const ROWS = [
  // Number row
  { id: 'number', keys: [
    { key: '`',  zone: ZONE.LP },
    { key: '1',  zone: ZONE.LP },
    { key: '2',  zone: ZONE.LR },
    { key: '3',  zone: ZONE.LM },
    { key: '4',  zone: ZONE.LI },
    { key: '5',  zone: ZONE.LI },
    { key: '6',  zone: ZONE.RI },
    { key: '7',  zone: ZONE.RI },
    { key: '8',  zone: ZONE.RM },
    { key: '9',  zone: ZONE.RR },
    { key: '0',  zone: ZONE.RP },
    { key: '-',  zone: ZONE.RP },
    { key: '=',  zone: ZONE.RP },
    { key: 'Backspace', label: '\u232B', zone: ZONE.RP },
  ]},
  // Top row
  { id: 'top', keys: [
    { key: 'Tab', label: 'Tab', zone: ZONE.LP },
    { key: 'Q',  zone: ZONE.LP },
    { key: 'W',  zone: ZONE.LR },
    { key: 'E',  zone: ZONE.LM },
    { key: 'R',  zone: ZONE.LI },
    { key: 'T',  zone: ZONE.LI },
    { key: 'Y',  zone: ZONE.RI },
    { key: 'U',  zone: ZONE.RI },
    { key: 'I',  zone: ZONE.RM },
    { key: 'O',  zone: ZONE.RR },
    { key: 'P',  zone: ZONE.RP },
    { key: '#',  zone: ZONE.RP },
  ]},
  // Home row
  { id: 'home', keys: [
    { key: 'CapsLock', label: 'Caps', zone: ZONE.LP },
    { key: 'A',  zone: ZONE.LP },
    { key: 'S',  zone: ZONE.LR },
    { key: 'D',  zone: ZONE.LM },
    { key: 'F',  zone: ZONE.LI },
    { key: 'G',  zone: ZONE.LI },
    { key: 'H',  zone: ZONE.RI },
    { key: 'J',  zone: ZONE.RI },
    { key: 'K',  zone: ZONE.RM },
    { key: 'L',  zone: ZONE.RR },
    { key: ';',  zone: ZONE.RP },
    { key: 'Enter', label: 'Enter', zone: ZONE.RP },
  ]},
  // Bottom row
  { id: 'bottom', keys: [
    { key: 'Shift', label: 'Shift', zone: ZONE.LP },
    { key: 'Z',  zone: ZONE.LP },
    { key: 'X',  zone: ZONE.LR },
    { key: 'C',  zone: ZONE.LM },
    { key: 'V',  zone: ZONE.LI },
    { key: 'B',  zone: ZONE.LI },
    { key: 'N',  zone: ZONE.RI },
    { key: 'M',  zone: ZONE.RI },
    { key: ',',  zone: ZONE.RM },
    { key: '.',  zone: ZONE.RR },
    { key: '/',  zone: ZONE.RP },
    { key: 'ShiftRight', label: 'Shift', zone: ZONE.RP },
  ]},
  // Space row
  { id: 'space', keys: [
    { key: 'Control', label: 'Ctrl', zone: ZONE.LP },
    { key: ' ', label: 'Space', zone: ZONE.RI },
    { key: 'Alt', label: 'Alt',  zone: ZONE.RP },
  ]},
];


// ── DOM State ──────────────────────────────────────────────────

/** @type {Map<string, HTMLElement>} key character (uppercase) → DOM element */
let keyElements = new Map();

/** @type {HTMLElement|null} */
let containerEl = null;


// ── Task 6: Rendering ──────────────────────────────────────────

/**
 * Build the keyboard DOM inside the given container element.
 * Clears any existing content and populates with UK QWERTY layout.
 * Sets aria-hidden="true" since the keyboard is decorative / non-interactive.
 * Also makes the keyboard visible by showing the .keyboard-container parent.
 * @param {HTMLElement} container - the #keyboard div from index.html
 */
export function initKeyboard(container) {
  containerEl = container;

  // Show the keyboard container (it starts as display: none)
  container.style.display = 'block';

  // Add the keyboard flex layout class and accessibility attribute
  container.classList.add('keyboard');
  container.setAttribute('aria-hidden', 'true');
  container.innerHTML = '';
  keyElements.clear();

  for (const row of ROWS) {
    const rowEl = document.createElement('div');
    rowEl.className = `keyboard-row keyboard-row--${row.id}`;

    for (const k of row.keys) {
      const keyEl = document.createElement('div');
      keyEl.className = 'key';
      keyEl.dataset.zone = k.zone;
      keyEl.dataset.key = k.key;
      keyEl.textContent = k.label ?? k.key;

      // Home-row indicator bumps on F and J
      if (k.key === 'F' || k.key === 'J') {
        keyEl.classList.add('key--home-indicator');
      }

      rowEl.appendChild(keyEl);

      // Store lookup — uppercase letter keys stored under uppercase
      keyElements.set(k.key.toUpperCase(), keyEl);
    }

    container.appendChild(rowEl);
  }
}


// ── Task 7: Interaction States ─────────────────────────────────

/**
 * Highlight the key the player should press next (target state).
 * Adds the CSS class that triggers the pulse-glow animation.
 * @param {string} key - The key character to highlight
 */
export function highlightKey(key) {
  const el = keyElements.get(key.toUpperCase());
  if (el) el.classList.add('key--target');
}

/**
 * Remove all highlight / animation classes from every key.
 * Resets all keys to idle state.
 */
export function clearHighlights() {
  for (const el of keyElements.values()) {
    el.classList.remove('key--target', 'key--correct', 'key--wrong');
  }
}

/**
 * Flash the correct-press state on a key.
 * Removes target highlight, adds bright flash animation.
 * Class auto-removes after animation ends via animationend listener.
 * @param {string} key - The key that was correctly pressed
 */
export function flashCorrect(key) {
  const el = keyElements.get(key.toUpperCase());
  if (!el) return;
  el.classList.remove('key--target');
  el.classList.add('key--correct');
  el.addEventListener('animationend', () => el.classList.remove('key--correct'), { once: true });
}

/**
 * Flash wrong-press: wrong key shakes, correct key brightens.
 * Both animations auto-cleanup via animationend listeners.
 * @param {string} wrongKey  - the key the player actually pressed
 * @param {string} correctKey - the key they should have pressed
 */
export function flashWrong(wrongKey, correctKey) {
  const wrongEl = keyElements.get(wrongKey.toUpperCase());
  const correctEl = keyElements.get(correctKey.toUpperCase());

  if (wrongEl) {
    wrongEl.classList.add('key--wrong');
    wrongEl.addEventListener('animationend', () => wrongEl.classList.remove('key--wrong'), { once: true });
  }
  if (correctEl) {
    correctEl.classList.add('key--target');
  }
}

/**
 * Set overall keyboard opacity (0-1).
 * Used by manual toggle.
 * @param {number} level - 0 to 1
 */
export function setOpacity(level) {
  if (containerEl) {
    containerEl.style.opacity = String(Math.max(0, Math.min(1, level)));
  }
}

/**
 * Show the keyboard (remove hidden class, reset opacity).
 */
export function showKeyboard() {
  if (containerEl) {
    containerEl.classList.remove('keyboard--hidden');
    containerEl.style.opacity = '1';
  }
}

/**
 * Hide the keyboard (add hidden class for fade-out + pointer-events: none).
 */
export function hideKeyboard() {
  if (containerEl) {
    containerEl.classList.add('keyboard--hidden');
  }
}

/**
 * Enable or disable spotlight mode on the keyboard.
 * In spotlight mode, all keys dim except the target key, creating a visual
 * "spotlight" effect that guides young players to the correct key.
 * @param {boolean} enabled
 */
export function setSpotlightMode(enabled) {
  if (!containerEl) return;
  containerEl.classList.toggle('keyboard--spotlight', enabled);
}


/**
 * Get the horizontal position (0-1) of a key on the keyboard.
 * Used by audio.js to vary pitch by key position.
 * @param {string} key - The key character
 * @returns {number} 0 (far left) to 1 (far right)
 */
export function getKeyPosition(key) {
  const el = keyElements.get(key.toUpperCase());
  if (!el || !containerEl) return 0.5;
  const rect = el.getBoundingClientRect();
  const containerRect = containerEl.getBoundingClientRect();
  if (containerRect.width === 0) return 0.5;
  return (rect.left - containerRect.left + rect.width / 2) / containerRect.width;
}


// ── Visibility Toggle ────────────────────────────────────────
//
// Two modes: 'show' and 'hide'. Default: 'show' (keyboard always visible).
// Toggle button cycles: show → hide → show.
// The old adaptive-fade behaviour (streak ≥5 dims keyboard) is removed —
// the keyboard now stays at full opacity with target key glow always active.

/** @type {'show'|'hide'} */
let visibilityMode = 'show';

/**
 * Toggle the keyboard visibility mode.
 * Cycles: show → hide → show.
 * @returns {'show'|'hide'}
 */
export function toggleVisibilityMode() {
  if (visibilityMode === 'show') {
    visibilityMode = 'hide';
    hideKeyboard();
  } else {
    visibilityMode = 'show';
    showKeyboard();
  }
  return visibilityMode;
}

/**
 * Get the current visibility mode.
 * @returns {'show'|'hide'}
 */
export function getVisibilityMode() {
  return visibilityMode;
}

/**
 * Set visibility mode directly.
 * @param {'show'|'hide'} mode
 */
export function setVisibilityMode(mode) {
  visibilityMode = mode;
  if (mode === 'hide') {
    hideKeyboard();
  } else {
    showKeyboard();
  }
}
