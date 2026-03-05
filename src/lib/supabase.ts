import 'react-native-url-polyfill/auto';

import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import type { Session, User } from '@supabase/supabase-js';

import { env, hasSupabaseEnv } from './env';

const CHUNK_SUFFIX = '__chunk__';
const CHUNK_SIZE = 1800;

function chunkCountKey(key: string) {
  return `${key}${CHUNK_SUFFIX}count`;
}

function chunkKey(key: string, index: number) {
  return `${key}${CHUNK_SUFFIX}${index}`;
}

async function clearChunkedValue(key: string) {
  const countRaw = await SecureStore.getItemAsync(chunkCountKey(key));
  const chunkCount = Number.parseInt(countRaw ?? '', 10);
  if (Number.isNaN(chunkCount) || chunkCount <= 0) {
    await SecureStore.deleteItemAsync(chunkCountKey(key));
    return;
  }

  for (let index = 0; index < chunkCount; index += 1) {
    await SecureStore.deleteItemAsync(chunkKey(key, index));
  }

  await SecureStore.deleteItemAsync(chunkCountKey(key));
}

async function getChunkedValue(key: string) {
  const countRaw = await SecureStore.getItemAsync(chunkCountKey(key));
  const chunkCount = Number.parseInt(countRaw ?? '', 10);
  if (Number.isNaN(chunkCount) || chunkCount <= 0) {
    return null;
  }

  const chunks: string[] = [];
  for (let index = 0; index < chunkCount; index += 1) {
    const value = await SecureStore.getItemAsync(chunkKey(key, index));
    if (!value) {
      return null;
    }
    chunks.push(value);
  }

  return chunks.join('');
}

const secureStoreAdapter = {
  async getItem(key: string) {
    const directValue = await SecureStore.getItemAsync(key);
    if (directValue) {
      return directValue;
    }

    return getChunkedValue(key);
  },
  async setItem(key: string, value: string) {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      await clearChunkedValue(key);
      return;
    }

    const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.deleteItemAsync(key);
    await SecureStore.setItemAsync(chunkCountKey(key), String(chunkCount));

    for (let index = 0; index < chunkCount; index += 1) {
      const from = index * CHUNK_SIZE;
      const to = from + CHUNK_SIZE;
      await SecureStore.setItemAsync(chunkKey(key, index), value.slice(from, to));
    }
  },
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key);
    await clearChunkedValue(key);
  },
};

type SupabaseLike = {
  auth: {
    getSession: () => Promise<{ data: { session: Session | null }; error: Error | null }>;
    onAuthStateChange: (
      callback: (event: string, session: Session | null) => void,
    ) => { data: { subscription: { unsubscribe: () => void } } };
    signInWithPassword: (credentials: {
      email: string;
      password: string;
    }) => Promise<{ data: { session: Session | null; user: User | null }; error: Error | null }>;
    signUp: (credentials: {
      email: string;
      password: string;
      options?: {
        data?: Record<string, unknown>;
      };
    }) => Promise<{ data: { session: Session | null; user: User | null }; error: Error | null }>;
    signOut: () => Promise<{ error: Error | null }>;
    setSession: (tokens: {
      access_token: string;
      refresh_token: string;
    }) => Promise<{ data: { session: Session | null; user: User | null }; error: Error | null }>;
    resetPasswordForEmail: (
      email: string,
      options?: { redirectTo?: string },
    ) => Promise<{ data: object; error: Error | null }>;
    updateUser: (attributes: { password: string }) => Promise<{ data: { user: User | null }; error: Error | null }>;
  };
  from: (table: string) => {
    insert: (values: unknown) => Promise<{ data: unknown; error: Error | null }>;
    upsert: (
      values: unknown,
      options?: {
        onConflict?: string;
        ignoreDuplicates?: boolean;
      },
    ) => Promise<{ data: unknown; error: Error | null }>;
  };
};

const unavailableAuth = {
  getSession: async () => ({
    data: { session: null },
    error: new Error('Auth is unavailable until Supabase credentials are configured.'),
  }),
  onAuthStateChange: (_callback: (event: string, session: Session | null) => void) => ({
    data: { subscription: { unsubscribe: () => undefined } },
  }),
  signInWithPassword: async (_credentials: { email: string; password: string }) => ({
    data: { session: null, user: null },
    error: new Error('Sign in is unavailable until Supabase credentials are configured.'),
  }),
  signUp: async (_credentials: { email: string; password: string; options?: { data?: Record<string, unknown> } }) => ({
    data: { session: null, user: null },
    error: new Error('Sign up is unavailable until Supabase credentials are configured.'),
  }),
  signOut: async () => ({ error: null }),
  setSession: async (_tokens: { access_token: string; refresh_token: string }) => ({
    data: { session: null, user: null },
    error: new Error('Session recovery is unavailable until Supabase credentials are configured.'),
  }),
  resetPasswordForEmail: async (_email: string, _options?: { redirectTo?: string }) => ({
    data: {},
    error: new Error('Password reset is unavailable until Supabase credentials are configured.'),
  }),
  updateUser: async (_attributes: { password: string }) => ({
    data: { user: null },
    error: new Error('Password update is unavailable until Supabase credentials are configured.'),
  }),
};

const liveSupabase = hasSupabaseEnv
  ? createClient(env!.SUPABASE_URL, env!.SUPABASE_ANON_KEY, {
      auth: {
        storage: secureStoreAdapter,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export const supabase: SupabaseLike = hasSupabaseEnv
  ? (liveSupabase as unknown as SupabaseLike)
  : ({
      auth: unavailableAuth,
      from: () => ({
        insert: async () => ({ data: null, error: new Error('Supabase is not configured.') }),
        upsert: async () => ({ data: null, error: new Error('Supabase is not configured.') }),
      }),
    } as SupabaseLike);
