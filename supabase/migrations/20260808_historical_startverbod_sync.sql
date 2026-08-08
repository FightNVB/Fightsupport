create table if not exists public.fighter_startverbod_history (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  va_nummer text not null,
  naam_fp text,
  soort text not null check (soort in ('Startverbod', 'Schorsing')),
  ingang date not null,
  einde date,
  door text,
  reden text,
  evenement text,
  eventdatum date,
  opmerkingen text,
  aangemaakt_op date,
  aangemaakt_door text,
  gewijzigd_op date,
  gewijzigd_door text,
  source text not null default 'fightpassport',
  scraped_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fighter_startverbod_history_va_idx
  on public.fighter_startverbod_history (va_nummer, ingang desc);

create table if not exists public.fighter_startverbod_history_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'idle' check (status in ('idle','running','paused','completed','completed_with_errors','failed')),
  start_va integer not null,
  end_va integer not null,
  workers integer not null default 4,
  processed_count integer not null default 0,
  found_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  error_count integer not null default 0,
  last_processed_va integer,
  last_error text,
  pid integer,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fighter_startverbod_history_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.fighter_startverbod_history_runs(id) on delete cascade,
  va_nummer integer not null,
  naam_fp text,
  status text not null,
  found_count integer not null default 0,
  error_type text,
  error_step text,
  error_message text,
  retry_status text,
  started_at timestamptz,
  finished_at timestamptz,
  unique(run_id, va_nummer)
);
