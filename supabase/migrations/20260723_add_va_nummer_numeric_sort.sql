-- Numerieke sorteerkolom voor FightPassport VA-nummers.
-- Hierdoor sorteert 775 vóór 6600 en blijft server-side paginering correct.

alter table public.fightpassport_fighters
  add column if not exists va_nummer_sort bigint
  generated always as (
    case
      when trim(coalesce(va_nummer, '')) ~ '^[0-9]+$'
        then trim(va_nummer)::bigint
      else null
    end
  ) stored;

create index if not exists fightpassport_fighters_va_nummer_sort_idx
  on public.fightpassport_fighters (va_nummer_sort);
