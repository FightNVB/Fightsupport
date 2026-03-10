-- 20260107_controle_resultaten_review.sql

alter table public.controle_resultaten
  add column if not exists review_status text null, -- 'goedgekeurd' | 'hard_afgekeurd'
  add column if not exists review_note text null,
  add column if not exists reviewed_by uuid null,
  add column if not exists reviewed_at timestamptz null,
  add column if not exists original_resultaat text null; -- bewaart oorspronkelijke resultaat (actie/dispensatie/afgekeurd/ok)

-- optioneel: index voor snelle queries
create index if not exists controle_resultaten_reviewed_at_idx
  on public.controle_resultaten (reviewed_at);

-- Je hoeft hier géén enum te maken; text is prima en flexibel.
