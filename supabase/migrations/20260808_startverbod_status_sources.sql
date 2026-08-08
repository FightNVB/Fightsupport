alter table public.fightpassport_fighters
  add column if not exists heeft_startverbod_total boolean,
  add column if not exists startverbod_total_at timestamptz,
  add column if not exists heeft_startverbod_actuele_sync boolean,
  add column if not exists startverbod_actuele_sync_at timestamptz,
  add column if not exists startverbod_status_source text;

alter table public.fightpassport_fighters
  drop constraint if exists fightpassport_fighters_startverbod_status_source_check;

alter table public.fightpassport_fighters
  add constraint fightpassport_fighters_startverbod_status_source_check check (
    startverbod_status_source is null or startverbod_status_source in (
      'actuele_excel_sync', 'total_profielsamenvatting'
    )
  );

update public.fightpassport_fighters
set heeft_startverbod_total = heeft_startverbod,
    startverbod_status_source = coalesce(startverbod_status_source, 'total_profielsamenvatting')
where heeft_startverbod_total is null;

comment on column public.fightpassport_fighters.heeft_startverbod_total is
  'Status uit de bestaande Total-profielsamenvatting; blijft onafhankelijk bewaard.';
comment on column public.fightpassport_fighters.heeft_startverbod_actuele_sync is
  'Status uit de actuele officiële Startverbod/Schorsing Excel-sync.';
comment on column public.fightpassport_fighters.startverbod_status_source is
  'Bron die de effectieve operationele heeft_startverbod-waarde het laatst bepaalde.';
