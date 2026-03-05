import { StyleSheet, Text, View } from 'react-native';

import { pixelText } from './typography';
import { theme } from './theme';

type ToastProps = {
  text: string;
};

export function Toast({ text }: ToastProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.border,
    backgroundColor: theme.panelDeep,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  text: {
    ...pixelText,
    textTransform: 'none',
    color: theme.text,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0,
    fontWeight: '600',
    textAlign: 'center',
  },
});
