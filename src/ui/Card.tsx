import { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from './theme';

type CardProps = PropsWithChildren<{
  variant?: 'default' | 'compact' | 'stat';
  style?: StyleProp<ViewStyle>;
}>;

export function Card({ children, variant = 'default', style }: CardProps) {
  return <View style={[styles.card, variant === 'compact' && styles.compact, variant === 'stat' && styles.stat, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.panel,
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: theme.border,
    padding: 20,
    gap: 14,
    shadowColor: '#13233A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 0,
  },
  compact: {
    padding: 16,
    gap: 10,
  },
  stat: {
    padding: 14,
    gap: 10,
    minHeight: 110,
    justifyContent: 'center',
  },
});
