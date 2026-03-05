import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { useAuth } from '../src/features/auth/authStore';
import { Button, Card, Screen, theme } from '../src/ui';

const passwordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { updatePassword, authBusy } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setInfo(null);
    const validation = passwordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? 'Invalid password.');
      return;
    }

    const result = await updatePassword(validation.data.password);
    if (!result.ok) {
      setError(result.error ?? 'Unable to update password.');
      return;
    }

    setInfo('Password updated. Signing you in...');
    setTimeout(() => {
      router.replace('/tour?entry=reset');
    }, 1200);
  };

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Set a new local password for your account on this device.</Text>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>New password</Text>
          <TextInput
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="New password"
            placeholderTextColor={theme.muted}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor={theme.muted}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}
        <Button
          label={authBusy ? 'Updating...' : 'Update local password'}
          onPress={() => void submit()}
          disabled={authBusy}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.text,
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    color: theme.muted,
    fontSize: 14,
  },
  input: {
    borderWidth: 2,
    borderColor: theme.border,
    borderRadius: 4,
    backgroundColor: theme.panelSoft,
    color: theme.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    color: '#fca5a5',
    fontSize: 14,
  },
  info: {
    color: theme.accent,
    fontSize: 14,
  },
});
