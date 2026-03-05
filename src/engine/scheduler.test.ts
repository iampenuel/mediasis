import { describe, expect, it, vi } from 'vitest';

import { buildLessonQueue, evaluateStep, getNextTermState } from './scheduler';
import type { LessonStep, Term, UserTermState } from '../features/lesson/types';

function makeTerm(index: number, category = 'core'): Term {
  const label = `term-${index}`;
  return {
    id: label,
    term: `Term ${index}`,
    pronunciation: `term ${index}`,
    definition: `Definition ${index}`,
    exampleSentence: `Example sentence for Term ${index}.`,
    category,
    difficulty: (index % 5) + 1,
  };
}

function makeState(termId: string, overrides?: Partial<UserTermState>): UserTermState {
  return {
    termId,
    mastery: 0.6,
    stabilityDays: 1,
    dueAt: 0,
    correctCount: 3,
    incorrectCount: 1,
    ...overrides,
  };
}

describe('buildLessonQueue', () => {
  it('builds a daily queue with 14 steps and a flashcard first step', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.42);

    const terms = Array.from({ length: 24 }, (_, idx) => makeTerm(idx + 1));
    const now = Date.now();
    const stateMap = new Map<string, UserTermState>([
      [terms[0].id, makeState(terms[0].id, { dueAt: now - 1, mastery: 0.8 })],
      [terms[1].id, makeState(terms[1].id, { dueAt: now - 1, mastery: 0.3 })],
      [terms[2].id, makeState(terms[2].id, { dueAt: now - 1, mastery: 0.2 })],
    ]);

    const queue = buildLessonQueue({ terms, stateMap, mode: 'daily', now });

    expect(queue.mode).toBe('daily');
    expect(queue.steps.length).toBeGreaterThan(0);
    expect(queue.steps.length).toBeLessThanOrEqual(14);
    expect(queue.steps[0].type).toBe('flashcard');
    randomSpy.mockRestore();
  });

  it('respects category filtering for category-drill mode', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.19);

    const cardioTerms = Array.from({ length: 6 }, (_, idx) => makeTerm(idx + 1, 'cardio'));
    const neuroTerms = Array.from({ length: 6 }, (_, idx) => makeTerm(idx + 11, 'neuro'));
    const terms = [...cardioTerms, ...neuroTerms];

    const queue = buildLessonQueue({
      terms,
      stateMap: new Map(),
      mode: 'category-drill',
      category: 'cardio',
      now: Date.now(),
    });

    expect(queue.steps).toHaveLength(10);
    expect(queue.steps.every((step) => step.term.category === 'cardio')).toBe(true);
    randomSpy.mockRestore();
  });
});

describe('evaluateStep', () => {
  it('scores flashcard responses correctly', () => {
    const flashcard: LessonStep = {
      id: 'flash-1',
      type: 'flashcard',
      term: makeTerm(1),
      reason: 'Due for review',
      prompt: 'Prompt',
      explanation: 'Explanation',
      revealText: 'Reveal',
    };

    const knew = evaluateStep({ step: flashcard, answer: 'knew' });
    const missed = evaluateStep({ step: flashcard, answer: 'missed' });

    expect(knew.correct).toBe(true);
    expect(knew.xpEarned).toBe(8);
    expect(missed.correct).toBe(false);
    expect(missed.xpEarned).toBe(2);
  });

  it('matches MCQ answers case-insensitively', () => {
    const mcq: LessonStep = {
      id: 'mcq-1',
      type: 'mcq',
      term: makeTerm(2),
      reason: 'Weak area',
      prompt: 'What does this mean?',
      options: ['Definition 2', 'Definition 3'],
      correctAnswer: 'Definition 2',
      explanation: 'Explanation',
    };

    const result = evaluateStep({ step: mcq, answer: '  definition 2  ' });
    expect(result.correct).toBe(true);
    expect(result.xpEarned).toBe(10);
  });
});

describe('getNextTermState', () => {
  it('advances mastery and due date on correct answers', () => {
    const now = 1_700_000_000_000;
    const previous = makeState('term-9', { mastery: 0.6, stabilityDays: 2, dueAt: now });

    const updated = getNextTermState({ previous, termId: 'term-9', correct: true, now });

    expect(updated.mastery).toBeGreaterThan(previous.mastery);
    expect(updated.stabilityDays).toBeGreaterThan(previous.stabilityDays);
    expect(updated.dueAt).toBeGreaterThan(now);
    expect(updated.correctCount).toBe(previous.correctCount + 1);
  });

  it('brings terms back sooner on incorrect answers', () => {
    const now = 1_700_000_000_000;
    const previous = makeState('term-10', { mastery: 0.5, stabilityDays: 3, dueAt: now });

    const updated = getNextTermState({ previous, termId: 'term-10', correct: false, now });

    expect(updated.mastery).toBeLessThan(previous.mastery);
    expect(updated.stabilityDays).toBeLessThan(previous.stabilityDays);
    expect(updated.dueAt).toBe(now + 15 * 60 * 1000);
    expect(updated.incorrectCount).toBe(previous.incorrectCount + 1);
  });
});
