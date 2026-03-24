import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion, generateDistractors } from '../js/questions.js';

const base = { min: 1, max: 10, maxTable: 10, negatives: false, decimals: false };

// --- generateQuestion: answer is always result ---

describe('generateQuestion — answer is always result', () => {
  for (const op of ['+', '-', '*', '/']) {
    it(`answer === result for ${op}`, () => {
      for (let i = 0; i < 50; i++) {
        const q = generateQuestion(op, base);
        assert.equal(q.answer, q.result, `answer should equal result for op ${op}`);
      }
    });
  }

  it('answer === result for mixed', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateQuestion('mixed', base);
      assert.equal(q.answer, q.result);
    }
  });
});

// --- generateQuestion: required fields ---

describe('generateQuestion — shape', () => {
  it('returns required fields: left, op, right, result, answer', () => {
    const q = generateQuestion('+', base);
    for (const field of ['left', 'op', 'right', 'result', 'answer']) {
      assert.ok(field in q, `missing field: ${field}`);
    }
  });
});

// --- generateQuestion: arithmetic correctness ---

describe('generateQuestion — addition', () => {
  it('result equals left + right', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('+', base);
      assert.equal(q.result, q.left + q.right);
    }
  });

  it('operands within min/max range', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('+', base);
      assert.ok(q.left >= 1 && q.left <= 10);
      assert.ok(q.right >= 1 && q.right <= 10);
    }
  });
});

describe('generateQuestion — subtraction', () => {
  it('result equals left - right', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('-', base);
      assert.equal(q.result, q.left - q.right);
    }
  });

  it('result >= 0 when negatives disabled', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateQuestion('-', base);
      assert.ok(q.result >= 0, `result ${q.result} should not be negative`);
    }
  });
});

describe('generateQuestion — multiplication', () => {
  it('result equals left * right', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('*', base);
      assert.equal(q.result, q.left * q.right);
    }
  });

  it('operands within 1..maxTable', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('*', { ...base, maxTable: 5 });
      assert.ok(q.left >= 1 && q.left <= 5);
      assert.ok(q.right >= 1 && q.right <= 5);
    }
  });
});

describe('generateQuestion — division', () => {
  it('result equals left / right (integer)', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('/', base);
      assert.equal(q.left / q.right, q.result);
      assert.equal(q.left % q.right, 0, 'should divide evenly');
    }
  });

  it('right operand is never 0', () => {
    for (let i = 0; i < 50; i++) {
      assert.ok(generateQuestion('/', base).right !== 0);
    }
  });
});

describe('generateQuestion — mixed', () => {
  it('uses all four operations over many calls', () => {
    const ops = new Set();
    for (let i = 0; i < 200; i++) ops.add(generateQuestion('mixed', base).op);
    assert.deepEqual([...ops].sort(), ['+', '-', '*', '/'].sort());
  });

  it('never returns "mixed" as resolved op', () => {
    for (let i = 0; i < 50; i++) {
      assert.notEqual(generateQuestion('mixed', base).op, 'mixed');
    }
  });
});

describe('generateQuestion — negatives', () => {
  const negSettings = { min: -10, max: 10, maxTable: 10, negatives: true, decimals: false };

  it('can produce negative results when negatives enabled', () => {
    const results = [];
    for (let i = 0; i < 100; i++) results.push(generateQuestion('-', negSettings).result);
    assert.ok(results.some(r => r < 0), 'should sometimes produce negative results');
  });
});

describe('generateQuestion — decimals', () => {
  const decSettings = { min: 1, max: 10, maxTable: 10, negatives: false, decimals: true };

  it('result has at most 1 decimal place for addition', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('+', decSettings);
      assert.ok(countDp(q.result) <= 1, `result ${q.result} should have ≤1dp`);
    }
  });

  it('produces non-integer results when decimals enabled', () => {
    const results = [];
    for (let i = 0; i < 100; i++) results.push(generateQuestion('+', decSettings).result);
    assert.ok(results.some(r => !Number.isInteger(r)),
      'at least one non-integer result should appear with decimals:true');
  });
});

// --- generateDistractors ---

describe('generateDistractors — basics', () => {
  it('returns exactly 3 distractors by default', () => {
    assert.equal(generateDistractors(20, '+', base).length, 3);
  });

  it('no distractor equals the correct answer', () => {
    for (let i = 0; i < 50; i++) {
      const answer = randInt(1, 20);
      const d = generateDistractors(answer, '+', base);
      assert.ok(!d.includes(answer), `distractor matched answer ${answer}`);
    }
  });

  it('no duplicate distractors', () => {
    for (let i = 0; i < 50; i++) {
      const d = generateDistractors(20, '+', base);
      assert.equal(new Set(d).size, d.length, 'duplicates found');
    }
  });

  it('distractors are numbers', () => {
    generateDistractors(20, '*', base).forEach(x => assert.equal(typeof x, 'number'));
  });

  it('decimal distractors have ≤1dp', () => {
    const dec = { ...base, decimals: true };
    for (let i = 0; i < 30; i++) {
      generateDistractors(3.5, '+', dec).forEach(x =>
        assert.ok(countDp(x) <= 1, `distractor ${x} has >1dp`)
      );
    }
  });
});

describe('generateDistractors — multiplication uses valid table products', () => {
  const settings = { min: 1, max: 144, maxTable: 12, negatives: false, decimals: false };

  it('does not produce ±1 neighbours for even×even result (parity test)', () => {
    // 7×8=56: 55 and 57 should never appear — they are not table products
    for (let i = 0; i < 100; i++) {
      const d = generateDistractors(56, '*', settings);
      assert.ok(!d.includes(55), '55 is not a table product and should not appear');
      assert.ok(!d.includes(57), '57 is not a table product and should not appear');
    }
  });

  it('all distractors are valid table products', () => {
    for (let i = 0; i < 50; i++) {
      const d = generateDistractors(56, '*', settings);
      d.forEach(x => {
        let isTableProduct = false;
        for (let a = 1; a <= settings.maxTable && !isTableProduct; a++) {
          const b = x / a;
          if (Number.isInteger(b) && b >= 1 && b <= settings.maxTable) isTableProduct = true;
        }
        assert.ok(isTableProduct, `distractor ${x} is not a valid table product within maxTable=${settings.maxTable}`);
      });
    }
  });

  it('all distractors are valid table products for prime-squared answers (fallback case)', () => {
    // answer=25 (5×5) has only one factor (5) in [2,12], so fallback often triggers
    const settings = { min: 1, max: 144, maxTable: 12, negatives: false, decimals: false };
    for (let i = 0; i < 50; i++) {
      const d = generateDistractors(25, '*', settings);
      d.forEach(x => {
        let isTableProduct = false;
        for (let a = 1; a <= settings.maxTable && !isTableProduct; a++) {
          const b = x / a;
          if (Number.isInteger(b) && b >= 1 && b <= settings.maxTable) isTableProduct = true;
        }
        assert.ok(isTableProduct, `distractor ${x} is not a valid table product (answer=25)`);
      });
    }
  });
});

// --- Helpers ---

function countDp(n) {
  const s = n.toString();
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
