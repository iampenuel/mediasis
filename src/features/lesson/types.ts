export type LessonMode = 'daily' | 'quick-review' | 'weak-areas' | 'category-drill';

export type LessonReasonTag = 'Due for review' | 'Weak area' | 'New today';

export type LessonStepType = 'flashcard' | 'mcq' | 'sentence';

export type Term = {
  id: string;
  term: string;
  pronunciation: string;
  definition: string;
  exampleSentence: string;
  category: string;
  difficulty: number;
};

export type UserTermState = {
  termId: string;
  mastery: number;
  stabilityDays: number;
  dueAt: number;
  correctCount: number;
  incorrectCount: number;
};

export type LessonStep = {
  id: string;
  type: LessonStepType;
  term: Term;
  reason: LessonReasonTag;
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  explanation: string;
  revealText?: string;
};

export type LessonQueue = {
  mode: LessonMode;
  steps: LessonStep[];
};

export type StepAnswerResult = {
  correct: boolean;
  xpEarned: number;
  message: string;
};
