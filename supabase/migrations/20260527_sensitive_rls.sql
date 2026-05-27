-- Pre-live security hardening for sensitive FightSupport tables.
-- Service-role API routes, scrapers and control-engine jobs keep bypassing RLS.
-- Browser/client access is restricted by role, bondteam, matchmaker ownership and sportschool ownership.

create or replace function public.fs_current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(up.role, r.name, ''))
  from auth.users u
  left join public.user_profiles up on up.id = u.id
  left join public.user_roles ur on ur.user_id = u.id
  left join public.roles r on r.id = ur.role_id
  where u.id = auth.uid()
  order by case lower(coalesce(up.role, r.name, ''))
    when 'superadmin' then 1
    when 'admin' then 2
    when 'hoofdofficial' then 3
    when 'official' then 4
    when 'matchmaker' then 5
    when 'trainer' then 6
    else 99
  end
  limit 1
$$;

create or replace function public.fs_current_bondteam()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(both from coalesce(up.bondteam, '')), '')
  from public.user_profiles up
  where up.id = auth.uid()
  limit 1
$$;

create or replace function public.fs_current_sportschool_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(both from coalesce(up.active_sportschool_id::text, up.meekijk_sportschool_id::text, sc.sportschool_id::text, '')), '')
  from public.user_profiles up
  left join public.sportschool_contactpersonen sc
    on sc.user_id = up.id
   and coalesce(sc.actief, true) = true
  where up.id = auth.uid()
  limit 1
$$;

create or replace function public.fs_is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.fs_current_profile_role() = 'superadmin'
$$;

create or replace function public.fs_is_admin_for_bondteam(row_bondteam text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.fs_is_superadmin()
    or (
      public.fs_current_profile_role() in ('admin', 'hoofdofficial', 'official')
      and nullif(trim(coalesce(row_bondteam, '')), '') is not null
      and lower(trim(row_bondteam)) = lower(trim(public.fs_current_bondteam()))
    )
$$;

create or replace function public.fs_can_access_matchmaking(p_matchmaking_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with meta as (
    select
      coalesce(m.id::text, u.matchmaking_id::text, p_matchmaking_id) as matchmaking_id,
      m.matchmaker_id::text as matchmaker_id,
      m.huidige_eigenaar_user_id::text as huidige_eigenaar_user_id,
      coalesce(m.huidige_eigenaar_bondteam, m.bondteam, u.bondteam) as bondteam,
      u.uploaded_by::text as uploaded_by
    from (select p_matchmaking_id::text as matchmaking_id) input
    left join public.matchmakings m on m.id::text = input.matchmaking_id
    left join lateral (
      select matchmaking_id, uploaded_by, bondteam
      from public.matchmaking_uploads
      where matchmaking_id::text = input.matchmaking_id
      order by uploaded_at desc nulls last
      limit 1
    ) u on true
  )
  select coalesce(bool_or(
    public.fs_is_superadmin()
    or (
      public.fs_current_profile_role() = 'admin'
      and lower(trim(coalesce(meta.bondteam, ''))) = lower(trim(public.fs_current_bondteam()))
    )
    or (
      public.fs_current_profile_role() in ('official', 'hoofdofficial')
      and lower(trim(coalesce(meta.bondteam, ''))) = lower(trim(public.fs_current_bondteam()))
    )
    or (
      public.fs_current_profile_role() = 'matchmaker'
      and auth.uid()::text in (
        coalesce(meta.matchmaker_id, ''),
        coalesce(meta.huidige_eigenaar_user_id, ''),
        coalesce(meta.uploaded_by, '')
      )
    )
  ), false)
  from meta
$$;

do $$
declare
  table_name text;
  sensitive_tables text[] := array[
    'matchmakings',
    'matchmaking_uploads',
    'matchmaking_bouts_raw',
    'controle_bout_context',
    'controle_resultaten',
    'controle_uitslagen',
    'controle_runs',
    'weigh_in_bouts',
    'definitive_matchmaking_bouts',
    'uitslagen_raw',
    'matchmaker_uitslagen_raw',
    'sportschool_fighters',
    'sportschool_fighter_uitslagen_raw',
    'discipline_cases',
    'overtredingen',
    'dossiers',
    'sancties',
    'vervolgstappen',
    'jeugd_talentstatus_vechters',
    'fightpassport_sessions'
  ];
begin
  foreach table_name in array sensitive_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
    end if;
  end loop;
end $$;

-- Matchmaking parent rows: own matchmaker, own bondteam admin/official, or superadmin.
do $$
begin
  if to_regclass('public.matchmakings') is not null then
    drop policy if exists fs_matchmakings_select_scoped on public.matchmakings;
    create policy fs_matchmakings_select_scoped
      on public.matchmakings
      for select
      to authenticated
      using (public.fs_can_access_matchmaking(id::text));
  end if;
end $$;

-- Upload rows: same access scope as the matchmaking they belong to.
do $$
begin
  if to_regclass('public.matchmaking_uploads') is not null then
    drop policy if exists fs_matchmaking_uploads_select_scoped on public.matchmaking_uploads;
    create policy fs_matchmaking_uploads_select_scoped
      on public.matchmaking_uploads
      for select
      to authenticated
      using (public.fs_can_access_matchmaking(matchmaking_id::text));
  end if;
end $$;

-- Child tables with matchmaking_id: read only inside the same scoped matchmaking.
do $$
declare
  t text;
  child_tables text[] := array[
    'matchmaking_bouts_raw',
    'controle_bout_context',
    'controle_resultaten',
    'controle_uitslagen',
    'controle_runs',
    'weigh_in_bouts',
    'definitive_matchmaking_bouts',
    'uitslagen_raw',
    'matchmaker_uitslagen_raw',
    'sportschool_fighter_uitslagen_raw',
    'jeugd_talentstatus_vechters'
  ];
begin
  foreach t in array child_tables loop
    if to_regclass(format('public.%I', t)) is not null
       and exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = t and column_name = 'matchmaking_id'
       ) then
      execute format('drop policy if exists fs_%I_select_matchmaking_scoped on public.%I', t, t);
      execute format(
        'create policy fs_%I_select_matchmaking_scoped on public.%I for select to authenticated using (public.fs_can_access_matchmaking(matchmaking_id::text))',
        t, t
      );
    end if;
  end loop;
end $$;

-- Discipline/dossier tables: only own bondteam admins/officials, or superadmin.
do $$
declare
  t text;
  dossier_tables text[] := array['discipline_cases', 'overtredingen', 'dossiers', 'sancties', 'vervolgstappen'];
begin
  foreach t in array dossier_tables loop
    if to_regclass(format('public.%I', t)) is not null
       and exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = t and column_name = 'bondteam'
       ) then
      execute format('drop policy if exists fs_%I_select_bondteam_scoped on public.%I', t, t);
      execute format(
        'create policy fs_%I_select_bondteam_scoped on public.%I for select to authenticated using (public.fs_is_admin_for_bondteam(bondteam))',
        t, t
      );
    end if;
  end loop;
end $$;

-- Trainer/team data: trainer only own active sportschool; admins only own bondteam when that column exists; superadmin all.
do $$
declare
  has_bondteam boolean;
begin
  if to_regclass('public.sportschool_fighters') is not null then
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'sportschool_fighters' and column_name = 'bondteam'
    ) into has_bondteam;

    drop policy if exists fs_sportschool_fighters_select_scoped on public.sportschool_fighters;

    if has_bondteam then
      create policy fs_sportschool_fighters_select_scoped
        on public.sportschool_fighters
        for select
        to authenticated
        using (
          public.fs_is_superadmin()
          or (
            public.fs_current_profile_role() = 'trainer'
            and sportschool_id::text = public.fs_current_sportschool_id()
          )
          or (
            public.fs_current_profile_role() = 'admin'
            and lower(trim(coalesce(bondteam, ''))) = lower(trim(public.fs_current_bondteam()))
          )
        );
    else
      create policy fs_sportschool_fighters_select_scoped
        on public.sportschool_fighters
        for select
        to authenticated
        using (
          public.fs_is_superadmin()
          or (
            public.fs_current_profile_role() = 'trainer'
            and sportschool_id::text = public.fs_current_sportschool_id()
          )
        );
    end if;
  end if;
end $$;

-- FightPassport sessions: never cross-matchmaker. API/scraper service role still bypasses RLS.
do $$
begin
  if to_regclass('public.fightpassport_sessions') is not null then
    drop policy if exists fightpassport_sessions_select_own on public.fightpassport_sessions;
    drop policy if exists fightpassport_sessions_insert_own on public.fightpassport_sessions;
    drop policy if exists fightpassport_sessions_update_own on public.fightpassport_sessions;

    create policy fightpassport_sessions_select_own
      on public.fightpassport_sessions
      for select
      to authenticated
      using (matchmaker_id = auth.uid());

    create policy fightpassport_sessions_insert_own
      on public.fightpassport_sessions
      for insert
      to authenticated
      with check (matchmaker_id = auth.uid());

    create policy fightpassport_sessions_update_own
      on public.fightpassport_sessions
      for update
      to authenticated
      using (matchmaker_id = auth.uid())
      with check (matchmaker_id = auth.uid());
  end if;
end $$;

