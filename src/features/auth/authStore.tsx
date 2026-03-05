import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { logError } from '../../lib/logging';
import { Button, Card, Screen, theme } from '../../ui';
import { Platform, StyleSheet, Text } from 'react-native';

type AuthUser = {
  id: string;
  email: string;
  user_metadata: {
    username: string;
  };
};

type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: AuthUser;
};

type AuthContextValue = {
  session: AuthSession | null;
  user: AuthUser | null;
  loading: boolean;
  isInitializing: boolean;
  authBusy: boolean;
  initError: string | null;
  signIn: (identifier: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<{ ok: boolean; error?: string }>;
  requestPasswordReset: (identifier: string) => Promise<{ ok: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ ok: boolean; error?: string }>;
  retryInit: () => Promise<void>;
};

type LocalAccount = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  updatedAt: string;
};

type LocalAuthStore = {
  accounts: LocalAccount[];
};

const LOCAL_AUTH_STORE_KEY = 'mediasis_local_auth_store_v1';
const LOCAL_AUTH_SESSION_KEY = 'mediasis_local_auth_session_v1';
const LOCAL_AUTH_RESET_KEY = 'mediasis_local_auth_reset_v1';
const LOCAL_AUTH_DEVICE_SECRET_KEY = 'mediasis_local_auth_device_secret_v1';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const WEB_STORAGE_TIMEOUT_MS = 1500;
const webStorageMemoryFallback = new Map<string, string>();

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readWebFallbackValue(key: string) {
  if (Platform.OS !== 'web') {
    return null;
  }

  try {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Ignore storage access issues and fall through to memory fallback.
  }

  return webStorageMemoryFallback.get(key) ?? null;
}

function writeWebFallbackValue(key: string, value: string) {
  if (Platform.OS !== 'web') {
    return;
  }

  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  } catch {
    webStorageMemoryFallback.set(key, value);
    return;
  }

  webStorageMemoryFallback.set(key, value);
}

function deleteWebFallbackValue(key: string) {
  if (Platform.OS !== 'web') {
    return;
  }

  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage access issues and still clear memory fallback.
  }

  webStorageMemoryFallback.delete(key);
}

async function runWithWebStorageTimeout<T>(operation: () => Promise<T>, onTimeout: () => T): Promise<T> {
  if (Platform.OS !== 'web') {
    return operation();
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(onTimeout());
    }, WEB_STORAGE_TIMEOUT_MS);

    operation()
      .then((value) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        reject(error);
      });
  });
}

async function getStoredValue(key: string) {
  try {
    return await runWithWebStorageTimeout(() => SecureStore.getItemAsync(key), () => readWebFallbackValue(key));
  } catch (error) {
    if (Platform.OS !== 'web') {
      throw error;
    }

    logError(error, { area: 'auth_storage_get', key });
    return readWebFallbackValue(key);
  }
}

async function setStoredValue(key: string, value: string) {
  if (Platform.OS === 'web') {
    writeWebFallbackValue(key, value);
  }

  try {
    await runWithWebStorageTimeout(() => SecureStore.setItemAsync(key, value), () => undefined);
  } catch (error) {
    if (Platform.OS !== 'web') {
      throw error;
    }

    logError(error, { area: 'auth_storage_set', key });
  }
}

async function deleteStoredValue(key: string) {
  if (Platform.OS === 'web') {
    deleteWebFallbackValue(key);
  }

  try {
    await runWithWebStorageTimeout(() => SecureStore.deleteItemAsync(key), () => undefined);
  } catch (error) {
    if (Platform.OS !== 'web') {
      throw error;
    }

    logError(error, { area: 'auth_storage_delete', key });
  }
}

function normalizeUsername(value: string) {
  return value.trim().replace(/\s+/g, '').toLowerCase();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function secureCompare(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}

function parseStore(raw: string | null): LocalAuthStore {
  if (!raw) {
    return { accounts: [] };
  }

  try {
    const parsed = JSON.parse(raw) as { accounts?: LocalAccount[] };
    if (!Array.isArray(parsed.accounts)) {
      return { accounts: [] };
    }

    return {
      accounts: parsed.accounts.filter(
        (entry) =>
          typeof entry?.id === 'string' &&
          typeof entry?.username === 'string' &&
          typeof entry?.email === 'string' &&
          typeof entry?.passwordHash === 'string' &&
          typeof entry?.passwordSalt === 'string',
      ),
    };
  } catch {
    return { accounts: [] };
  }
}

function parseSession(raw: string | null): AuthSession | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (
      !parsed ||
      typeof parsed.access_token !== 'string' ||
      typeof parsed.refresh_token !== 'string' ||
      typeof parsed.expires_at !== 'number' ||
      !parsed.user ||
      typeof parsed.user.id !== 'string' ||
      typeof parsed.user.email !== 'string'
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

async function loadAuthStore() {
  const raw = await getStoredValue(LOCAL_AUTH_STORE_KEY);
  return parseStore(raw);
}

async function saveAuthStore(store: LocalAuthStore) {
  await setStoredValue(LOCAL_AUTH_STORE_KEY, JSON.stringify(store));
}

function toAuthUser(account: LocalAccount): AuthUser {
  return {
    id: account.id,
    email: account.email,
    user_metadata: {
      username: account.username,
    },
  };
}

async function randomHex(byteLength: number) {
  const bytes = await Crypto.getRandomBytesAsync(byteLength);
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function ensureDeviceSecret() {
  const existing = await getStoredValue(LOCAL_AUTH_DEVICE_SECRET_KEY);
  if (existing) {
    return existing;
  }

  const next = await randomHex(32);
  await setStoredValue(LOCAL_AUTH_DEVICE_SECRET_KEY, next);
  return next;
}

async function hashPassword(password: string, salt: string) {
  const deviceSecret = await ensureDeviceSecret();
  const firstPass = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${deviceSecret}:${salt}:${password}`,
  );
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${firstPass}:${deviceSecret}`);
}

async function createSession(account: LocalAccount): Promise<AuthSession> {
  const now = Date.now();
  return {
    access_token: await randomHex(24),
    refresh_token: await randomHex(24),
    expires_at: now + SESSION_DURATION_MS,
    user: toAuthUser(account),
  };
}

function findAccountByUsername(store: LocalAuthStore, username: string) {
  const cleaned = normalizeUsername(username);
  if (!cleaned) {
    return null;
  }

  return store.accounts.find((entry) => entry.username === cleaned) ?? null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    setIsInitializing(true);
    setInitError(null);

    try {
      const [rawSession, store] = await Promise.all([
        getStoredValue(LOCAL_AUTH_SESSION_KEY),
        loadAuthStore(),
      ]);
      const storedSession = parseSession(rawSession);
      if (!storedSession) {
        setSession(null);
        setUser(null);
        await deleteStoredValue(LOCAL_AUTH_SESSION_KEY);
        return;
      }

      const account = store.accounts.find((entry) => entry.id === storedSession.user.id);
      if (!account) {
        setSession(null);
        setUser(null);
        await deleteStoredValue(LOCAL_AUTH_SESSION_KEY);
        return;
      }

      const hydrated = {
        ...storedSession,
        user: toAuthUser(account),
      };
      setSession(hydrated);
      setUser(hydrated.user);
    } catch (error) {
      logError(error, { area: 'auth_initialize_local' });
      setInitError('Unable to restore your local account. Try again.');
      setSession(null);
      setUser(null);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const signIn = useCallback(async (identifier: string, password: string) => {
    setAuthBusy(true);

    try {
      const store = await loadAuthStore();
      const account = findAccountByUsername(store, identifier);
      if (!account) {
        return { ok: false, error: 'No account found for that username.' };
      }

      const expectedHash = await hashPassword(password, account.passwordSalt);
      if (!secureCompare(expectedHash, account.passwordHash)) {
        return { ok: false, error: 'Invalid username or password.' };
      }

      const nextSession = await createSession(account);
      await Promise.all([
        setStoredValue(LOCAL_AUTH_SESSION_KEY, JSON.stringify(nextSession)),
        deleteStoredValue(LOCAL_AUTH_RESET_KEY),
      ]);
      setSession(nextSession);
      setUser(nextSession.user);
      return { ok: true };
    } catch (error) {
      logError(error, { area: 'auth_sign_in_local' });
      return { ok: false, error: 'Unable to sign in on this device right now.' };
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signUp = useCallback(async (username: string, password: string) => {
    setAuthBusy(true);

    try {
      const normalizedUsername = normalizeUsername(username);
      if (!normalizedUsername) {
        return { ok: false, error: 'Enter a username.' };
      }
      const normalizedEmail = normalizeEmail(`${normalizedUsername}@local.mediasis`);

      const store = await loadAuthStore();
      if (store.accounts.some((entry) => entry.username === normalizedUsername)) {
        return { ok: false, error: 'Username already exists on this device.' };
      }
      if (store.accounts.some((entry) => entry.email === normalizedEmail)) {
        return { ok: false, error: 'Email already exists on this device.' };
      }

      const nowIso = new Date().toISOString();
      const passwordSalt = await randomHex(16);
      const passwordHash = await hashPassword(password, passwordSalt);
      const account: LocalAccount = {
        id: `local_${await randomHex(12)}`,
        username: normalizedUsername,
        email: normalizedEmail,
        passwordSalt,
        passwordHash,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const nextStore = {
        accounts: [...store.accounts, account],
      };
      const nextSession = await createSession(account);

      await Promise.all([
        saveAuthStore(nextStore),
        setStoredValue(LOCAL_AUTH_SESSION_KEY, JSON.stringify(nextSession)),
        deleteStoredValue(LOCAL_AUTH_RESET_KEY),
      ]);
      setSession(nextSession);
      setUser(nextSession.user);
      return { ok: true };
    } catch (error) {
      logError(error, { area: 'auth_sign_up_local' });
      return { ok: false, error: 'Unable to create a local account right now.' };
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthBusy(true);
    try {
      await deleteStoredValue(LOCAL_AUTH_SESSION_KEY);
      setSession(null);
      setUser(null);
      return { ok: true };
    } catch (error) {
      logError(error, { area: 'auth_sign_out_local' });
      return { ok: false, error: 'Unable to log out right now.' };
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const requestPasswordReset = useCallback(async (identifier: string) => {
    setAuthBusy(true);
    try {
      const store = await loadAuthStore();
      const account = findAccountByUsername(store, identifier);
      if (!account) {
        return { ok: false, error: 'No account found for that username.' };
      }

      await setStoredValue(LOCAL_AUTH_RESET_KEY, account.id);
      return { ok: true };
    } catch (error) {
      logError(error, { area: 'auth_password_reset_local' });
      return { ok: false, error: 'Unable to prepare password reset right now.' };
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const updatePassword = useCallback(
    async (password: string) => {
      setAuthBusy(true);
      try {
        const [store, pendingResetId] = await Promise.all([
          loadAuthStore(),
          getStoredValue(LOCAL_AUTH_RESET_KEY),
        ]);
        const accountId = session?.user.id ?? pendingResetId;
        if (!accountId) {
          return { ok: false, error: 'Start reset from the login screen first.' };
        }

        const index = store.accounts.findIndex((entry) => entry.id === accountId);
        if (index < 0) {
          return { ok: false, error: 'Local account not found for password reset.' };
        }

        const existing = store.accounts[index];
        const passwordSalt = await randomHex(16);
        const passwordHash = await hashPassword(password, passwordSalt);
        const updated: LocalAccount = {
          ...existing,
          passwordSalt,
          passwordHash,
          updatedAt: new Date().toISOString(),
        };
        const nextAccounts = [...store.accounts];
        nextAccounts[index] = updated;

        const nextSession = await createSession(updated);
        await Promise.all([
          saveAuthStore({ accounts: nextAccounts }),
          setStoredValue(LOCAL_AUTH_SESSION_KEY, JSON.stringify(nextSession)),
          deleteStoredValue(LOCAL_AUTH_RESET_KEY),
        ]);
        setSession(nextSession);
        setUser(nextSession.user);
        return { ok: true };
      } catch (error) {
        logError(error, { area: 'auth_update_password_local' });
        return { ok: false, error: 'Unable to update password right now.' };
      } finally {
        setAuthBusy(false);
      }
    },
    [session?.user.id],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      loading: isInitializing,
      isInitializing,
      authBusy,
      initError,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      retryInit: initialize,
    }),
    [authBusy, initError, initialize, isInitializing, requestPasswordReset, session, signIn, signOut, signUp, updatePassword, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}

export function AuthGate({ children }: PropsWithChildren) {
  const { isInitializing, initError, retryInit, session } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const topSegment = segments[0];
  const inAuth = topSegment === '(auth)';
  const inTabs = topSegment === '(tabs)';
  const atRoot = !topSegment;

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!session && inTabs) {
      router.replace('/login');
      return;
    }

    if (session && inAuth) {
      router.replace('/tour?entry=login');
    }
  }, [inAuth, inTabs, isInitializing, router, session]);

  if (isInitializing && !atRoot) {
    return (
      <Screen>
        <Card>
          <Text style={styles.title}>Checking local session...</Text>
          <Text style={styles.body}>Loading on-device account state.</Text>
          {initError ? <Text style={styles.error}>{initError}</Text> : null}
          {initError ? <Button label="Retry" onPress={() => void retryInit()} /> : null}
        </Card>
      </Screen>
    );
  }

  if (initError && !atRoot) {
    return (
      <Screen>
        <Card>
          <Text style={styles.title}>Could not load local session</Text>
          <Text style={styles.body}>{initError}</Text>
          <Button label="Retry" onPress={() => void retryInit()} />
        </Card>
      </Screen>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  title: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    color: theme.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  error: {
    color: '#fca5a5',
    fontSize: 14,
  },
});
