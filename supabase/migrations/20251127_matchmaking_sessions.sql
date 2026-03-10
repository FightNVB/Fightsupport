-- ===========================================
-- TABEL: matchmaking_sessions
-- ===========================================
create table if not exists public.matchmaking_sessions (
  id uuid primary key default gen_random_uuid(),

  -- aan welk event hangt deze matchmaking?
  event_id uuid not null references public.events(id) on delete cascade,

  -- laatste (actieve) upload behorend bij deze sessie
  last_upload_id uuid references public.matchmaking_uploads(id) on delete set null,

  -- status van de sessie
  status text not null default 'active'
    check (status in ('active', 'archived')),

  -- wie heeft deze sessie oorspronkelijk aangemaakt (meestal matchmaker of admin)
  created_by uuid references auth.users(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Zorg dat maar 1 ACTIVE sessie per event bestaat
create unique index if not exists matchmaking_sessions_one_active_per_event
  on public.matchmaking_sessions (event_id)
  where status = 'active';

-- Trigger om updated_at bij te werken
create or replace function public.set_timestamp_matchmaking_sessions()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_timestamp_matchmaking_sessions on public.matchmaking_sessions;

create trigger trg_set_timestamp_matchmaking_sessions
before update on public.matchmaking_sessions
for each row
execute function public.set_timestamp_matchmaking_sessions();

-- ===========================================
-- RLS AAN
-- ===========================================
alter table public.matchmaking_sessions enable row level security;

-- 1) Authenticated users mogen lezen
create policy "matchmaking_sessions_select_authenticated"
on public.matchmaking_sessions
for select
to authenticated
using (true);

-- 2) Authenticated users mogen aanmaken
-- (we sturen logica via de app: alleen admins/matchmakers gebruiken dit)
create policy "matchmaking_sessions_insert_authenticated"
on public.matchmaking_sessions
for insert
to authenticated
with check (true);

-- 3) Alleen maker mag updaten (en admins via app)
create policy "matchmaking_sessions_update_creator"
on public.matchmaking_sessions
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- 4) Alleen maker mag verwijderen (we gaan dit via UI waarschijnlijk niet gebruiken)
create policy "matchmaking_sessions_delete_creator"
on public.matchmaking_sessions
for delete
to authenticated
using (created_by = auth.uid());
