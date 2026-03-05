import type {
  LessonMode,
  LessonQueue,
  LessonReasonTag,
  LessonStep,
  LessonStepType,
  StepAnswerResult,
  Term,
  UserTermState,
} from '../features/lesson/types';

const DEFAULT_STEP_COUNT = 14;

function shuffle<T>(values: T[]) {
  const result = [...values];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [result[i], result[randomIndex]] = [result[randomIndex], result[i]];
  }

  return result;
}

function uniqueById(terms: Term[]) {
  const seen = new Set<string>();
  return terms.filter((term) => {
    if (seen.has(term.id)) {
      return false;
    }

    seen.add(term.id);
    return true;
  });
}

function countByRatio(total: number, ratio: [number, number, number]) {
  const [dueRatio, weakRatio] = ratio;
  const dueCount = Math.round(total * dueRatio);
  const weakCount = Math.round(total * weakRatio);
  const newCount = Math.max(0, total - dueCount - weakCount);
  return { dueCount, weakCount, newCount };
}

function pickTerms(source: Term[], size: number) {
  return shuffle(source).slice(0, Math.max(0, size));
}

function buildOptions(allTerms: Term[], correct: string, mode: 'definition' | 'term') {
  const pool = mode === 'definition' ? allTerms.map((term) => term.definition) : allTerms.map((term) => term.term);
  const distractors = shuffle(pool.filter((option) => option !== correct)).slice(0, 3);
  return shuffle([correct, ...distractors]);
}

function sanitizeSentence(sentence: string, targetTerm: string) {
  const termRegex = new RegExp(targetTerm, 'i');
  return sentence.replace(termRegex, '______');
}

function toReasonTag(source: 'due' | 'weak' | 'new'): LessonReasonTag {
  if (source === 'due') {
    return 'Due for review';
  }

  if (source === 'weak') {
    return 'Weak area';
  }

  return 'New today';
}

export function buildLessonQueue({
  terms,
  stateMap,
  mode,
  category,
  now = Date.now(),
}: {
  terms: Term[];
  stateMap: Map<string, UserTermState>;
  mode: LessonMode;
  category?: string;
  now?: number;
}): LessonQueue {
  const filteredTerms = category ? terms.filter((term) => term.category === category) : terms;
  const termsById = new Map(filteredTerms.map((term) => [term.id, term]));
  const states = [...stateMap.values()].filter((state) => termsById.has(state.termId));

  const due = states
    .filter((state) => state.dueAt <= now)
    .map((state) => termsById.get(state.termId))
    .filter((term): term is Term => Boolean(term));

  const weak = states
    .filter((state) => state.mastery < 0.45)
    .map((state) => termsById.get(state.termId))
    .filter((term): term is Term => Boolean(term));

  const seen = new Set(states.map((state) => state.termId));
  const unseen = filteredTerms.filter((term) => !seen.has(term.id));

  const totalSteps = mode === 'daily' ? DEFAULT_STEP_COUNT : 10;

  let planned: { term: Term; source: 'due' | 'weak' | 'new' }[] = [];

  if (mode === 'daily') {
    const { dueCount, weakCount, newCount } = countByRatio(totalSteps, [0.6, 0.25, 0.15]);
    planned = [
      ...pickTerms(due, dueCount).map((term) => ({ term, source: 'due' as const })),
      ...pickTerms(weak, weakCount).map((term) => ({ term, source: 'weak' as const })),
      ...pickTerms(unseen, newCount).map((term) => ({ term, source: 'new' as const })),
    ];
  } else if (mode === 'quick-review') {
    planned = [
      ...pickTerms(due, Math.ceil(totalSteps * 0.8)).map((term) => ({ term, source: 'due' as const })),
      ...pickTerms(weak, Math.floor(totalSteps * 0.2)).map((term) => ({ term, source: 'weak' as const })),
    ];
  } else if (mode === 'weak-areas') {
    planned = [
      ...pickTerms(weak, Math.ceil(totalSteps * 0.75)).map((term) => ({ term, source: 'weak' as const })),
      ...pickTerms(due, Math.floor(totalSteps * 0.25)).map((term) => ({ term, source: 'due' as const })),
    ];
  } else {
    planned = [
      ...pickTerms(filteredTerms, totalSteps).map((term) => ({
        term,
        source: seen.has(term.id) ? ('due' as const) : ('new' as const),
      })),
    ];
  }

  if (planned.length === 0) {
    planned = pickTerms(filteredTerms, totalSteps).map((term) => ({
      term,
      source: seen.has(term.id) ? ('due' as const) : ('new' as const),
    }));
  }

  const dedupedPlanned = uniqueById(planned.map((item) => item.term)).map((term) => {
    const source = planned.find((candidate) => candidate.term.id === term.id)?.source ?? 'new';
    return { term, source };
  });

  const repeatedPlanned =
    dedupedPlanned.length >= totalSteps
      ? dedupedPlanned.slice(0, totalSteps)
      : [...dedupedPlanned, ...shuffle(dedupedPlanned).slice(0, Math.max(0, totalSteps - dedupedPlanned.length))];

  const stepTypeCycle: LessonStepType[] = ['flashcard', 'mcq', 'sentence', 'mcq', 'sentence'];
  const easiestDue =
    repeatedPlanned
      .filter((item) => item.source === 'due')
      .sort((a, b) => {
        const aMastery = stateMap.get(a.term.id)?.mastery ?? 0;
        const bMastery = stateMap.get(b.term.id)?.mastery ?? 0;
        return bMastery - aMastery;
      })[0] ?? repeatedPlanned[0];

  const sortedPlanned = [
    easiestDue,
    ...repeatedPlanned.filter((item) => item.term.id !== easiestDue.term.id),
  ].slice(0, totalSteps);

  const steps = sortedPlanned.map((item, index): LessonStep => {
    const type = index === 0 ? 'flashcard' : stepTypeCycle[index % stepTypeCycle.length];
    const reason = toReasonTag(item.source);
    const baseId = `${item.term.id}-${index}-${type}`;

    if (type === 'flashcard') {
      return {
        id: baseId,
        type,
        term: item.term,
        reason,
        prompt: 'Tap Reveal to see the definition and clinical usage.',
        explanation: item.term.definition,
        revealText: item.term.exampleSentence,
      };
    }

    if (type === 'mcq') {
      const correct = item.term.definition;
      return {
        id: baseId,
        type,
        term: item.term,
        reason,
        prompt: `What does ${item.term.term} mean?`,
        options: buildOptions(filteredTerms, correct, 'definition'),
        correctAnswer: correct,
        explanation: item.term.exampleSentence,
      };
    }

    const correct = item.term.term;
    return {
      id: baseId,
      type,
      term: item.term,
      reason,
      prompt: sanitizeSentence(item.term.exampleSentence, item.term.term),
      options: buildOptions(filteredTerms, correct, 'term'),
      correctAnswer: correct,
      explanation: item.term.exampleSentence,
    };
  });

  return { mode, steps };
}

export function evaluateStep({
  step,
  answer,
}: {
  step: LessonStep;
  answer: string | 'knew' | 'missed';
}): StepAnswerResult {
  if (step.type === 'flashcard') {
    const correct = answer === 'knew';
    return {
      correct,
      xpEarned: correct ? 8 : 2,
      message: correct ? 'Great recall. We will space this term farther out.' : 'Noted. We will bring this term back sooner.',
    };
  }

  const normalizedAnswer = String(answer).trim().toLowerCase();
  const normalizedCorrect = String(step.correctAnswer ?? '').trim().toLowerCase();
  const correct = normalizedAnswer === normalizedCorrect;

  return {
    correct,
    xpEarned: correct ? 10 : 3,
    message: correct ? 'Correct. Keep building your clinical usage.' : `Review this one: ${step.term.term}.`,
  };
}

export function getNextTermState({
  previous,
  termId,
  correct,
  now = Date.now(),
}: {
  previous?: UserTermState;
  termId: string;
  correct: boolean;
  now?: number;
}): UserTermState {
  const state = previous ?? {
    termId,
    mastery: 0.3,
    stabilityDays: 0.5,
    dueAt: now,
    correctCount: 0,
    incorrectCount: 0,
  };

  if (correct) {
    const mastery = Math.min(1, state.mastery + 0.05);
    const stabilityDays = Math.max(0.25, state.stabilityDays * 1.2);
    const dueAt = now + stabilityDays * 24 * 60 * 60 * 1000;

    return {
      ...state,
      mastery,
      stabilityDays,
      dueAt,
      correctCount: state.correctCount + 1,
    };
  }

  const mastery = Math.max(0, state.mastery - 0.08);
  const stabilityDays = Math.max(0.25, state.stabilityDays * 0.6);
  const dueAt = now + 15 * 60 * 1000;

  return {
    ...state,
    mastery,
    stabilityDays,
    dueAt,
    incorrectCount: state.incorrectCount + 1,
  };
}
