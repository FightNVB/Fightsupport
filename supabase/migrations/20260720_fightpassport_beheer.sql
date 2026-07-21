-- FightSupport centrale FightPaspoort database + synchronisatielogging
-- Veilig opnieuw uitvoerbaar. RLS staat aan; server-side service role blijft toegang houden.

create extension if not exists pgcrypto;

create table if not exists public.fightpassport_fighters (
  va_nummer text primary key,
  naam text,
  email text,
  geboortedatum date,
  geslacht text,
  fit_to_fight boolean,
  licentie_actief boolean,
  heeft_startverbod boolean default false,
  totaal_wedstrijden integer,
  gewonnen integer,
  kos integer,
  nulmeting_gewicht numeric,
  nulmeting_discipline text,
  nulmeting_klasse text,
  nulmeting_totaal integer,
  nulmeting_gewonnen integer,
  nulmeting_verloren integer,
  nulmeting_onbeslist integer,
  nulmeting_kos integer,
  nulmeting_opmerking text,
  berekende_klasse text,
  mma_level text,
  primary_discipline text,
  raw_summary jsonb default '{}'::jsonb,
  raw_details jsonb default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz,
  last_scraped_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Bestaande installaties aanvullen zonder data te verwijderen.
alter table public.fightpassport_fighters add column if not exists naam text;
alter table public.fightpassport_fighters add column if not exists geboortedatum date;
alter table public.fightpassport_fighters add column if not exists geslacht text;
alter table public.fightpassport_fighters add column if not exists email text;
alter table public.fightpassport_fighters add column if not exists fit_to_fight boolean;
alter table public.fightpassport_fighters add column if not exists licentie_actief boolean;
alter table public.fightpassport_fighters add column if not exists heeft_startverbod boolean default false;
alter table public.fightpassport_fighters add column if not exists totaal_wedstrijden integer;
alter table public.fightpassport_fighters add column if not exists gewonnen integer;
alter table public.fightpassport_fighters add column if not exists kos integer;
alter table public.fightpassport_fighters add column if not exists nulmeting_gewicht numeric;
alter table public.fightpassport_fighters add column if not exists nulmeting_discipline text;
alter table public.fightpassport_fighters add column if not exists nulmeting_klasse text;
alter table public.fightpassport_fighters add column if not exists nulmeting_totaal integer;
alter table public.fightpassport_fighters add column if not exists nulmeting_gewonnen integer;
alter table public.fightpassport_fighters add column if not exists nulmeting_verloren integer;
alter table public.fightpassport_fighters add column if not exists nulmeting_onbeslist integer;
alter table public.fightpassport_fighters add column if not exists nulmeting_kos integer;
alter table public.fightpassport_fighters add column if not exists nulmeting_opmerking text;
alter table public.fightpassport_fighters add column if not exists berekende_klasse text;
alter table public.fightpassport_fighters add column if not exists mma_level text;
alter table public.fightpassport_fighters add column if not exists primary_discipline text;
alter table public.fightpassport_fighters add column if not exists raw_summary jsonb default '{}'::jsonb;
alter table public.fightpassport_fighters add column if not exists raw_details jsonb default '{}'::jsonb;
alter table public.fightpassport_fighters add column if not exists first_seen_at timestamptz not null default now();
alter table public.fightpassport_fighters add column if not exists last_seen_at timestamptz;
alter table public.fightpassport_fighters add column if not exists last_scraped_at timestamptz;
alter table public.fightpassport_fighters add column if not exists updated_at timestamptz not null default now();

create table if not exists public.fightpassport_results (
  id uuid primary key default gen_random_uuid(),
  va_nummer text not null references public.fightpassport_fighters(va_nummer) on delete cascade,
  datum date,
  evenement text,
  tegenstander text,
  sportschool text,
  discipline text,
  klasse text,
  gewicht text,
  uitslag text,
  raw_json jsonb default '{}'::jsonb,
  last_seen_at timestamptz not null default now()
);
create index if not exists idx_fp_results_va on public.fightpassport_results(va_nummer);
create index if not exists idx_fp_results_datum on public.fightpassport_results(datum desc);

create table if not exists public.fightpassport_fighter_gyms (
  id uuid primary key default gen_random_uuid(),
  va_nummer text not null references public.fightpassport_fighters(va_nummer) on delete cascade,
  organisatie_naam text not null,
  plaats text,
  land text,
  organisatie_type text,
  raw_json jsonb default '{}'::jsonb,
  last_seen_at timestamptz not null default now()
);
create index if not exists idx_fp_gyms_va on public.fightpassport_fighter_gyms(va_nummer);

create table if not exists public.fightpassport_startbans (
  id uuid primary key default gen_random_uuid(),
  va_nummer text not null references public.fightpassport_fighters(va_nummer) on delete cascade,
  soort text,
  ingang date,
  einde date,
  opgelegd_door text,
  reden text,
  evenement text,
  evenement_datum date,
  actief boolean,
  raw_json jsonb default '{}'::jsonb,
  last_seen_at timestamptz not null default now()
);
create index if not exists idx_fp_startbans_va on public.fightpassport_startbans(va_nummer);
create index if not exists idx_fp_startbans_actief on public.fightpassport_startbans(actief);

create table if not exists public.fightpassport_licenses (
  id uuid primary key default gen_random_uuid(),
  va_nummer text not null references public.fightpassport_fighters(va_nummer) on delete cascade,
  soort text,
  status text,
  geldig_van date,
  geldig_tot date,
  bond text,
  raw_json jsonb default '{}'::jsonb,
  last_seen_at timestamptz not null default now()
);
create index if not exists idx_fp_licenses_va on public.fightpassport_licenses(va_nummer);

create table if not exists public.fightpassport_sync_runs (
  id uuid primary key default gen_random_uuid(),
  start_va integer not null,
  end_va integer not null,
  last_processed_va integer,
  processed_count integer not null default 0,
  found_count integer not null default 0,
  licensed_count integer not null default 0,
  error_count integer not null default 0,
  status text not null default 'running',
  run_type text not null default 'full',
  error_message text,
  meta jsonb default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.fightpassport_sync_items (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid not null references public.fightpassport_sync_runs(id) on delete cascade,
  va_nummer text not null,
  status text not null default 'pending'
    check (status in ('pending','processing','success','not_found','skipped','error')),
  naam text,
  profiel_gevonden boolean not null default false,
  licentie_actief boolean,
  heeft_startverbod boolean,
  results_count integer not null default 0,
  gyms_count integer not null default 0,
  startbans_count integer not null default 0,
  licenses_count integer not null default 0,
  error_step text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique(sync_run_id, va_nummer)
);
create index if not exists idx_fp_sync_items_run on public.fightpassport_sync_items(sync_run_id);
create index if not exists idx_fp_sync_items_va on public.fightpassport_sync_items(va_nummer);
create index if not exists idx_fp_sync_items_status on public.fightpassport_sync_items(status);

alter table public.fightpassport_fighters enable row level security;
alter table public.fightpassport_results enable row level security;
alter table public.fightpassport_fighter_gyms enable row level security;
alter table public.fightpassport_startbans enable row level security;
alter table public.fightpassport_licenses enable row level security;
alter table public.fightpassport_sync_runs enable row level security;
alter table public.fightpassport_sync_items enable row level security;

-- Geen publieke policies: lezen/schrijven verloopt via beveiligde serverroutes en de service role.
