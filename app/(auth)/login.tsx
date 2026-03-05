import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { z } from 'zod';

import { useAuth } from '../../src/features/auth/authStore';
import { bodyText, Button, Card, pixelHeading, pixelLabel, PixelKoala, Screen, theme } from '../../src/ui';

const signInSchema = z.object({
  username: z.string().trim().min(3, 'Enter your username.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

const signUpSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters.')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, ".", "_" or "-".'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type Mode = 'sign-in' | 'sign-up';

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const { authBusy, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSignIn = mode === 'sign-in';
  const ctaLabel = useMemo(() => (isSignIn ? 'Sign In' : 'Create Account'), [isSignIn]);
  const cardMaxWidth = width >= 900 ? 760 : width >= 700 ? 620 : 470;
  const cardViewportWidth = Math.min(width, cardMaxWidth);
  const brandSize = Math.min(width >= 900 ? 76 : width >= 700 ? 62 : 46, Math.max(30, Math.floor((cardViewportWidth - 64) / 8.3)));
  const koalaSize = width >= 900 ? 132 : width >= 700 ? 116 : 92;
  const labelSize = width >= 900 ? 20 : width >= 700 ? 17 : 13;
  const bodySize = width >= 900 ? 21 : width >= 700 ? 18 : 14;
  const subSize = width >= 900 ? 24 : width >= 700 ? 20 : 14;
  const registerSize = width >= 900 ? 18 : width >= 700 ? 15 : 12;

  const submit = async () => {
    setErrorMessage(null);
    const result = isSignIn
      ? (() => {
          const parsed = signInSchema.safeParse({ username, password });
          if (!parsed.success) {
            setErrorMessage(parsed.error.issues[0]?.message ?? 'Invalid credentials.');
            return null;
          }
          return signIn(parsed.data.username, parsed.data.password);
        })()
      : (() => {
          const parsed = signUpSchema.safeParse({ username, password });
          if (!parsed.success) {
            setErrorMessage(parsed.error.issues[0]?.message ?? 'Invalid credentials.');
            return null;
          }
          return signUp(parsed.data.username, parsed.data.password);
        })();

    if (!result) {
      return;
    }

    const resolved = await result;
    if (!resolved.ok) {
      setErrorMessage(resolved.error ?? 'Unable to complete this request.');
    }
  };

  return (
    <Screen scroll contentStyle={styles.scrollContent}>
      <View style={styles.wrapper}>
        <Card style={[styles.authCard, { maxWidth: cardMaxWidth }]}>
          <View style={styles.logoWrap}>
            <PixelKoala size={koalaSize} />
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.58}
              numberOfLines={1}
              style={[styles.brand, pixelHeading, { fontSize: brandSize, lineHeight: brandSize + 6 }]}>
              MEDIASIS
            </Text>
            <Text style={[styles.brandSub, bodyText, { fontSize: subSize }]}>Clinical terms, mastered daily.</Text>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, pixelLabel, { fontSize: labelSize }]}>USERNAME</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Enter your username"
              placeholderTextColor={theme.muted}
              style={[styles.input, bodyText, { fontSize: bodySize }]}
              value={username}
              onChangeText={setUsername}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, pixelLabel, { fontSize: labelSize }]}>PASSWORD</Text>
            <TextInput
              secureTextEntry
              placeholder="Enter your password"
              placeholderTextColor={theme.muted}
              style={[styles.input, bodyText, { fontSize: bodySize }]}
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {errorMessage ? <Text style={[styles.error, bodyText, { fontSize: bodySize - 1 }]}>{errorMessage}</Text> : null}

          <Button label={authBusy ? 'Processing...' : ctaLabel} onPress={() => void submit()} disabled={authBusy} />

          <Pressable
            style={styles.registerRow}
            onPress={() => {
              setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'));
              setErrorMessage(null);
            }}
            disabled={authBusy}>
            <Text style={[styles.registerText, pixelLabel, { fontSize: registerSize }]}>
              {isSignIn ? 'NEED AN ACCOUNT? REGISTER' : 'ALREADY HAVE AN ACCOUNT? SIGN IN'}
            </Text>
          </Pressable>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    justifyContent: 'center',
  },
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  authCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: theme.border,
    gap: 16,
    paddingTop: 22,
    paddingBottom: 18,
  },
  logoWrap: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  brand: {
    color: theme.gold,
    textAlign: 'center',
    width: '92%',
  },
  brandSub: {
    color: theme.muted,
    textAlign: 'center',
    fontWeight: '600',
  },
  fieldWrap: {
    gap: 8,
  },
  label: {
    color: '#B3BDCD',
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 2,
    borderColor: theme.border,
    borderRadius: 10,
    backgroundColor: theme.bg,
    color: theme.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontWeight: '500',
  },
  error: {
    color: '#F5A6A6',
    fontWeight: '600',
  },
  registerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    marginTop: 4,
  },
  registerText: {
    color: '#A7B2C4',
    letterSpacing: 0.45,
  },
});
