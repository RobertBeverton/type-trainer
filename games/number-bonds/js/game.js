// game.js — GameSession: manages one play session
import { generateQuestion, generateDistractors } from './questions.js';

const SPRINT_DURATION = 60;
const ROUND_QUESTIONS = 10;
const POINTS_CORRECT = 10;
const STREAK_BONUS = 2;
const ANSWER_PAUSE_MS = 600; // ms to show correct/wrong before next question

export class GameSession {
  constructor({ op, mode, range, onQuestion, onAnswer, onScore, onEnd }) {
    this.op = op;
    this.mode = mode;
    this.range = range;
    this.onQuestion = onQuestion;
    this.onAnswer = onAnswer;   // ({ correct, correctAnswer, chosen }) — UI shows feedback
    this.onScore = onScore;
    this.onEnd = onEnd;

    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.correct = 0;
    this.total = 0;
    this.questionNum = 0;
    this.timeLeft = SPRINT_DURATION;
    this.startTime = null;
    this._timer = null;
    this._active = false;
    this._currentQuestion = null;
    this._answerLocked = false;
  }

  start() {
    this._active = true;
    this.startTime = Date.now();
    if (this.mode === 'sprint') {
      this._startTimer();
    }
    this._nextQuestion();
  }

  answer(value) {
    if (!this._active || this._answerLocked) return;
    this._answerLocked = true;

    const q = this._currentQuestion;
    const isCorrect = value === q.answer;
    this.total++;

    if (isCorrect) {
      this.correct++;
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
      this.score += POINTS_CORRECT + (this.streak - 1) * STREAK_BONUS;
    } else {
      this.streak = 0;
    }

    // Notify UI to show answer feedback — game.js does NOT touch the DOM
    this.onAnswer({ correct: isCorrect, correctAnswer: q.answer, chosen: value });
    this.onScore(this._hudState());

    setTimeout(() => {
      if (!this._active) return;
      this._answerLocked = false;
      if (this.mode === 'round' && this.questionNum >= ROUND_QUESTIONS) {
        this.end();
      } else {
        this._nextQuestion();
      }
    }, ANSWER_PAUSE_MS);
  }

  end() {
    if (!this._active) return;
    this._active = false;
    clearInterval(this._timer);
    const timeTaken = this.mode !== 'endless'
      ? Math.round((Date.now() - this.startTime) / 1000)
      : null;
    this.onEnd({
      score: this.score,
      accuracy: this.total > 0 ? Math.round((this.correct / this.total) * 100) : 0,
      bestStreak: this.bestStreak,
      timeTaken,
    });
  }

  _nextQuestion() {
    this.questionNum++;
    const q = generateQuestion(this.op, this.range);
    this._currentQuestion = q;
    const distractors = generateDistractors(q.answer, q.op, this.range);
    const choices = shuffle([q.answer, ...distractors]);
    this.onQuestion(q, choices);
    this.onScore(this._hudState());
  }

  _hudState() {
    return {
      score: this.score,
      mode: this.mode,
      timeLeft: this.timeLeft,
      questionNum: this.questionNum,
      totalQuestions: ROUND_QUESTIONS,
    };
  }

  _startTimer() {
    this._timer = setInterval(() => {
      this.timeLeft--;
      this.onScore(this._hudState());
      if (this.timeLeft <= 0) {
        clearInterval(this._timer);
        this.end();
      }
    }, 1000);
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
