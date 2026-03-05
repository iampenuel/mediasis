import { StyleSheet, Text } from 'react-native';

import { Button } from './Button';
import { Card } from './Card';
import { Screen } from './Screen';
import { theme } from './theme';

type ErrorFallbackProps = {
  onReload: () => void;
};

export function ErrorFallback({ onReload }: ErrorFallbackProps) {
  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>An unexpected error occurred. Please reload the app.</Text>
        <Button label="Reload" onPress={onReload} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '800',
  },
  message: {
    color: theme.muted,
    fontSize: 15,
    lineHeight: 21,
  },
});
