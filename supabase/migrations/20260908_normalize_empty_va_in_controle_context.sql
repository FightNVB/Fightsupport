-- TBA / lege tegenstander is geen vechter.
-- rulesEngine moet voor een ontbrekende hoek een lege VA zien en nooit de
-- stringwaarde van NULL als aanwezige vechter kunnen interpreteren.

create or replace function public.normalize_controle_bout_context_missing_va()
returns trigger
language plpgsql
as $$
begin
  new.rood_va_mm := coalesce(new.rood_va_mm, '');
  new.blauw_va_mm := coalesce(new.blauw_va_mm, '');
  return new;
end;
$$;

drop trigger if exists trg_normalize_controle_bout_context_missing_va
  on public.controle_bout_context;

create trigger trg_normalize_controle_bout_context_missing_va
before insert or update on public.controle_bout_context
for each row
execute function public.normalize_controle_bout_context_missing_va();

update public.controle_bout_context
set rood_va_mm = coalesce(rood_va_mm, ''),
    blauw_va_mm = coalesce(blauw_va_mm, '')
where rood_va_mm is null or blauw_va_mm is null;
