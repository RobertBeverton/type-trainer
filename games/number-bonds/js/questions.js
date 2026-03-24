// questions.js — Number generation and question assembly

/**
 * Generate a single question.
 * @param {string} op  '+' | '-' | '*' | '/' | 'mixed'
 * @param {object} settings  { min, max, maxTable, negatives, decimals }
 * @returns {{ left, op, right, result, blank: 'left'|'right', answer }}
 */
export function generateQuestion(op, settings) {
  const { min, max, maxTable, negatives, decimals } = settings;
  const resolvedOp = op === 'mixed'
    ? ['+', '-', '*', '/'][Math.floor(Math.random() * 4)]
    : op;

  let left, right, result;

  switch (resolvedOp) {
    case '+': {
      left = randInt(min, max);
      right = randInt(min, max);
      if (decimals) {
        left = round1dp(left + randInt(0, 9) / 10);
        right = round1dp(right + randInt(0, 9) / 10);
      }
      result = round1dp(left + right);
      break;
    }
    case '-': {
      if (negatives) {
        left = randInt(min, max);
        right = randInt(min, max);
      } else {
        const a = randInt(min, max);
        const b = randInt(min, max);
        left = Math.max(a, b);
        right = Math.min(a, b);
      }
      if (decimals) {
        left = round1dp(left + randInt(0, 9) / 10);
        right = round1dp(right + randInt(0, 9) / 10);
        if (!negatives && left < right) [left, right] = [right, left];
      }
      result = round1dp(left - right);
      break;
    }
    case '*': {
      left = randInt(1, maxTable);
      right = randInt(1, maxTable);
      result = left * right;
      break;
    }
    case '/': {
      // Always generates a clean integer result
      right = randInt(1, maxTable);       // divisor (never 0)
      result = randInt(1, maxTable);      // quotient
      left = right * result;              // dividend
      break;
    }
    default:
      throw new Error(`Unknown op: ${resolvedOp}`);
  }

  const blank = Math.random() < 0.5 ? 'left' : 'right';
  const answer = blank === 'left' ? left : right;

  return { left, op: resolvedOp, right, result, blank, answer };
}

/**
 * Generate wrong answer choices.
 * @param {number} answer  The correct answer
 * @param {string} op  The operation ('+' | '-' | '*' | '/')
 * @param {object} settings  { min, max, maxTable, negatives, decimals }
 * @param {number} count  Number of distractors to return (default 3)
 * @returns {number[]}
 */
export function generateDistractors(answer, op, settings, count = 3) {
  const { negatives, decimals } = settings;
  const candidates = new Set();
  let attempts = 0;

  while (candidates.size < count && attempts < 200) {
    attempts++;
    let candidate;

    if (op === '*' || op === '/') {
      // Use an adjacent multiple — stays in the same ballpark as the correct answer
      const step = randInt(1, Math.max(2, Math.floor(settings.maxTable / 3)));
      candidate = answer + step * (Math.random() < 0.5 ? 1 : -1);
    } else {
      // Offset by a small amount
      const offset = randInt(1, 5) * (Math.random() < 0.5 ? 1 : -1);
      candidate = answer + offset;
    }

    if (decimals) candidate = round1dp(candidate);
    else candidate = Math.round(candidate);

    if (candidate === answer) continue;
    if (!negatives && candidate < 0) continue;
    if (candidates.has(candidate)) continue;

    candidates.add(candidate);
  }

  // Fallback: if we couldn't generate enough, use sequential offsets
  let fallback = 1;
  while (candidates.size < count) {
    const c = answer + fallback;
    if (c !== answer && !candidates.has(c)) candidates.add(c);
    fallback++;
  }

  return [...candidates];
}

// --- Helpers ---

function randInt(min, max) {
  if (min > max) [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round1dp(n) {
  return Math.round(n * 10) / 10;
}
