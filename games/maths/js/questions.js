// questions.js — Maths game question and distractor generation

/**
 * Generate a single question. The result is always the blank (answer).
 * @param {string} op  '+' | '-' | '*' | '/' | 'mixed'
 * @param {object} settings  { min, max, maxTable, negatives, decimals }
 * @returns {{ left, op, right, result, answer }}
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
      right = randInt(1, maxTable);       // divisor
      result = randInt(1, maxTable);      // quotient
      left = right * result;              // dividend
      break;
    }
    default:
      throw new Error(`Unknown op: ${resolvedOp}`);
  }

  // The blank is always the result — this is the core difference from Number Bonds
  return { left, op: resolvedOp, right, result, answer: result };
}

/**
 * Generate wrong answer choices.
 * @param {number} answer  The correct answer (always the result)
 * @param {string} op
 * @param {object} settings  { min, max, maxTable, negatives, decimals }
 * @param {number} count  Default 3
 * @returns {number[]}
 */
export function generateDistractors(answer, op, settings, count = 3) {
  const { negatives, decimals, maxTable = 12 } = settings;
  const candidates = new Set();
  let attempts = 0;

  while (candidates.size < count && attempts < 200) {
    attempts++;
    let candidate;

    if (op === '*' || op === '/') {
      // Use factor-based steps: find divisors of answer within [2, maxTable],
      // then step by that factor. This ensures distractors are adjacent
      // multiples of a shared factor, avoiding parity tells (e.g. ±1 from 56
      // gives 55/57 which are not reachable by any factor of 56).
      // We then verify the candidate is itself a valid table product.
      const factors = [];
      for (let f = 2; f <= maxTable; f++) {
        if (answer % f === 0) factors.push(f);
      }
      const step = factors.length > 0
        ? factors[Math.floor(Math.random() * factors.length)]
        : randInt(2, Math.max(2, Math.floor(maxTable / 2)));
      candidate = answer + step * (Math.random() < 0.5 ? 1 : -1);
      // Only accept if the candidate is itself a valid table product
      let isTableProduct = false;
      for (let a = 1; a <= maxTable && !isTableProduct; a++) {
        const b = candidate / a;
        if (Number.isInteger(b) && b >= 1 && b <= maxTable) isTableProduct = true;
      }
      if (!isTableProduct) continue;
    } else {
      // +/−: cluster near the result with a small offset
      const offset = randInt(1, 5) * (Math.random() < 0.5 ? 1 : -1);
      candidate = answer + offset;
    }

    if (decimals) candidate = round1dp(candidate);
    else candidate = Math.round(candidate);

    if (candidate === answer) continue;
    if (!negatives && candidate < 0) continue;
    if ((op === '*' || op === '/') && candidate <= 0) continue;
    if (candidates.has(candidate)) continue;

    candidates.add(candidate);
  }

  // Fallback: sequential offsets if we couldn't generate enough
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
