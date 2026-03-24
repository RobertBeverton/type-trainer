import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from '../js/questions.js';

const baseSettings = { min: 1, max: 10, maxTable: 10, negatives: false, decimals: false };

describe('generateQuestion — addition', () => {
  it('returns an object with required fields', () => {
    const q = generateQuestion('+', baseSettings);
    assert.ok('left' in q && 'right' in q && 'result' in q && 'blank' in q && 'answer' in q && 'op' in q);
  });

  it('result equals left + right', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('+', baseSettings);
      assert.equal(q.result, q.left + q.right);
    }
  });

  it('blank is left or right', () => {
    const blanks = new Set();
    for (let i = 0; i < 50; i++) {
      blanks.add(generateQuestion('+', baseSettings).blank);
    }
    assert.ok(blanks.has('left') && blanks.has('right'), 'both blank positions should appear');
  });

  it('answer matches blank position', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('+', baseSettings);
      const expected = q.blank === 'left' ? q.left : q.right;
      assert.equal(q.answer, expected);
    }
  });

  it('operands within min/max range', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('+', baseSettings);
      assert.ok(q.left >= 1 && q.left <= 10);
      assert.ok(q.right >= 1 && q.right <= 10);
    }
  });
});

describe('generateQuestion — subtraction', () => {
  it('result equals left - right', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('-', baseSettings);
      assert.equal(q.result, q.left - q.right);
    }
  });

  it('result >= 0 when negatives disabled', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateQuestion('-', baseSettings);
      assert.ok(q.result >= 0, `result ${q.result} should not be negative`);
    }
  });

  it('left >= right when negatives disabled', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('-', baseSettings);
      assert.ok(q.left >= q.right);
    }
  });
});
