alter table public.properties
add column if not exists image_urls jsonb not null default '[]'::jsonb;
