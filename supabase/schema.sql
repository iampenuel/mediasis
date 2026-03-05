-- Mediasis backend schema + sync RPC
-- Run in Supabase SQL Editor

create extension if not exists "pgcrypto";

-- User profile + username login bridge
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  if v_username = '' then
    v_username := split_part(lower(new.email), '@', 1);
  end if;

  insert into public.user_profiles (user_id, username, email, created_at, updated_at)
  values (new.id, v_username, lower(new.email), now(), now())
  on conflict (user_id) do update
  set username = excluded.username,
      email = excluded.email,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_auth_user_created();

insert into public.user_profiles (user_id, username, email, created_at, updated_at)
select
  u.id,
  case
    when coalesce(trim(u.raw_user_meta_data ->> 'username'), '') <> '' then lower(trim(u.raw_user_meta_data ->> 'username'))
    else split_part(lower(u.email), '@', 1)
  end as username,
  lower(u.email) as email,
  coalesce(u.created_at, now()) as created_at,
  now() as updated_at
from auth.users u
on conflict (user_id) do update
set username = excluded.username,
    email = excluded.email,
    updated_at = now();

alter table public.user_profiles enable row level security;

drop policy if exists "profiles_select_own" on public.user_profiles;
create policy "profiles_select_own"
on public.user_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.user_profiles;
create policy "profiles_update_own"
on public.user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.user_profiles;
create policy "profiles_insert_own"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.resolve_login_email(login_identifier text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_identifier text := lower(trim(coalesce(login_identifier, '')));
  v_email text;
begin
  if v_identifier = '' then
    return null;
  end if;

  if position('@' in v_identifier) > 0 then
    return v_identifier;
  end if;

  select p.email
  into v_email
  from public.user_profiles p
  where p.username = v_identifier
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;

-- Terms catalog (IDs align with local IDs like D001249)
create table if not exists public.terms (
  id text primary key,
  term text not null,
  definition text not null,
  pronunciation text null,
  example_sentence text not null,
  category text not null,
  difficulty int not null default 1 check (difficulty between 1 and 5),
  tags jsonb null,
  updated_at timestamptz default now()
);

create table if not exists public.user_term_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  term_id text not null references public.terms(id) on delete cascade,
  mastery real not null default 0,
  stability_days real not null default 0.5,
  due_at timestamptz not null default now(),
  last_seen_at timestamptz null,
  incorrect_count int not null default 0,
  correct_count int not null default 0,
  primary key (user_id, term_id)
);

create table if not exists public.practice_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  term_id text not null references public.terms(id) on delete cascade,
  result text not null check (result in ('correct','incorrect')),
  response_time_ms int null,
  created_at timestamptz default now()
);

create index if not exists idx_user_term_state_user_due on public.user_term_state (user_id, due_at);
create index if not exists idx_practice_events_user_created on public.practice_events (user_id, created_at desc);
create index if not exists idx_practice_events_user_term on public.practice_events (user_id, term_id);

alter table public.terms enable row level security;
alter table public.user_term_state enable row level security;
alter table public.practice_events enable row level security;

drop policy if exists "terms_read_authenticated" on public.terms;
create policy "terms_read_authenticated"
on public.terms
for select
to authenticated
using (true);

drop policy if exists "uts_select_own" on public.user_term_state;
create policy "uts_select_own"
on public.user_term_state
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "uts_insert_own" on public.user_term_state;
create policy "uts_insert_own"
on public.user_term_state
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "uts_update_own" on public.user_term_state;
create policy "uts_update_own"
on public.user_term_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "uts_delete_own" on public.user_term_state;
create policy "uts_delete_own"
on public.user_term_state
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "pe_select_own" on public.practice_events;
create policy "pe_select_own"
on public.practice_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "pe_insert_own" on public.practice_events;
create policy "pe_insert_own"
on public.practice_events
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "pe_update_own" on public.practice_events;
create policy "pe_update_own"
on public.practice_events
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "pe_delete_own" on public.practice_events;
create policy "pe_delete_own"
on public.practice_events
for delete
to authenticated
using (auth.uid() = user_id);

-- Optional endpoint-style batch sync RPC.
-- Input JSON:
-- {
--   "events":[
--     {"id":1,"term_id":"D001249","payload":{"correct":true,"nextState":{"mastery":0.5,"stabilityDays":1.2,"dueAt":1737600000000,"correctCount":3,"incorrectCount":1}}}
--   ]
-- }
create or replace function public.sync_practice_events(events jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  synced_ids bigint[];
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.practice_events (user_id, term_id, result, response_time_ms, created_at)
  select
    v_user,
    item.term_id,
    case when coalesce((item.payload ->> 'correct')::boolean, false) then 'correct' else 'incorrect' end,
    nullif(item.payload ->> 'responseTimeMs', '')::int,
    to_timestamp(coalesce((item.created_at)::bigint, extract(epoch from now())::bigint))
  from jsonb_to_recordset(events -> 'events') as item(
    id bigint,
    term_id text,
    event_type text,
    payload jsonb,
    created_at bigint
  )
  where exists (select 1 from public.terms t where t.id = item.term_id);

  insert into public.user_term_state (
    user_id,
    term_id,
    mastery,
    stability_days,
    due_at,
    correct_count,
    incorrect_count
  )
  select
    v_user,
    item.term_id,
    coalesce((item.payload #>> '{nextState,mastery}')::real, 0),
    coalesce((item.payload #>> '{nextState,stabilityDays}')::real, 0.5),
    case
      when (item.payload #>> '{nextState,dueAt}') is null then now()
      else to_timestamp(((item.payload #>> '{nextState,dueAt}')::bigint) / 1000.0)
    end,
    coalesce((item.payload #>> '{nextState,correctCount}')::int, 0),
    coalesce((item.payload #>> '{nextState,incorrectCount}')::int, 0)
  from jsonb_to_recordset(events -> 'events') as item(
    id bigint,
    term_id text,
    event_type text,
    payload jsonb,
    created_at bigint
  )
  where (item.payload -> 'nextState') is not null
  and exists (select 1 from public.terms t where t.id = item.term_id)
  on conflict (user_id, term_id) do update set
    mastery = excluded.mastery,
    stability_days = excluded.stability_days,
    due_at = excluded.due_at,
    correct_count = excluded.correct_count,
    incorrect_count = excluded.incorrect_count,
    last_seen_at = now();

  select array_agg(item.id)
  into synced_ids
  from jsonb_to_recordset(events -> 'events') as item(
    id bigint,
    term_id text,
    event_type text,
    payload jsonb,
    created_at bigint
  )
  where exists (select 1 from public.terms t where t.id = item.term_id);

  return jsonb_build_object('syncedIds', coalesce(synced_ids, array[]::bigint[]));
end;
$$;

grant execute on function public.sync_practice_events(jsonb) to authenticated;
