// shared/shell.js — Shell bar logic
// NOTE: The build script wraps storage.js + shell.js together in a single IIFE.
// Storage functions (getPlayer, savePlayer, etc.) are available here without import.

(function() {
  'use strict';

  // --- Expose public API ---
  const _playerChangeListeners = [];

  window.KidsGames = {
    get player() {
      const p = getActivePlayer();
      if (!p) return null;
      return { name: p.name, ageBracket: getAgeBracket(p), theme: p.theme };
    },
    get muted() { return muted; },
    loadGameData: loadGameData,
    saveGameData: saveGameData,
    onPlayerChange(fn) { _playerChangeListeners.push(fn); },
  };

  function _notifyPlayerChange() {
    const ctx = window.KidsGames.player;
    _playerChangeListeners.forEach(fn => { try { fn(ctx); } catch(e) { console.error(e); } });
  }

  // --- Games list — update when adding new games ---
  const GAMES = [
    { id: 'type-trainer',  title: 'Type Trainer',  icon: '⌨️',  url: 'type-trainer.html',  needsKeyboard: true  },
    { id: 'opposites',     title: 'Opposites',      icon: '🔄',  url: 'opposites.html',     needsKeyboard: false },
    { id: 'number-bonds',  title: 'Number Bonds',   icon: '🔢',  url: 'number-bonds.html',  needsKeyboard: false },
  ];

  // --- Volume state ---
  let muted = false;

  // --- Migration helpers ---

  function bracketToAge(bracket) {
    const map = { '4-5': 5, '6-8': 7, '9-12': 10, 'Adult': 18, '13+': 18 };
    return map[bracket] || 7;
  }

  function migrateTypeTrainerData() {
    // Only run once
    if (localStorage.getItem('kidsgames_migrated_typetrainer')) return;

    let oldPlayers;
    try {
      oldPlayers = JSON.parse(localStorage.getItem('players') || 'null');
    } catch (e) {
      console.error('KidsGames: corrupt old player data, skipping migration', e);
      localStorage.setItem('kidsgames_migrated_typetrainer', 'true');
      return;
    }

    if (!oldPlayers || !oldPlayers.players) {
      localStorage.setItem('kidsgames_migrated_typetrainer', 'true');
      return;
    }

    // Migrate each player profile
    Object.entries(oldPlayers.players).forEach(([name, data]) => {
      if (!getPlayer(name)) {
        const theme = data.settings && data.settings.theme ? data.settings.theme : 'colourful-light';
        const themeMap = { 'light': 'colourful-light', 'dark': 'colourful-dark', 'clean-light': 'colourful-light', 'clean-dark': 'colourful-dark', 'colourful-light': 'colourful-light', 'colourful-dark': 'colourful-dark' };
        createPlayer(name, { dob: null, manualAge: bracketToAge(data.ageBracket) });
        savePlayer(name, { theme: themeMap[theme] || theme });
      }
      // Migrate game-specific data
      const key = STORAGE_PREFIX + 'typetrainer_' + name;
      _write(key, {
        highScore: data.highScore || 0,
        highestStage: data.highestStage || 0,
        totalGamesPlayed: data.totalGamesPlayed || 0,
        stats: data.stats || {},
        speedPreference: (data.settings && data.settings.speedPreference) || 1.8,
      });
    });

    // Set active player from old data
    const lastPlayer = localStorage.getItem('typingGame_lastPlayer');
    if (lastPlayer && getPlayer(lastPlayer)) {
      setActivePlayer(lastPlayer);
    }

    // Clean up old keys (only if migration succeeded)
    const newPlayers = getAllPlayers();
    if (Object.keys(newPlayers).length > 0) {
      localStorage.removeItem('players');
      localStorage.removeItem('currentPlayer');
      localStorage.removeItem('typingGame_theme');
      localStorage.removeItem('typingGame_lastPlayer');
    } else {
      console.error('KidsGames: migration wrote no players — keeping old keys as backup');
    }
    localStorage.setItem('kidsgames_migrated_typetrainer', 'true');
  }

  // --- Form helpers ---
  function _resetAddPlayerForm() {
    const nameInput = document.getElementById('kg-name-input');
    nameInput.value = '';
    nameInput.disabled = false;
    document.getElementById('kg-dob-input').value = '';
    document.getElementById('kg-age-input').value = '';
    document.getElementById('kg-addplayer-submit').disabled = true;
    document.getElementById('kg-addplayer-heading').textContent = 'New Player';
    // Reset to DoB tab
    document.querySelectorAll('.kg-age-tab').forEach(tab => {
      const isDob = tab.dataset.mode === 'dob';
      tab.classList.toggle('active', isDob);
      tab.setAttribute('aria-selected', isDob ? 'true' : 'false');
    });
    document.getElementById('kg-dob-field').hidden = false;
    document.getElementById('kg-age-field').hidden = true;
  }

  function _cancelAgeUpdate() {
    const form = document.getElementById('kg-addplayer-form');
    if (form._ageUpdateHandler) {
      form.removeEventListener('submit', form._ageUpdateHandler);
      form._ageUpdateHandler = null;
    }
    _resetAddPlayerForm();
  }

  // --- Age update (from nudge banner) ---
  function showAgeUpdate(player) {
    const addOverlay = document.getElementById('kg-addplayer-overlay');
    const playerOverlay = document.getElementById('kg-player-overlay');
    _cancelAgeUpdate(); // clean up any stale handler and reset form state
    document.getElementById('kg-addplayer-heading').textContent = 'Update age for ' + escapeHtml(player.name);
    const nameInput = document.getElementById('kg-name-input');
    nameInput.value = player.name;
    nameInput.disabled = true;
    document.getElementById('kg-addplayer-submit').disabled = false;
    playerOverlay.hidden = true;
    addOverlay.hidden = false;

    const form = document.getElementById('kg-addplayer-form');
    function handler(e) {
      e.preventDefault();
      const dob = document.getElementById('kg-dob-input').value || null;
      const manualAge = document.getElementById('kg-age-input').value
        ? parseInt(document.getElementById('kg-age-input').value) : null;
      savePlayer(player.name, {
        dob: dob || player.dob,
        manualAge: dob ? null : (manualAge || player.manualAge),
        lastAgeNudge: new Date().toISOString().slice(0, 10),
      });
      addOverlay.hidden = true;
      _cancelAgeUpdate();
      showPlayerSelect();
    }
    form._ageUpdateHandler = handler;
    form.addEventListener('submit', handler);
  }

  // --- OS colour scheme detection ---
  function applyOSThemePreference() {
    // Only applies if no active player (first visit or guest)
    if (getActivePlayer()) return;
    // Default to colourful-light for both light and no-preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDark ? 'colourful-dark' : 'colourful-light';
    document.documentElement.setAttribute('data-theme', theme);
  }

  // --- Init ---
  let _initialized = false;  // guard against double-invocation

  function initShell() {
    if (_initialized) return;
    _initialized = true;

    applyOSThemePreference();

    // Migrate old type trainer data (only runs once, only on type-trainer page)
    if (document.body.dataset.page === 'type-trainer') {
      migrateTypeTrainerData();
    }

    renderGamesDropdown();

    // Restrict DoB input to today (prevents negative ages from future dates)
    const dobInput = document.getElementById('kg-dob-input');
    if (dobInput) dobInput.max = new Date().toISOString().slice(0, 10);

    // Hide games dropdown button on the hub (hub IS the games list)
    if (document.body.dataset.page === 'hub') {
      document.getElementById('kg-games-btn').hidden = true;
    }

    const activePlayer = getActivePlayer();
    if (!activePlayer) {
      showPlayerSelect();
    } else {
      applyPlayer(activePlayer);
    }
    bindEvents();
  }

  // --- Player selection ---
  function getPlayersDueForNudge(players) {
    return Object.values(players).filter(p => {
      if (getAge(p) === null) return false;
      // Don't show if dismissed less than 7 days ago
      const lastSeen = p.lastAgeNudgeSeen || '2000-01-01';
      const daysSinceSeen = (Date.now() - new Date(lastSeen).getTime()) / 86400000;
      if (daysSinceSeen < 7) return false;
      // Show if it's been at least a year since last nudge
      const lastNudge = p.lastAgeNudge || p.createdAt;
      const daysSinceNudge = (Date.now() - new Date(lastNudge).getTime()) / 86400000;
      return daysSinceNudge >= 365;
    });
  }

  function showPlayerSelect() {
    const overlay = document.getElementById('kg-player-overlay');
    const grid = document.getElementById('kg-player-grid');
    const players = getAllPlayers();

    let html = '';
    Object.values(players).forEach(p => {
      const safeName = escapeHtml(p.name);
      const initial = escapeHtml(p.name.charAt(0).toUpperCase());
      const bracket = getAgeBracket(p);
      html += `
        <button class="kg-player-card" data-player="${p.name}">
          <span class="kg-player-card__avatar">${initial}</span>
          <span class="kg-player-card__name">${safeName}</span>
          <span class="kg-player-card__bracket">${bracket}</span>
        </button>`;
    });
    html += `
      <button class="kg-player-card kg-player-card--add" id="kg-add-player-btn" aria-label="Add new player">
        <span class="kg-player-card__avatar">+</span>
        <span class="kg-player-card__name">New Player</span>
      </button>`;

    const dueForNudge = getPlayersDueForNudge(players);
    const overlayContent = overlay.querySelector('.kg-overlay__content');
    // Remove any existing nudge banner
    const existingNudge = overlayContent.querySelector('.kg-nudge-banner');
    if (existingNudge) existingNudge.remove();

    if (dueForNudge.length > 0) {
      const names = dueForNudge.map(p => escapeHtml(p.name)).join(', ');
      const banner = document.createElement('div');
      banner.className = 'kg-nudge-banner';
      banner.innerHTML = `
        <span class="kg-nudge-banner__icon" aria-hidden="true">🎂</span>
        <span class="kg-nudge-banner__text">Time to check ages for ${names}!</span>
        <button class="kg-btn kg-btn--secondary kg-nudge-banner__btn" id="kg-nudge-update">Update ages</button>
        <button class="kg-nudge-banner__dismiss" aria-label="Dismiss age reminder">✕</button>
      `;
      overlayContent.insertBefore(banner, overlayContent.querySelector('.kg-overlay__heading').nextSibling);
    }

    grid.innerHTML = html;
    overlay.hidden = false;
    const firstCard = grid.querySelector('.kg-player-card');
    if (firstCard) firstCard.focus();

    if (dueForNudge.length > 0) {
      document.getElementById('kg-nudge-update')?.addEventListener('click', () => {
        showAgeUpdate(dueForNudge[0]);
      });
      overlayContent.querySelector('.kg-nudge-banner__dismiss')?.addEventListener('click', () => {
        dueForNudge.forEach(p => {
          savePlayer(p.name, { lastAgeNudgeSeen: new Date().toISOString().slice(0, 10) });
        });
        overlayContent.querySelector('.kg-nudge-banner')?.remove();
      });
    }
  }

  function applyPlayer(player) {
    setActivePlayer(player.name);
    // Migrate any clean theme stored before the theme reduction
    let theme = player.theme;
    if (theme === 'clean-light' || !theme) theme = 'colourful-light';
    else if (theme === 'clean-dark') theme = 'colourful-dark';
    if (theme !== player.theme) savePlayer(player.name, { theme });
    document.getElementById('kg-player-avatar').textContent = player.name.charAt(0).toUpperCase();
    document.getElementById('kg-player-name').textContent = player.name;
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('kg-player-overlay').hidden = true;
    _notifyPlayerChange();
  }

  // --- Theme picker ---
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const player = getActivePlayer();
    if (player) {
      savePlayer(player.name, { theme });
    }
  }

  function toggleThemeDropdown() {
    const dd = document.getElementById('kg-theme-dropdown');
    const btn = document.getElementById('kg-theme-btn');
    dd.hidden = !dd.hidden;
    btn.setAttribute('aria-expanded', !dd.hidden);
    if (!dd.hidden) {
      // Highlight current theme
      const current = document.documentElement.getAttribute('data-theme');
      dd.querySelectorAll('.kg-theme-option').forEach(b => {
        b.classList.toggle('active', b.dataset.theme === current);
      });
    }
  }

  // --- Games dropdown ---
  function renderGamesDropdown() {
    const dd = document.getElementById('kg-games-dropdown');
    dd.innerHTML = GAMES.map(g => `
      <a href="${g.url}" class="kg-game-link${g.needsKeyboard ? ' kg-needs-keyboard' : ''}">
        <span class="kg-game-link__icon">${g.icon}</span>
        <span class="kg-game-link__title">${escapeHtml(g.title)}</span>
      </a>
    `).join('');
  }

  // --- Volume ---
  function toggleMute() {
    muted = !muted;
    document.getElementById('kg-volume-icon').textContent = muted ? '🔇' : '🔊';
    document.getElementById('kg-volume-btn').setAttribute('aria-pressed', muted);
  }

  // --- Event binding ---
  function bindEvents() {
    // Games dropdown
    document.getElementById('kg-games-btn').addEventListener('click', () => {
      const dd = document.getElementById('kg-games-dropdown');
      const btn = document.getElementById('kg-games-btn');
      dd.hidden = !dd.hidden;
      btn.setAttribute('aria-expanded', !dd.hidden);
    });

    // Player button
    document.getElementById('kg-player-btn').addEventListener('click', showPlayerSelect);

    // Player card selection (delegated)
    document.getElementById('kg-player-grid').addEventListener('click', (e) => {
      const card = e.target.closest('.kg-player-card');
      if (!card) return;
      if (card.id === 'kg-add-player-btn') {
        document.getElementById('kg-player-overlay').hidden = true;
        _resetAddPlayerForm();
        document.getElementById('kg-addplayer-overlay').hidden = false;
        document.getElementById('kg-name-input').focus();
        return;
      }
      const name = card.dataset.player;
      const player = getPlayer(name);
      if (player) applyPlayer(player);
    });

    // Add player form
    document.getElementById('kg-addplayer-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('kg-name-input').value.trim();
      const dobInput = document.getElementById('kg-dob-input');
      const ageInput = document.getElementById('kg-age-input');
      const dob = dobInput.value || null;
      const manualAge = ageInput.value ? parseInt(ageInput.value) : null;

      if (!name) return;
      const created = createPlayer(name, { dob, manualAge });
      if (created) {
        const player = getPlayer(created);
        document.getElementById('kg-addplayer-overlay').hidden = true;
        _resetAddPlayerForm();
        applyPlayer(player);
      }
    });

    // Add player cancel
    document.getElementById('kg-addplayer-cancel').addEventListener('click', () => {
      document.getElementById('kg-addplayer-overlay').hidden = true;
      _cancelAgeUpdate();
      showPlayerSelect();
    });

    // Age toggle (dob vs manual)
    document.querySelectorAll('.kg-age-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.kg-age-tab').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        const mode = tab.dataset.mode;
        document.getElementById('kg-dob-field').hidden = mode !== 'dob';
        document.getElementById('kg-age-field').hidden = mode !== 'age';
      });
    });

    // Enable submit when name is entered
    document.getElementById('kg-name-input').addEventListener('input', (e) => {
      document.getElementById('kg-addplayer-submit').disabled = !e.target.value.trim();
    });

    // Theme picker
    document.getElementById('kg-theme-btn').addEventListener('click', toggleThemeDropdown);
    document.getElementById('kg-theme-dropdown').addEventListener('click', (e) => {
      const option = e.target.closest('.kg-theme-option');
      if (!option) return;
      setTheme(option.dataset.theme);
      document.getElementById('kg-theme-dropdown').hidden = true;
      document.getElementById('kg-theme-btn').setAttribute('aria-expanded', 'false');
    });

    // Volume
    document.getElementById('kg-volume-btn').addEventListener('click', toggleMute);

    // Keyboard: Escape closes overlays/dropdowns, Tab traps focus in overlays
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const playerOverlay = document.getElementById('kg-player-overlay');
        const addOverlay = document.getElementById('kg-addplayer-overlay');
        const gamesDD = document.getElementById('kg-games-dropdown');
        const themeDD = document.getElementById('kg-theme-dropdown');

        if (!themeDD.hidden) {
          themeDD.hidden = true;
          document.getElementById('kg-theme-btn').setAttribute('aria-expanded', 'false');
          return;
        }
        if (!gamesDD.hidden) {
          gamesDD.hidden = true;
          document.getElementById('kg-games-btn').setAttribute('aria-expanded', 'false');
          return;
        }
        if (!addOverlay.hidden) { addOverlay.hidden = true; _cancelAgeUpdate(); showPlayerSelect(); return; }
        // Player overlay: only close if there's an active player (can't dismiss on first visit)
        if (!playerOverlay.hidden && getActivePlayer()) { playerOverlay.hidden = true; return; }
      }

      if (e.key === 'Tab') {
        const openOverlay = document.querySelector('.kg-overlay:not([hidden])');
        if (!openOverlay) return;
        const focusable = openOverlay.querySelectorAll('button:not([disabled]), input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    });

    // Lock body scroll when overlay is open
    const scrollObserver = new MutationObserver(() => {
      const anyOpen = document.querySelector('.kg-overlay:not([hidden])');
      document.body.style.overflow = anyOpen ? 'hidden' : '';
    });
    document.querySelectorAll('.kg-overlay').forEach(o => {
      scrollObserver.observe(o, { attributes: true, attributeFilter: ['hidden'] });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.kg-shell__games-wrap')) {
        document.getElementById('kg-games-dropdown').hidden = true;
        document.getElementById('kg-games-btn').setAttribute('aria-expanded', 'false');
      }
      if (!e.target.closest('#kg-theme-btn') && !e.target.closest('.kg-theme-dropdown')) {
        document.getElementById('kg-theme-dropdown').hidden = true;
        document.getElementById('kg-theme-btn').setAttribute('aria-expanded', 'false');
      }
    });

    // OS colour scheme: auto-switch theme when no player is logged in
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only auto-switch if no player has explicitly chosen a theme
      if (getActivePlayer()) return;
      const theme = e.matches ? 'colourful-dark' : 'colourful-light';
      document.documentElement.setAttribute('data-theme', theme);
    });
  }

  // --- Init on DOM ready ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShell);
  } else {
    initShell();
  }
})();
