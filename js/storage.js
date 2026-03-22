// storage.js — localStorage persistence layer
// Schema version 1, matches design doc section 3
// In-memory cache avoids redundant JSON.parse on repeated reads (W8)

const STORAGE_KEY = 'typingGame';
const CURRENT_VERSION = 1;
const MAX_NAME_LENGTH = 20;

/** @type {object|null} In-memory cache of the full data object */
let _cache = null;

/**
 * Default schema structure for a brand new data store.
 */
function createDefaultData() {
  return {
    version: CURRENT_VERSION,
    players: {}
  };
}

/**
 * Default player data for a newly created player.
 * For the 4-5 age bracket, homeRow starts as "in_progress" (they begin learning).
 * For other brackets, homeRow stays "locked" (they skip to play).
 */
function createDefaultPlayer(ageBracket) {
  const homeRowStatus = ageBracket === '4-5' ? 'in_progress' : 'locked';
  const defaultTheme = (ageBracket === '4-5' || ageBracket === '6-8') ? 'light' : 'dark';

  return {
    ageBracket,
    learnProgress: {
      homeRow: homeRowStatus,
      leftRight: 'locked',
      topRow: 'locked',
      bottomRow: 'locked',
      combined: 'locked'
    },
    highScore: 0,
    highestStage: 0,
    totalGamesPlayed: 0,
    stats: {
      accuracy: 0,
      fastestWord: null,
      longestStreak: 0,
      weakKeys: [],
      totalKeysPressed: 0,
      totalCorrect: 0
    },
    settings: {
      volume: 0.8,
      keyboardVisible: true,
      theme: defaultTheme,
      muted: false
    }
  };
}

/**
 * Sanitise a player name: strip characters that are not alphanumeric,
 * spaces, hyphens, or apostrophes. Trim whitespace. Enforce max length.
 * Prevents XSS when names are rendered with textContent (W1).
 * @param {string} name - Raw input name
 * @returns {string} Sanitised name
 */
function sanitiseName(name) {
  if (typeof name !== 'string') return '';
  return name
    .replace(/[^a-zA-Z0-9 '\-]/g, '')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

/**
 * Run migrations if data version is behind current.
 * Stub for now — future migrations go here.
 */
function migrate(data) {
  if (!data.version) {
    data.version = CURRENT_VERSION;
  }
  // Future: if (data.version === 1) { ... data.version = 2; }
  return data;
}

/**
 * Write the data object to localStorage.
 * Internal helper — updates cache as a side-effect.
 * @param {object} data - The full game data object
 * @returns {boolean} true if write succeeded, false on error
 */
function writeToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    _cache = data;
    return true;
  } catch (e) {
    console.error('storage: failed to save', e);
    // Still update the in-memory cache so the current session works
    _cache = data;
    return false;
  }
}

/**
 * Load the entire game data object from localStorage.
 * Uses an in-memory cache to avoid redundant JSON.parse calls.
 * Returns default data if nothing saved or data is corrupt.
 * @returns {object} The full game data object
 */
export function loadGameData() {
  if (_cache !== null) {
    return _cache;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaults = createDefaultData();
      _cache = defaults;
      return defaults;
    }
    const data = JSON.parse(raw);
    const migrated = migrate(data);
    _cache = migrated;
    return migrated;
  } catch (e) {
    console.warn('storage: failed to load, resetting', e);
    const defaults = createDefaultData();
    _cache = defaults;
    return defaults;
  }
}

/**
 * Save the entire game data object to localStorage and update cache.
 * @param {object} data - The full game data object
 */
export function saveGameData(data) {
  writeToStorage(data);
}

/**
 * Get the list of player names (sorted alphabetically, case-insensitive).
 * @returns {string[]} Array of player name strings
 */
export function getPlayerList() {
  const data = loadGameData();
  return Object.keys(data.players).sort(
    (a, b) => a.toLowerCase().localeCompare(b.toLowerCase())
  );
}

/**
 * Get a single player's data by name. Returns null if not found.
 * @param {string} name - Player name to look up
 * @returns {object|null} Player data object or null
 */
export function getPlayer(name) {
  const data = loadGameData();
  return data.players[name] || null;
}

/**
 * Create a new player with the given name and age bracket.
 * Name is sanitised before storage (W1 XSS prevention).
 * Returns true if created, false if name is empty, invalid, or already exists.
 * @param {string} name - Raw player name
 * @param {string} ageBracket - Age bracket string (e.g. '4-5', '6-8', '9-12')
 * @returns {boolean} Whether the player was created
 */
export function createPlayer(name, ageBracket) {
  const clean = sanitiseName(name);
  if (!clean) return false;

  const data = loadGameData();
  if (data.players[clean]) return false;

  data.players[clean] = createDefaultPlayer(ageBracket);
  writeToStorage(data);
  return true;
}

/**
 * Save/update a single player's entire data object.
 * @param {string} name - Player name
 * @param {object} playerData - Complete player data object
 */
export function savePlayer(name, playerData) {
  const data = loadGameData();
  data.players[name] = playerData;
  writeToStorage(data);
}

/**
 * Delete a player by name. Returns true if deleted, false if not found.
 * @param {string} name - Player name to delete
 * @returns {boolean} Whether the player was found and deleted
 */
export function deletePlayer(name) {
  const data = loadGameData();
  if (!data.players[name]) return false;
  delete data.players[name];
  writeToStorage(data);
  return true;
}

/**
 * Merge stats into an existing player's stats object.
 * Only updates keys that are present in the incoming stats.
 * If the player does not exist, this is a no-op.
 * @param {string} name - Player name
 * @param {object} stats - Partial stats object to merge
 */
export function updatePlayerStats(name, stats) {
  const data = loadGameData();
  const player = data.players[name];
  if (!player) return;

  // Merge each provided stat key into the existing stats
  const existing = player.stats;
  for (const key of Object.keys(stats)) {
    if (Object.prototype.hasOwnProperty.call(existing, key)) {
      existing[key] = stats[key];
    }
  }

  writeToStorage(data);
}

/**
 * Update a player's age bracket and reset their learn progress
 * to the default for the new bracket. All play stats, settings,
 * and scores are preserved.
 * @param {string} name - Player name
 * @param {string} newBracket - New age bracket (e.g. '4-5', '6-8', '9-12')
 */
export function updatePlayerBracket(name, newBracket) {
  const player = getPlayer(name);
  if (!player) return;

  player.ageBracket = newBracket;

  // Reset learn progress to the default for the new bracket
  const homeRowStatus = newBracket === '4-5' ? 'in_progress' : 'locked';
  player.learnProgress = {
    homeRow: homeRowStatus,
    leftRight: 'locked',
    topRow: 'locked',
    bottomRow: 'locked',
    combined: 'locked'
  };

  savePlayer(name, player);
}

/**
 * Calculate current localStorage usage for the game data.
 * @returns {{ used: number, limit: number, percent: number }}
 */
export function getStorageUsage() {
  const str = JSON.stringify(loadGameData());
  const used = str.length;
  const limit = 5242880;
  return {
    used,
    limit,
    percent: Math.round((used / limit) * 100)
  };
}

/**
 * Check whether localStorage usage exceeds 80% of the 5 MB limit.
 * @returns {boolean} true if usage is above 80%
 */
export function isStorageNearFull() {
  return getStorageUsage().percent > 80;
}
