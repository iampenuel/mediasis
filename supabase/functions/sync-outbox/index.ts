// Supabase Edge Function: sync-outbox
// POST body: { events: [{ id, term_id, event_type, payload, created_at }] }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type SyncEvent = {
  id: number;
  term_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: number;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = (await req.json()) as { events?: SyncEvent[] };
  const events = Array.isArray(body.events) ? body.events : [];
  if (events.length === 0) {
    return new Response(JSON.stringify({ syncedIds: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await supabase.rpc('sync_practice_events', {
    events: { events },
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const syncedIds = (data as { syncedIds?: number[] } | null)?.syncedIds ?? [];
  return new Response(JSON.stringify({ syncedIds }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
