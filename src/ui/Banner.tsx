import { StyleSheet, Text, View } from 'react-native';

import { pixelText } from './typography';
import { theme } from './theme';

type BannerProps = {
  kind?: 'info' | 'success' | 'error';
  text: string;
};

export function Banner({ kind = 'info', text }: BannerProps) {
  return (
    <View style={[styles.wrap, kind === 'success' && styles.success, kind === 'error' && styles.error]}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 8,
    borderWidth: 3,
    borderColor: theme.border,
    backgroundColor: theme.panelDeep,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  success: {
    backgroundColor: '#28402B',
    borderColor: theme.success,
  },
  error: {
    backgroundColor: '#4A1D19',
    borderColor: theme.error,
  },
  text: {
    ...pixelText,
    textTransform: 'none',
    color: theme.text,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0,
    fontWeight: '600',
  },
});
