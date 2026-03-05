import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { markTourSeen } from '../src/features/tour/storage';
import { bodyText, Button, Card, pixelHeading, PixelKoala, ProgressDots, Screen, theme } from '../src/ui';

const TOUR_STEPS = [
  {
    title: 'Welcome to Mediasis',
    body: 'Build clinical vocabulary the way you actually study-fast, daily, and designed to stick.',
  },
  {
    title: 'Daily Lesson',
    body: 'Master high-yield terms daily and keep your streak active with focused sessions.',
  },
  {
    title: 'Practice Modes',
    body: 'Use quick review, weak areas, and category drill to target the right terms faster.',
  },
  {
    title: 'Library + Profile',
    body: 'Track progress, revisit terms, and keep improving your XP level each day.',
  },
];

export default function TourScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const current = TOUR_STEPS[index];
  const isLast = index === TOUR_STEPS.length - 1;
  const desktop = width >= 1000;
  const tablet = width >= 700;
  const cardMaxWidth = desktop ? 740 : tablet ? 630 : 560;
  const koalaSize = desktop ? 164 : tablet ? 138 : 108;
  const baseTitle = desktop ? 46 : tablet ? 34 : 24;
  const titlePenalty = current.title.length >= 16 ? 3 : 0;
  const titleSize = Math.max(20, baseTitle - titlePenalty);
  const bodySize = desktop ? 18 : tablet ? 16 : 13;
  const bodyLine = desktop ? 30 : tablet ? 26 : 22;
  const closeSize = tablet ? 46 : 40;

  const primaryLabel = useMemo(() => {
    if (index === 0) {
      return 'Start Tour';
    }

    return isLast ? 'Finish' : 'Next';
  }, [index, isLast]);

  const exitTour = async () => {
    await markTourSeen();
    router.replace('/home');
  };

  const nextStep = async () => {
    if (isLast) {
      await markTourSeen();
      router.replace('/home');
      return;
    }

    setIndex((value) => Math.min(value + 1, TOUR_STEPS.length - 1));
  };

  return (
    <Screen scroll>
      <View style={styles.wrap}>
        <View style={styles.koalaWrap}>
          <PixelKoala size={koalaSize} />
          <View style={styles.tip} />
        </View>

        <Card style={[styles.card, { maxWidth: cardMaxWidth }]}>
          <View style={styles.titleRow}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.74}
              numberOfLines={3}
              style={[styles.title, pixelHeading, { fontSize: titleSize, lineHeight: titleSize * 1.08 }]}>
              {current.title}
            </Text>
            <Pressable style={[styles.closeButton, { width: closeSize, height: closeSize }]} onPress={() => void exitTour()}>
              <Text style={[styles.closeText, bodyText, { fontSize: tablet ? 40 : 30 }]}>X</Text>
            </Pressable>
          </View>

          <Text style={[styles.body, bodyText, { fontSize: bodySize, lineHeight: bodyLine }]}>{current.body}</Text>

          <View style={styles.buttons}>
            <Button label={primaryLabel} onPress={() => void nextStep()} />
            <Button label="Skip" variant="outline" onPress={() => void exitTour()} />
          </View>

          <ProgressDots total={TOUR_STEPS.length} activeIndex={index} />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 8,
  },
  koalaWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tip: {
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderTopWidth: 0,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: theme.border,
    marginTop: -6,
  },
  card: {
    width: '100%',
    borderRadius: 26,
    gap: 16,
  },
  titleRow: {
    paddingRight: 40,
    minHeight: 56,
  },
  title: {
    color: theme.gold,
  },
  closeButton: {
    position: 'absolute',
    right: -8,
    top: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: theme.muted,
    fontWeight: '400',
  },
  body: {
    color: theme.text,
    fontWeight: '600',
  },
  buttons: {
    gap: 8,
  },
});
