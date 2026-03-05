import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { buildLessonQueue, evaluateStep, getNextTermState } from '../../src/engine/scheduler';
import { insertOutboxEvent, loadQueueSource, saveLessonSession, saveUserTermState } from '../../src/features/lesson';
import type { LessonMode, LessonQueue, LessonStep } from '../../src/features/lesson';
import { markTourSeen } from '../../src/features/tour/storage';
import { toUserMessage } from '../../src/lib/errors';
import {
  normalizeSpokenAnswer,
  requestMicrophonePermission,
  speakText,
  startSpeechToText,
  supportsSpeechToText,
} from '../../src/lib/speech';
import { Banner, Button, Card, CoachMarkOverlay, ProgressBar, Screen, theme } from '../../src/ui';

const querySchema = z.object({
  mode: z.enum(['daily', 'quick-review', 'weak-areas', 'category-drill']).default('daily'),
  category: z.string().optional(),
});

type FeedbackState = {
  correct: boolean;
  message: string;
  explanation: string;
  chosenAnswer: string;
};

export default function LearnScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; category?: string; tourCoach?: string }>();
  const parsedQuery = useMemo(() => querySchema.safeParse(params), [params]);
  const mode: LessonMode = parsedQuery.success ? parsedQuery.data.mode : 'daily';
  const category = parsedQuery.success ? parsedQuery.data.category : undefined;
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const [lesson, setLesson] = useState<LessonQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [xp, setXp] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [missedTerms, setMissedTerms] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speechHint, setSpeechHint] = useState<string | null>(null);
  const [spokenDraft, setSpokenDraft] = useState('');
  const [sessionSaved, setSessionSaved] = useState(false);
  const [coachFeedbackActive, setCoachFeedbackActive] = useState(params.tourCoach === 'c');

  useEffect(() => {
    setCoachFeedbackActive(params.tourCoach === 'c');
  }, [params.tourCoach]);

  const loadLesson = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSessionSaved(false);
    setStepIndex(0);
    setFeedback(null);
    setIsRevealed(false);
    setXp(0);
    setCorrectCount(0);
    setMissedTerms([]);
    setSpeechHint(null);
    setSpokenDraft('');

    try {
      const source = await loadQueueSource(category);
      const queue = buildLessonQueue({
        terms: source.terms,
        stateMap: source.stateMap,
        mode,
        category,
      });
      setLesson(queue);
    } catch (loadError) {
      setError(toUserMessage(loadError, 'Something did not load. Retry to continue learning.'));
    } finally {
      setLoading(false);
    }
  }, [category, mode]);

  useEffect(() => {
    void loadLesson();
    return () => {
      recognitionRef.current?.stop?.();
      recognitionRef.current = null;
    };
  }, [loadLesson]);

  const totalSteps = lesson?.steps.length ?? 0;
  const step = lesson?.steps[stepIndex];
  const isFinished = Boolean(lesson && stepIndex >= lesson.steps.length);
  const accuracy = totalSteps > 0 ? Math.round((correctCount / totalSteps) * 100) : 0;

  useEffect(() => {
    if (!coachFeedbackActive || !feedback) {
      return;
    }

    setCoachFeedbackActive(false);
    void markTourSeen();
  }, [coachFeedbackActive, feedback]);

  useEffect(() => {
    if (!isFinished || !lesson || sessionSaved) {
      return;
    }

    setSessionSaved(true);
    void saveLessonSession({
      id: `${Date.now()}-${lesson.mode}`,
      mode: lesson.mode,
      totalSteps,
      completedSteps: stepIndex,
      correctAnswers: correctCount,
      xpEarned: xp,
    });
  }, [correctCount, isFinished, lesson, sessionSaved, stepIndex, totalSteps, xp]);

  const handleAnswer = useCallback(
    async (answer: string | 'knew' | 'missed', source: 'tap' | 'speech' = 'tap') => {
      if (!step || feedback) {
        return;
      }

      const result = evaluateStep({ step, answer });
      setFeedback({
        correct: result.correct,
        message: result.message,
        explanation: step.explanation,
        chosenAnswer: String(answer),
      });
      setXp((current) => current + result.xpEarned);
      if (result.correct) {
        setCorrectCount((current) => current + 1);
      } else {
        setMissedTerms((current) => (current.includes(step.term.term) ? current : [...current, step.term.term]));
      }

      try {
        const sourceData = await loadQueueSource(category);
        const previousState = sourceData.stateMap.get(step.term.id);
        const nextState = getNextTermState({
          previous: previousState,
          termId: step.term.id,
          correct: result.correct,
        });

        await Promise.all([
          saveUserTermState(nextState),
          insertOutboxEvent(step.term.id, {
            source,
            stepType: step.type,
            correct: result.correct,
            answer,
            nextState: {
              mastery: nextState.mastery,
              stabilityDays: nextState.stabilityDays,
              dueAt: nextState.dueAt,
              correctCount: nextState.correctCount,
              incorrectCount: nextState.incorrectCount,
            },
            at: Date.now(),
          }),
        ]);
      } catch (saveError) {
        setSpeechHint(toUserMessage(saveError, 'Saved locally. We will retry sync automatically.'));
      }
    },
    [category, feedback, step],
  );

  const handleNext = useCallback(() => {
    setFeedback(null);
    setIsRevealed(false);
    setSpeechHint(null);
    setSpokenDraft('');
    setIsListening(false);
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setStepIndex((current) => current + 1);
  }, []);

  const handleSpeak = useCallback(() => {
    if (!step) {
      return;
    }

    const speakResult = speakText(step.term.term);
    if (!speakResult.ok) {
      setSpeechHint(speakResult.error);
    }
  }, [step]);

  const startSpeechInput = useCallback(async () => {
    if (!step || step.type !== 'sentence' || feedback) {
      return;
    }

    if (!supportsSpeechToText()) {
      setSpeechHint('Speech input is unavailable on this device. Use option buttons below.');
      return;
    }

    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      setSpeechHint('Microphone permission denied. Enable it in browser/app settings.');
      return;
    }

    setSpeechHint('Listening...');
    setIsListening(true);

    recognitionRef.current = startSpeechToText({
      onResult: (transcript) => {
        setIsListening(false);
        const normalizedTranscript = normalizeSpokenAnswer(transcript);
        const correctAnswer = normalizeSpokenAnswer(step.correctAnswer ?? '');
        const accepted =
          normalizedTranscript === correctAnswer ||
          normalizedTranscript.includes(correctAnswer) ||
          normalizedTranscript.split(' ').includes(correctAnswer);

        setSpokenDraft(transcript);
        setSpeechHint(`Heard: "${transcript}"`);
        void handleAnswer(accepted ? step.correctAnswer ?? transcript : transcript, 'speech');
      },
      onError: (message) => {
        setIsListening(false);
        setSpeechHint(message);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });
  }, [feedback, handleAnswer, step]);

  if (loading) {
    return (
      <Screen>
        <Card>
          <Text style={styles.title}>Preparing lesson...</Text>
          <Text style={styles.muted}>Building your adaptive queue from local data.</Text>
        </Card>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Card>
          <Text style={styles.title}>Something did not load</Text>
          <Text style={styles.muted}>{error}</Text>
          <Button label="Retry" onPress={() => void loadLesson()} />
          <Button label="Go Home" onPress={() => router.replace({ pathname: '/home' })} variant="secondary" />
        </Card>
      </Screen>
    );
  }

  if (!lesson || lesson.steps.length === 0) {
    return (
      <Screen>
        <Card>
          <Text style={styles.title}>No terms in this queue</Text>
          <Text style={styles.muted}>Try a different mode or category.</Text>
          <Button label="Back to Home" onPress={() => router.replace({ pathname: '/home' })} />
        </Card>
      </Screen>
    );
  }

  if (isFinished) {
    return (
      <Screen scroll>
        <Card>
          <Text style={styles.title}>Lesson Complete</Text>
          <Text style={styles.metricValue}>+{xp} XP</Text>
          <Text style={styles.muted}>Accuracy: {accuracy}%</Text>
          <Text style={styles.muted}>Terms to review: {missedTerms.length === 0 ? 'None 🎉' : missedTerms.join(', ')}</Text>
          <Button
            label="Review Missed"
            onPress={() =>
              router.replace({
                pathname: '/learn',
                params: { mode: 'weak-areas' },
              })
            }
          />
          <Button label="Done" onPress={() => router.replace({ pathname: '/home' })} variant="secondary" />
        </Card>
      </Screen>
    );
  }

  const activeStep = step as LessonStep;

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <Button label="Back" onPress={() => router.replace({ pathname: '/home' })} variant="secondary" />
        <Text style={styles.xpText}>XP {xp}</Text>
      </View>

      <ProgressBar value={(stepIndex + 1) / totalSteps} />
      <Text style={styles.progressText}>
        Step {stepIndex + 1}/{totalSteps}
      </Text>

      <Card>
        <View style={styles.termHeader}>
          <View style={styles.reasonChip}>
            <Text style={styles.reasonChipText}>{activeStep.reason}</Text>
          </View>
          <Pressable onPress={handleSpeak} style={styles.speaker}>
            <Text style={styles.speakerText}>🔊</Text>
          </Pressable>
        </View>

        <Text style={styles.term}>{activeStep.term.term}</Text>
        <Text style={styles.pronunciation}>{activeStep.term.pronunciation}</Text>

        {activeStep.type === 'flashcard' ? (
          <View style={styles.block}>
            {!isRevealed ? (
              <Button label="Reveal" onPress={() => setIsRevealed(true)} />
            ) : (
              <>
                <Text style={styles.definition}>{activeStep.term.definition}</Text>
                <Text style={styles.muted}>{activeStep.term.exampleSentence}</Text>
                <View style={styles.answerRow}>
                  {coachFeedbackActive && !feedback ? (
                    <CoachMarkOverlay
                      title="Adaptive feedback"
                      body="Be honest - this is how Mediasis adapts your review schedule."
                      onSkip={() => {
                        setCoachFeedbackActive(false);
                        void markTourSeen();
                      }}>
                      <View style={styles.coachAnswerWrap}>
                        <Button label="I knew it" onPress={() => void handleAnswer('knew')} />
                        <Button label="I missed it" onPress={() => void handleAnswer('missed')} variant="secondary" />
                      </View>
                    </CoachMarkOverlay>
                  ) : (
                    <>
                      <Button label="I knew it" onPress={() => void handleAnswer('knew')} />
                      <Button label="I missed it" onPress={() => void handleAnswer('missed')} variant="secondary" />
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        ) : (
          <View style={styles.block}>
            <Text style={styles.prompt}>{activeStep.prompt}</Text>
            {activeStep.type === 'sentence' ? (
              <View style={styles.speechRow}>
                <Button label={isListening ? 'Listening...' : 'Speak Answer'} onPress={() => void startSpeechInput()} />
                <TextInput
                  value={spokenDraft}
                  onChangeText={setSpokenDraft}
                  editable={!feedback}
                  placeholder="Type or dictate your answer"
                  placeholderTextColor={theme.muted}
                  style={styles.speechInput}
                />
                <Button
                  label="Check typed/speech answer"
                  variant="secondary"
                  disabled={!spokenDraft.trim() || Boolean(feedback)}
                  onPress={() => {
                    const normalizedDraft = normalizeSpokenAnswer(spokenDraft);
                    const correctAnswer = normalizeSpokenAnswer(activeStep.correctAnswer ?? '');
                    const accepted =
                      normalizedDraft === correctAnswer ||
                      normalizedDraft.includes(correctAnswer) ||
                      normalizedDraft.split(' ').includes(correctAnswer);
                    void handleAnswer(accepted ? activeStep.correctAnswer ?? spokenDraft : spokenDraft, 'speech');
                  }}
                />
              </View>
            ) : null}

            {speechHint ? <Banner text={speechHint} /> : null}

            <View style={styles.optionGrid}>
              {activeStep.options?.map((option) => {
                const selected = feedback?.chosenAnswer === option;
                const isCorrectOption = feedback && activeStep.correctAnswer === option;
                return (
                  <Pressable
                    key={option}
                    style={[
                      styles.option,
                      selected && styles.optionSelected,
                      isCorrectOption && styles.optionCorrect,
                    ]}
                    onPress={() => void handleAnswer(option)}
                    disabled={Boolean(feedback)}>
                    <Text style={styles.optionText}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </Card>

      {feedback ? (
        <Card>
          <Text style={[styles.feedbackTitle, feedback.correct ? styles.feedbackGood : styles.feedbackBad]}>
            {feedback.correct ? 'Correct' : 'Try again soon'}
          </Text>
          <Text style={styles.muted}>{feedback.message}</Text>
          <Text style={styles.definition}>{feedback.explanation}</Text>
          <Button label="Next" onPress={handleNext} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  progressText: {
    color: theme.muted,
    fontSize: 12,
  },
  title: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '900',
  },
  metricValue: {
    color: theme.accent,
    fontSize: 34,
    fontWeight: '900',
  },
  muted: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  xpText: {
    color: theme.accent,
    fontSize: 18,
    fontWeight: '800',
  },
  termHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reasonChip: {
    borderRadius: 8,
    borderWidth: 3,
    borderColor: theme.wood,
    backgroundColor: theme.panelSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reasonChipText: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  speaker: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.panelSoft,
  },
  speakerText: {
    fontSize: 20,
  },
  term: {
    color: theme.text,
    fontSize: 30,
    fontWeight: '900',
  },
  pronunciation: {
    color: theme.neon,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  definition: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 22,
  },
  block: {
    gap: 10,
  },
  answerRow: {
    gap: 6,
  },
  coachAnswerWrap: {
    gap: 6,
  },
  prompt: {
    color: theme.text,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
  },
  speechRow: {
    gap: 6,
  },
  speechInput: {
    borderWidth: 3,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.panelSoft,
    color: theme.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  optionGrid: {
    gap: 8,
  },
  option: {
    borderWidth: 3,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.panelSoft,
  },
  optionSelected: {
    borderColor: theme.accentSecondary,
    backgroundColor: '#462A1D',
  },
  optionCorrect: {
    borderColor: theme.success,
    backgroundColor: '#27442D',
  },
  optionText: {
    color: theme.text,
    fontSize: 14,
    lineHeight: 20,
  },
  feedbackTitle: {
    fontSize: 19,
    fontWeight: '900',
  },
  feedbackGood: {
    color: theme.success,
  },
  feedbackBad: {
    color: theme.accentSecondary,
  },
});
