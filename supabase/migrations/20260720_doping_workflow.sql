-- Dopingeducatie workflow voor Fightsupport.

alter table public.fightpassport_fighters add column if not exists primary_discipline text;
-- Browserclients lezen/schrijven uitsluitend via serverroutes; daarom RLS aan zonder brede clientpolicies.

create table if not exists public.doping_fighters (
  va_nummer text primary key references public.fightpassport_fighters(va_nummer) on delete cascade,
  is_target boolean not null default false,
  target_reason text,
  workflow_status text not null default 'niet_uitgenodigd',
  last_invited_at timestamptz,
  reminder_count integer not null default 0,
  certificate_status text not null default 'niet_ontvangen',
  certificate_received_at timestamptz,
  certificate_reviewed_at timestamptz,
  certificate_reviewed_by uuid,
  certificate_rejection_reason text,
  fightpassport_status text not null default 'niet_verwerkt',
  fightpassport_processed_at timestamptz,
  fightpassport_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.doping_invitations (
  id uuid primary key default gen_random_uuid(),
  va_nummer text not null references public.fightpassport_fighters(va_nummer) on delete cascade,
  upload_token uuid not null unique default gen_random_uuid(),
  email_to text not null,
  invitation_type text not null default 'uitnodiging',
  subject text,
  sent_at timestamptz,
  delivery_status text not null default 'pending',
  delivery_error text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.doping_certificates (
  id uuid primary key default gen_random_uuid(),
  va_nummer text not null references public.fightpassport_fighters(va_nummer) on delete cascade,
  invitation_id uuid references public.doping_invitations(id) on delete set null,
  storage_path text not null,
  original_filename text,
  mime_type text,
  size_bytes bigint,
  status text not null default 'ontvangen',
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.doping_fightpassport_queue (
  id uuid primary key default gen_random_uuid(),
  va_nummer text not null references public.fightpassport_fighters(va_nummer) on delete cascade,
  certificate_id uuid references public.doping_certificates(id) on delete set null,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  processed_at timestamptz,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists doping_fighters_status_idx on public.doping_fighters(workflow_status);
create index if not exists doping_fighters_certificate_idx on public.doping_fighters(certificate_status);
create index if not exists doping_invitations_va_idx on public.doping_invitations(va_nummer, created_at desc);
create index if not exists doping_certificates_va_idx on public.doping_certificates(va_nummer, uploaded_at desc);
create index if not exists doping_fp_queue_status_idx on public.doping_fightpassport_queue(status, created_at);

alter table public.doping_fighters enable row level security;
alter table public.doping_invitations enable row level security;
alter table public.doping_certificates enable row level security;
alter table public.doping_fightpassport_queue enable row level security;

-- Private bucket. Uploads lopen via service-role serverroutes, niet rechtstreeks vanuit de browser.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'doping-certificates',
  'doping-certificates',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.doping_fighters is 'Workflowstatus dopingeducatie per FightPassport-vechter.';
comment on table public.doping_invitations is 'Persoonlijke mailuitnodigingen met unieke uploadtoken.';
comment on table public.doping_certificates is 'Door vechters ingestuurde dopingcertificaten.';
comment on table public.doping_fightpassport_queue is 'Wachtrij voor verwerking van goedgekeurde certificaten in FightPassport.';
