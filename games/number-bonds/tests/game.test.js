import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GameSession } from '../js/game.js';

function createSession({ mode = 'round', difficulty = 'easy', onAnswer = () => {} } = {}) {
  const range = {
    min: 1, max: 10, maxTable: 5,
    negatives: false, decimals: false,
    _difficulty: difficulty,
  };
  return new GameSession({
    op: '+', mode, range,
    onQuestion: () => {},
    onAnswer,
    onScore: () => {},
    onEnd: () => {},
    onHint: () => {},
  });
}

// Returns a value that is guaranteed not to be the correct answer
function wrongAnswer(session) {
  return session._currentQuestion.answer + 1;
}

describe('GameSession — wrong-answer confirmation (Round/Endless)', () => {
  it('wrong answer in Round sets _awaitingConfirmation', () => {
    const s = createSession({ mode: 'round' });
    s.start();
    s.answer(wrongAnswer(s));
    assert.equal(s._awaitingConfirmation, true);
  });

  it('wrong answer in Endless sets _awaitingConfirmation', () => {
    const s = createSession({ mode: 'endless' });
    s.start();
    s.answer(wrongAnswer(s));
    assert.equal(s._awaitingConfirmation, true);
  });

  it('wrong answer in Sprint does NOT set _awaitingConfirmation', () => {
    const s = createSession({ mode: 'sprint' });
    s.start();
    s.answer(wrongAnswer(s));
    assert.equal(s._awaitingConfirmation, false);
  });

  it('onAnswer receives requiresConfirmation: true for wrong Round answer', () => {
    let captured = null;
    const s = createSession({ mode: 'round', onAnswer: a => { captured = a; } });
    s.start();
    s.answer(wrongAnswer(s));
    assert.equal(captured.requiresConfirmation, true);
  });

  it('onAnswer does not receive requiresConfirmation for wrong Sprint answer', () => {
    let captured = null;
    const s = createSession({ mode: 'sprint', onAnswer: a => { captured = a; } });
    s.start();
    s.answer(wrongAnswer(s));
    assert.ok(!captured.requiresConfirmation);
  });

  it('correct tap in confirmation state clears _awaitingConfirmation', () => {
    const s = createSession({ mode: 'round' });
    s.start();
    s.answer(wrongAnswer(s));
    assert.equal(s._awaitingConfirmation, true);
    s.answer(s._currentQuestion.answer);
    assert.equal(s._awaitingConfirmation, false);
  });

  it('wrong tap in confirmation state keeps _awaitingConfirmation', () => {
    const s = createSession({ mode: 'round' });
    s.start();
    s.answer(wrongAnswer(s));
    s.answer(s._currentQuestion.answer + 2);
    assert.equal(s._awaitingConfirmation, true);
  });
});

describe('GameSession — _hintDelay', () => {
  it('returns 15 for Easy in Round', () => {
    assert.equal(createSession({ difficulty: 'easy', mode: 'round' })._hintDelay(), 15);
  });

  it('returns 15 for Easy in Endless', () => {
    assert.equal(createSession({ difficulty: 'easy', mode: 'endless' })._hintDelay(), 15);
  });

  it('returns 25 for Medium in Round', () => {
    assert.equal(createSession({ difficulty: 'medium', mode: 'round' })._hintDelay(), 25);
  });

  it('returns null for Hard', () => {
    assert.equal(createSession({ difficulty: 'hard', mode: 'round' })._hintDelay(), null);
  });

  it('returns null for Custom', () => {
    assert.equal(createSession({ difficulty: 'custom', mode: 'round' })._hintDelay(), null);
  });

  it('returns null for Easy in Sprint', () => {
    assert.equal(createSession({ difficulty: 'easy', mode: 'sprint' })._hintDelay(), null);
  });
});
