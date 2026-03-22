// js/adaptive.js — Real-time difficulty adjustment
// Task 20: Tracks rolling accuracy and weak keys to silently tune difficulty.
// Pure logic module — no DOM access.

// --- Rolling accuracy window (last 10 inputs) ---
const ACCURACY_WINDOW_SIZE = 10;
let accuracyWindow = [];

// --- Weak key tracker (last 100 misses) ---
const WEAK_KEY_HISTORY_SIZE = 100;
let missHistory = []; // Array of missed key characters (uppercase)

/**
 * Record a single input result.
 * @param {boolean} correct - Whether the input was correct.
 * @param {string|null} missedKey - The key the player SHOULD have pressed (uppercase), or null if correct.
 */
export function recordInput(correct, missedKey = null) {
  // Update accuracy window
  accuracyWindow.push(correct ? 1 : 0);
  if (accuracyWindow.length > ACCURACY_WINDOW_SIZE) {
    accuracyWindow.shift();
  }

  // Update miss history
  if (!correct && missedKey) {
    missHistory.push(missedKey.toUpperCase());
    if (missHistory.length > WEAK_KEY_HISTORY_SIZE) {
      missHistory.shift();
    }
  }
}

/**
 * Get accuracy as a ratio (0.0 to 1.0) over the rolling window.
 * Returns 1.0 if no inputs recorded yet (benefit of the doubt).
 */
export function getAccuracy() {
  if (accuracyWindow.length === 0) return 1.0;
  const sum = accuracyWindow.reduce((a, b) => a + b, 0);
  return sum / accuracyWindow.length;
}

/**
 * Get the speed multiplier based on current rolling accuracy.
 * - Above 90% accuracy: 1.25 (speed up 25% — reward skilled typists)
 * - Above 85% accuracy: 1.15 (speed up 15%)
 * - Below 60% accuracy: 0.80 (slow down 20%)
 * - Between 60-85%: 1.0 (no change)
 *
 * This is SILENT — no UI indicator. The player just feels it.
 */
export function getSpeedMultiplier() {
  const accuracy = getAccuracy();
  if (accuracy > 0.95) return 2.0;   // Near-perfect: massive ramp
  if (accuracy > 0.90) return 1.6;   // Excellent: strong ramp
  if (accuracy > 0.85) return 1.3;   // Good: moderate ramp
  if (accuracy < 0.60) return 0.75;  // Struggling: slow down
  return 1.0;
}

/**
 * Get the top 5 most-missed keys from the last 100 misses.
 * Returns an array of { key, count } objects sorted by count descending.
 * Returns empty array if no misses recorded.
 */
export function getWeakKeys() {
  if (missHistory.length === 0) return [];

  // Count occurrences of each missed key
  const counts = {};
  for (const key of missHistory) {
    counts[key] = (counts[key] || 0) + 1;
  }

  // Sort by count descending, take top 5
  return Object.entries(counts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/**
 * Bias a character pool toward weak keys.
 * Takes the original pool of characters and returns a new pool where
 * weak keys appear ~20% more often.
 *
 * @param {string[]} pool - Array of characters to pick from.
 * @returns {string[]} - Biased pool with weak keys duplicated.
 */
export function biasPoolTowardWeakKeys(pool) {
  const weakKeys = getWeakKeys().map(w => w.key);
  if (weakKeys.length === 0) return pool;

  // Calculate how many extra entries to add (20% of pool size, split among weak keys)
  const extraCount = Math.max(1, Math.floor(pool.length * 0.20));
  const biasedPool = [...pool];

  // Only bias keys that actually exist in the pool
  const weakKeysInPool = weakKeys.filter(k => pool.includes(k));
  if (weakKeysInPool.length === 0) return pool;

  // Distribute extra entries across weak keys in the pool
  for (let i = 0; i < extraCount; i++) {
    biasedPool.push(weakKeysInPool[i % weakKeysInPool.length]);
  }

  return biasedPool;
}

/**
 * Reset all adaptive state. Call when starting a new game.
 */
export function resetAdaptive() {
  accuracyWindow = [];
  missHistory = [];
}
