-- Gescheiden deel-links voor matchmaking:
-- public_token = live promotorlink (bestaande links blijven geldig)
-- trainer_token = alleen de laatst bewust gepubliceerde momentopname
alter table public.matchmaking_public_pages
  add column if not exists trainer_token text,
  add column if not exists trainer_snapshot jsonb,
  add column if not exists trainer_published_at timestamptz,
  add column if not exists trainer_published_by uuid;

create unique index if not exists matchmaking_public_pages_trainer_token_key
  on public.matchmaking_public_pages (trainer_token)
  where trainer_token is not null;

update public.matchmaking_public_pages
set trainer_token = encode(gen_random_bytes(32), 'hex')
where trainer_token is null;

alter table public.matchmaking_public_pages
  alter column trainer_token set default encode(gen_random_bytes(32), 'hex');
