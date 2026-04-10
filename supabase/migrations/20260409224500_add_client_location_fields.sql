alter table public.clients
  add column if not exists department text,
  add column if not exists zone_specific text;
