import { allowSyncDirectFallback, syncEndpoint } from '../../lib/env';
import { logError, logInfo } from '../../lib/logging';
import { supabase } from '../../lib/supabase';
import {
  listSyncReadyOutboxEvents,
  markOutboxAttempted,
  markOutboxFailed,
  markOutboxSynced,
  type OutboxEvent,
} from '../lesson';

type SyncResult = {
  attempted: number;
  synced: number;
  failed: number;
  source: 'endpoint' | 'direct' | 'none';
  status: 'idle' | 'synced' | 'pending' | 'endpoint_not_configured' | 'failed';
  reason?: string;
};

const PERMANENT_SYNC_PAUSE_MS = 15 * 60 * 1000;
let permanentPauseUntil = 0;
let permanentPauseReason = '';
let permanentPauseLogged = false;

function toReason(error: unknown) {
  const message =
    typeof error === 'object' && error && 'message' in error ? String((error as { message: string }).message) : '';
  return message || 'sync_error';
}

function isPermanentSchemaMismatch(error: unknown) {
  const reason = toReason(error).toLowerCase();
  return (
    reason.includes('22p02') ||
    reason.includes('invalid input syntax for type uuid') ||
    reason.includes('near "exists": syntax error')
  );
}

function setPermanentPause(reason: string) {
  permanentPauseUntil = Date.now() + PERMANENT_SYNC_PAUSE_MS;
  permanentPauseReason = reason;
}

async function pushViaEndpoint(events: OutboxEvent[], accessToken: string | null) {
  if (!syncEndpoint) {
    return { ok: false as const, syncedIds: [] as number[], reason: 'endpoint_not_configured' };
  }

  const response = await fetch(syncEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      events: events.map((event) => ({
        id: event.id,
        term_id: event.termId,
        event_type: event.eventType,
        payload: event.payload,
        created_at: event.createdAt,
      })),
    }),
  });

  if (!response.ok) {
    let bodyMessage = '';
    try {
      const json = (await response.json()) as { error?: string };
      bodyMessage = json.error ?? '';
    } catch {
      bodyMessage = '';
    }
    throw new Error(bodyMessage || `sync_endpoint_${response.status}`);
  }

  const json = (await response.json()) as { syncedIds?: number[] };
  return { ok: true as const, syncedIds: json.syncedIds ?? events.map((event) => event.id), reason: '' };
}

async function pushDirectToSupabase(events: OutboxEvent[], userId: string) {
  if (!userId) {
    throw new Error('no_active_session');
  }

  const practiceRows = events.map((event) => {
    const payload = event.payload;
    const isCorrect = Boolean(payload.correct);
    return {
      user_id: userId,
      term_id: event.termId,
      result: isCorrect ? 'correct' : 'incorrect',
      response_time_ms: typeof payload.responseTimeMs === 'number' ? payload.responseTimeMs : null,
      created_at: new Date(event.createdAt).toISOString(),
    };
  });

  const { error: insertError } = await supabase.from('practice_events').insert(practiceRows);
  if (insertError) {
    throw insertError;
  }

  const stateRows = events
    .map((event) => {
      const payload = event.payload;
      const nextState = payload.nextState as
        | {
            mastery?: number;
            stabilityDays?: number;
            dueAt?: number;
            correctCount?: number;
            incorrectCount?: number;
          }
        | undefined;

      if (!nextState) {
        return null;
      }

      return {
        user_id: userId,
        term_id: event.termId,
        mastery: nextState.mastery ?? 0,
        stability_days: nextState.stabilityDays ?? 0.5,
        due_at: nextState.dueAt ? new Date(nextState.dueAt).toISOString() : new Date().toISOString(),
        correct_count: nextState.correctCount ?? 0,
        incorrect_count: nextState.incorrectCount ?? 0,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (stateRows.length > 0) {
    const { error: upsertError } = await supabase
      .from('user_term_state')
      .upsert(stateRows, { onConflict: 'user_id,term_id', ignoreDuplicates: false });
    if (upsertError) {
      throw upsertError;
    }
  }

  return { syncedIds: events.map((event) => event.id) };
}

export async function syncOutboxBatch(limit = 25): Promise<SyncResult> {
  if (Date.now() < permanentPauseUntil) {
    return {
      attempted: 0,
      synced: 0,
      failed: 0,
      source: 'none',
      status: 'endpoint_not_configured',
      reason: permanentPauseReason || 'sync_paused',
    };
  }

  const events = await listSyncReadyOutboxEvents(limit);
  if (events.length === 0) {
    return { attempted: 0, synced: 0, failed: 0, source: 'none', status: 'idle' };
  }

  const session = await supabase.auth.getSession();
  const userId = session.data.session?.user?.id ?? null;
  if (!userId) {
    return { attempted: 0, synced: 0, failed: 0, source: 'none', status: 'pending', reason: 'no_session' };
  }

  // Safety-first: never attempt direct table writes when no sync endpoint is configured.
  // This avoids backend schema mismatch spam and keeps events safely local.
  if (!syncEndpoint) {
    return {
      attempted: events.length,
      synced: 0,
      failed: 0,
      source: 'none',
      status: 'endpoint_not_configured',
      reason: 'Set SYNC_ENDPOINT to enable remote sync.',
    };
  }

  const ids = events.map((event) => event.id);
  await markOutboxAttempted(ids);

  try {
    const endpointResult = await pushViaEndpoint(events, session.data.session?.access_token ?? null);

    if (endpointResult?.ok) {
      await markOutboxSynced(endpointResult.syncedIds);
      permanentPauseUntil = 0;
      permanentPauseReason = '';
      permanentPauseLogged = false;
      logInfo('Outbox synced via endpoint', { count: endpointResult.syncedIds.length });
      return {
        attempted: events.length,
        synced: endpointResult.syncedIds.length,
        failed: 0,
        source: 'endpoint',
        status: 'synced',
      };
    }

    if (!allowSyncDirectFallback) {
      logInfo('Outbox waiting for sync endpoint configuration', { count: events.length });
      return {
        attempted: events.length,
        synced: 0,
        failed: 0,
        source: 'none',
        status: 'endpoint_not_configured',
        reason: 'Set SYNC_ENDPOINT or enable EXPO_PUBLIC_SYNC_DIRECT_FALLBACK=true.',
      };
    }

    const directResult = await pushDirectToSupabase(events, userId);
    await markOutboxSynced(directResult.syncedIds);
    permanentPauseUntil = 0;
    permanentPauseReason = '';
    permanentPauseLogged = false;
    logInfo('Outbox synced directly', { count: directResult.syncedIds.length });
    return {
      attempted: events.length,
      synced: directResult.syncedIds.length,
      failed: 0,
      source: 'direct',
      status: 'synced',
    };
  } catch (error) {
    const reason = toReason(error);
    const permanentMismatch = isPermanentSchemaMismatch(error);

    if (!allowSyncDirectFallback) {
      if (permanentMismatch) {
        setPermanentPause(reason);
        if (!permanentPauseLogged) {
          logInfo('Outbox paused due backend/schema mismatch', { count: events.length, reason });
          permanentPauseLogged = true;
        }
      } else {
        logError(error, { area: 'sync_outbox_batch', source: syncEndpoint ? 'endpoint' : 'none', count: events.length });
      }
      await Promise.all(events.map((event) => markOutboxFailed(event.id, reason)));
      return {
        attempted: events.length,
        synced: 0,
        failed: events.length,
        source: syncEndpoint ? 'endpoint' : 'none',
        status: permanentMismatch ? 'endpoint_not_configured' : 'failed',
        reason,
      };
    }

    try {
      const directResult = await pushDirectToSupabase(events, userId);
      await markOutboxSynced(directResult.syncedIds);
      permanentPauseUntil = 0;
      permanentPauseReason = '';
      permanentPauseLogged = false;
      logInfo('Outbox synced directly', { count: directResult.syncedIds.length });
      return {
        attempted: events.length,
        synced: directResult.syncedIds.length,
        failed: 0,
        source: 'direct',
        status: 'synced',
      };
    } catch (directError) {
      const directReason = toReason(directError);
      const permanentMismatch = isPermanentSchemaMismatch(directError);
      if (permanentMismatch) {
        setPermanentPause(directReason);
        if (!permanentPauseLogged) {
          logInfo('Outbox paused due backend term_id schema mismatch', { count: events.length, reason: directReason });
          permanentPauseLogged = true;
        }
      } else {
        logError(directError, { area: 'sync_outbox_batch', source: 'direct', count: events.length });
      }
      await Promise.all(events.map((event) => markOutboxFailed(event.id, directReason)));
      return {
        attempted: events.length,
        synced: 0,
        failed: events.length,
        source: 'direct',
        status: permanentMismatch ? 'endpoint_not_configured' : 'failed',
        reason: directReason,
      };
    }
  }
}
