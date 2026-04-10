alter table public.clients
  add column if not exists operation_type text,
  add column if not exists period text,
  add column if not exists budget_notes text;