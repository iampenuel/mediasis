import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';

import { AuthGate, AuthProvider } from '../src/features/auth/authStore';
import { queryClient } from '../src/lib/queryClient';
import { theme } from '../src/ui';
import { AppErrorBoundary } from '../src/ui/AppErrorBoundary';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PressStart2P: PressStart2P_400Regular,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.bootWrap}>
        <ActivityIndicator color={theme.gold} size="small" />
      </View>
    );
  }

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthGate>
            <Stack
              screenOptions={{
                headerShown: false,
              }}
            />
          </AuthGate>
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  bootWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bg,
  },
});
