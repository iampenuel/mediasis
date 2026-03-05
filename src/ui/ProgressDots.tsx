import { StyleSheet, View } from 'react-native';

import { theme } from './theme';

type ProgressDotsProps = {
  total: number;
  activeIndex: number;
};

export function ProgressDots({ total, activeIndex }: ProgressDotsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, index) => (
        <View key={index} style={[styles.dot, index === activeIndex && styles.dotActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 0,
    backgroundColor: theme.panelSoft,
  },
  dotActive: {
    width: 14,
    backgroundColor: theme.accent,
  },
});
