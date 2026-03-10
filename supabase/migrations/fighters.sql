-- fighters.sql - basis tabel voor FightPassport vechters
create table if not exists public.fighters (
  va_nummer text primary key,
  naam text,
  geboortedatum date,
  geslacht text,
  -- 0-meting (voor 2019 + overige informatie)
  zero_meeting_totaal integer default 0,
  zero_meeting_gewonnen integer default 0,
  zero_meeting_verloren integer default 0,
  zero_meeting_onbeslist integer default 0,
  zero_meeting_opmerking text,
  -- aggregaat-record per discipline (wordt later door rules-engine gevuld)
  record_kickboks_win integer default 0,
  record_kickboks_loss integer default 0,
  record_kickboks_draw integer default 0,
  record_mma_win integer default 0,
  record_mma_loss integer default 0,
  record_mma_draw integer default 0,
  record_overige_win integer default 0,
  record_overige_loss integer default 0,
  record_overige_draw integer default 0,
  -- startverboden als ruwe JSON (lijst van periodes)
  startverbod_json jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
