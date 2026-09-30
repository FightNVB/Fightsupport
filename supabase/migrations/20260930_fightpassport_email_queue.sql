create table if not exists public.fightpassport_email_queue (
  id uuid primary key default gen_random_uuid(),
  va_nummer text not null,
  status text not null default 'pending' check (status in ('pending','processing','done','error')),
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  finished_at timestamptz,
  error_message text
);

create index if not exists fightpassport_email_queue_status_created_idx
  on public.fightpassport_email_queue (status, created_at);

create unique index if not exists fightpassport_email_queue_one_active_per_va
  on public.fightpassport_email_queue (va_nummer)
  where status in ('pending','processing');

alter table public.fightpassport_email_queue enable row level security;

revoke all on table public.fightpassport_email_queue from anon, authenticated;
grant all on table public.fightpassport_email_queue to service_role;
