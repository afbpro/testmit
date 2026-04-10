alter table public.clients
  add column if not exists last_contact_at timestamptz,
  add column if not exists activity_log jsonb not null default '[]'::jsonb;
