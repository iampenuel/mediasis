import { StyleSheet, View } from 'react-native';

import { theme } from './theme';

type ProgressBarProps = {
  value: number;
};

export function ProgressBar({ value }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(1, value));

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${safeValue * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: theme.border,
    backgroundColor: theme.panelSoft,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.accentSecondary,
  },
});
