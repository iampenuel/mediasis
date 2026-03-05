import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from './theme';

type CoachMarkOverlayProps = PropsWithChildren<{
  title: string;
  body: string;
  onSkip?: () => void;
  onNext?: () => void;
  nextLabel?: string;
}>;

export function CoachMarkOverlay({ title, body, onSkip, onNext, nextLabel = 'Next', children }: CoachMarkOverlayProps) {
  return (
    <View style={styles.overlayWrap}>
      <View style={styles.dim} pointerEvents="none" />
      <View style={styles.highlight}>{children}</View>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <View style={styles.actions}>
          {onSkip ? (
            <Pressable onPress={onSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          ) : null}
          {onNext ? (
            <Pressable onPress={onNext} style={styles.nextButton}>
              <Text style={styles.nextText}>{nextLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayWrap: {
    gap: 8,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderRadius: 6,
  },
  highlight: {
    borderRadius: 8,
    borderWidth: 3,
    borderColor: theme.accentSecondary,
    backgroundColor: 'rgba(26,52,72,0.82)',
    padding: 8,
    zIndex: 1,
  },
  card: {
    zIndex: 2,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: theme.border,
    backgroundColor: theme.panel,
    padding: 12,
    gap: 8,
  },
  title: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '900',
  },
  body: {
    color: theme.text,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  skipButton: {
    minHeight: 44,
    minWidth: 72,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  skipText: {
    color: theme.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  nextButton: {
    minHeight: 44,
    minWidth: 72,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.wood,
    backgroundColor: theme.accent,
    paddingHorizontal: 14,
  },
  nextText: {
    color: theme.accentText,
    fontSize: 14,
    fontWeight: '800',
  },
});
