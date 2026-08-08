alter table public.startverbod
  add column if not exists reden text,
  add column if not exists opmerkingen text,
  add column if not exists aangemaakt_op date,
  add column if not exists aangemaakt_door text,
  add column if not exists gewijzigd_op date,
  add column if not exists gewijzigd_door text,
  add column if not exists naam_fp text,
  add column if not exists verified_in_fightpassport boolean not null default false,
  add column if not exists verified_at timestamptz,
  add column if not exists verification_method text;

alter table public.startverbod
  drop constraint if exists startverbod_koppel_methode_check;

alter table public.startverbod
  add constraint startverbod_koppel_methode_check check (
    koppel_methode is null or koppel_methode in (
      'exact', 'compact', 'exact_startverbod', 'compact_startverbod',
      'literal', 'normalized', 'manual', 'fightpassport_startverbod'
    )
  );

comment on column public.startverbod.naam_fp is
  'Letterlijke koptekst2-naam uit het geverifieerde Fightpaspoortprofiel.';
comment on column public.startverbod.verification_method is
  'Methode waarmee VA en startverbod in Fightpaspoort zijn bevestigd.';
