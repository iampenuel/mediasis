# Supabase Schema Setup

Run `schema.sql` in:
- Supabase Dashboard -> SQL Editor

Checklist:
- Tables were created successfully.
- Row Level Security (RLS) is enabled on all expected tables.
- Policies are present and attached to the correct tables.

Policy intent notes:
- `terms` table: authenticated read-only.
- User-owned tables: per-user CRUD using `auth.uid() = user_id`.

## Outbox Sync Endpoint (Edge Function)

Deploy:

```bash
supabase functions deploy sync-outbox
```

Set client env:

```bash
SYNC_ENDPOINT=https://<project-ref>.functions.supabase.co/sync-outbox
```

The app uses this endpoint first for batch sync. Direct Supabase write fallback only runs when `EXPO_PUBLIC_SYNC_DIRECT_FALLBACK=true`.

## UUID mismatch recovery (`22P02`)

If you see errors like:

- `invalid input syntax for type uuid: "D016"`
- `invalid input syntax for type uuid: "D029"`

your backend `term_id` column is likely `uuid` instead of `text`.

### Recommended fix path

1. Apply [`schema.sql`](schema.sql) in Supabase SQL Editor.
2. Deploy the `sync-outbox` Edge function.
3. Set `SYNC_ENDPOINT` (or `EXPO_PUBLIC_SYNC_ENDPOINT`) in app `.env`.
4. Keep client `EXPO_PUBLIC_SYNC_DIRECT_FALLBACK=false` (default) so direct writes stay disabled unless explicitly needed.

### Non-destructive migration (existing project with wrong type)

Run this only if your current `term_id` is `uuid` and you need to preserve existing rows:

```sql
alter table public.practice_events add column if not exists term_id_text text;
update public.practice_events set term_id_text = term_id::text where term_id_text is null;

alter table public.user_term_state add column if not exists term_id_text text;
update public.user_term_state set term_id_text = term_id::text where term_id_text is null;

alter table public.practice_events drop constraint if exists practice_events_term_id_fkey;
alter table public.user_term_state drop constraint if exists user_term_state_term_id_fkey;

alter table public.practice_events drop column if exists term_id;
alter table public.user_term_state drop column if exists term_id;

alter table public.practice_events rename column term_id_text to term_id;
alter table public.user_term_state rename column term_id_text to term_id;

alter table public.practice_events alter column term_id type text using term_id::text;
alter table public.user_term_state alter column term_id type text using term_id::text;

alter table public.practice_events add constraint practice_events_term_id_fkey
  foreign key (term_id) references public.terms(id) on delete cascade;
alter table public.user_term_state add constraint user_term_state_term_id_fkey
  foreign key (term_id) references public.terms(id) on delete cascade;
```

Recreate indexes if needed:

```sql
create index if not exists idx_practice_events_user_term on public.practice_events (user_id, term_id);
create index if not exists idx_user_term_state_user_due on public.user_term_state (user_id, due_at);
```
