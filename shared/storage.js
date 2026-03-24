// shared/storage.js — Player profiles and namespaced game data
// NOTE: This file is concatenated INSIDE the shell IIFE by the build script.
// Do NOT wrap in its own IIFE.

const STORAGE_PREFIX = 'kidsgames_';
const PLAYERS_KEY = STORAGE_PREFIX + 'players';
const ACTIVE_KEY = STORAGE_PREFIX + 'activePlayer';

function _read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch (e) {
    console.error('KidsGames: corrupt data for key', key, e);
    return null;
  }
}

function _write(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  } catch (e) {
    console.error('KidsGames: storage write failed', key, e);
    return false;
  }
}

// Sanitise player names: letters/numbers/spaces/hyphens/apostrophes, max 20 chars
function sanitiseName(name) {
  return name.replace(/[^\p{L}\p{N} '\-]/gu, '').trim().slice(0, 20);
}

// Escape HTML to prevent injection when inserting into innerHTML
function escapeHtml(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

function getAllPlayers() {
  return _read(PLAYERS_KEY) || {};
}

function getPlayer(name) {
  const players = getAllPlayers();
  return players[name] || null;
}

function createPlayer(name, { dob, manualAge }) {
  name = sanitiseName(name);
  if (!name) return false;
  const players = getAllPlayers();
  if (players[name]) return false; // already exists
  players[name] = {
    name: name,
    dob: dob || null,
    manualAge: dob ? null : (manualAge || null),
    theme: getDefaultTheme(dob, manualAge),
    createdAt: new Date().toISOString().slice(0, 10)
  };
  _write(PLAYERS_KEY, players);
  return true;
}

function savePlayer(name, data) {
  const players = getAllPlayers();
  players[name] = { ...players[name], ...data };
  _write(PLAYERS_KEY, players);
}

function deletePlayer(name) {
  const players = getAllPlayers();
  delete players[name];
  _write(PLAYERS_KEY, players);
  // Clean up game-specific data — match exact suffix pattern
  const suffix = '_' + name;
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith(STORAGE_PREFIX) && k.endsWith(suffix) && k !== PLAYERS_KEY && k !== ACTIVE_KEY) {
      localStorage.removeItem(k);
    }
  });
}

function getActivePlayer() {
  const name = _read(ACTIVE_KEY);
  return name ? getPlayer(name) : null;
}

function setActivePlayer(name) {
  _write(ACTIVE_KEY, name);
}

function getAgeBracket(player) {
  const age = getAge(player);
  if (age === null) return '6-8'; // fallback
  if (age <= 5) return '4-5';
  if (age <= 8) return '6-8';
  if (age <= 12) return '9-12';
  return '13+';
}

function getAge(player) {
  if (player.dob) {
    const today = new Date();
    const birth = new Date(player.dob);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }
  return player.manualAge || null;
}

function getDefaultTheme(dob, manualAge) {
  const age = dob
    ? Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000)
    : manualAge;
  if (age !== null && age <= 8) return 'colourful-light';
  return 'clean-light';
}

// Game-specific data
function loadGameData(gameId) {
  const player = getActivePlayer();
  if (!player) return {};
  return _read(STORAGE_PREFIX + gameId + '_' + player.name) || {};
}

function saveGameData(gameId, data) {
  const player = getActivePlayer();
  if (!player) return;
  _write(STORAGE_PREFIX + gameId + '_' + player.name, data);
}
