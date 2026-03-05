import { useCallback, useEffect, useRef, useState } from 'react';

import { allowSyncDirectFallback, syncEndpoint } from '../../lib/env';
import { logError } from '../../lib/logging';
import { useOfflineStatus } from '../../lib/network';
import { syncOutboxBatch } from './syncService';

export function useOutboxSync() {
  const isOffline = useOfflineStatus();
  const syncEnabled = Boolean(syncEndpoint || allowSyncDirectFallback);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const lastErrorRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runSync = useCallback(async () => {
    if (!syncEnabled) {
      setSyncMessage('Sync paused: configure SYNC_ENDPOINT');
      return;
    }

    if (syncBusy || isOffline) {
      return;
    }

    setSyncBusy(true);
    try {
      const result = await syncOutboxBatch(30);
      if (result.status === 'synced' || result.status === 'idle') {
        setLastSyncAt(Date.now());
        setSyncMessage('Synced');
        lastErrorRef.current = null;
      } else if (result.status === 'endpoint_not_configured') {
        const reason = (result.reason ?? '').toLowerCase();
        setSyncMessage(
          reason.includes('uuid')
            ? 'Sync paused: backend term_id must be text'
            : reason.includes('exists')
              ? 'Sync paused: local DB schema issue detected'
            : 'Sync paused: configure SYNC_ENDPOINT',
        );
      } else if (result.status === 'pending') {
        setSyncMessage('Sync pending');
      } else {
        const reason = result.reason ?? 'sync_failed';
        if (lastErrorRef.current !== reason) {
          logError(reason, { area: 'sync_hook_status', attempted: result.attempted, source: result.source });
          lastErrorRef.current = reason;
        }
        setSyncMessage(
          reason.toLowerCase().includes('uuid')
            ? 'Sync blocked: backend expects UUID term_id'
            : 'Sync pending',
        );
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (lastErrorRef.current !== reason) {
        logError(error, { area: 'sync_hook_unexpected' });
        lastErrorRef.current = reason;
      }
      setSyncMessage('Sync pending');
    } finally {
      setSyncBusy(false);
    }
  }, [isOffline, syncBusy, syncEnabled]);

  useEffect(() => {
    if (!syncEnabled) {
      setSyncMessage('Sync paused: configure SYNC_ENDPOINT');
      return;
    }

    void runSync();

    timerRef.current = setInterval(() => {
      void runSync();
    }, 45000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [runSync, syncEnabled]);

  return { syncBusy, syncMessage, lastSyncAt, runSync };
}
