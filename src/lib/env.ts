import { z } from 'zod';
import Constants from 'expo-constants';

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
});

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

const rawEnv = {
  SUPABASE_URL:
    process.env.SUPABASE_URL ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    (typeof extra.SUPABASE_URL === 'string' ? extra.SUPABASE_URL : ''),
  SUPABASE_ANON_KEY:
    process.env.SUPABASE_ANON_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    (typeof extra.SUPABASE_ANON_KEY === 'string' ? extra.SUPABASE_ANON_KEY : ''),
  SYNC_ENDPOINT:
    process.env.SYNC_ENDPOINT ??
    process.env.EXPO_PUBLIC_SYNC_ENDPOINT ??
    (typeof extra.SYNC_ENDPOINT === 'string' ? extra.SYNC_ENDPOINT : ''),
  EXPO_PUBLIC_SYNC_DIRECT_FALLBACK:
    process.env.EXPO_PUBLIC_SYNC_DIRECT_FALLBACK ??
    process.env.SYNC_DIRECT_FALLBACK ??
    (typeof extra.EXPO_PUBLIC_SYNC_DIRECT_FALLBACK === 'string' ? extra.EXPO_PUBLIC_SYNC_DIRECT_FALLBACK : ''),
};

const parsedEnv = envSchema.safeParse(rawEnv);
const hasValidShape = parsedEnv.success;
const looksLikePlaceholder = hasValidShape
  ? parsedEnv.data.SUPABASE_URL.includes('your-project-ref') || parsedEnv.data.SUPABASE_ANON_KEY.includes('your-anon-key')
  : false;

export const env = hasValidShape && !looksLikePlaceholder ? parsedEnv.data : null;
export const hasSupabaseEnv = Boolean(env);
export const syncEndpoint = rawEnv.SYNC_ENDPOINT || '';
export const allowSyncDirectFallback =
  typeof rawEnv.EXPO_PUBLIC_SYNC_DIRECT_FALLBACK === 'string' &&
  ['1', 'true', 'yes', 'on'].includes(rawEnv.EXPO_PUBLIC_SYNC_DIRECT_FALLBACK.trim().toLowerCase());
