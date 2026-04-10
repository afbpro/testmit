create table if not exists public.properties (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  type text,
  operation text,
  price text,
  department text,
  zone text,
  zone_specific text,
  url text,
  notes text,
  created_at timestamp default now()
);

alter table public.properties enable row level security;

drop policy if exists "authenticated users can do everything" on public.properties;
create policy "authenticated users can do everything"
on public.properties for all
to authenticated
using (true)
with check (true);

create table if not exists public.property_links (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  generated_url text,
  property_type text,
  colleague_agency text,
  created_at timestamp default now()
);

alter table public.property_links enable row level security;

drop policy if exists "authenticated users can do everything" on public.property_links;
create policy "authenticated users can do everything"
on public.property_links for all
to authenticated
using (true)
with check (true);

alter table public.clients
  add column if not exists last_contact timestamp,
  add column if not exists activity_log jsonb default '[]'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'last_contact_at'
  ) then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'clients'
        and column_name = 'last_contact'
    ) then
      execute 'update public.clients set last_contact = coalesce(last_contact, last_contact_at)';
    else
      execute 'alter table public.clients rename column last_contact_at to last_contact';
    end if;
  end if;
end $$;

update public.clients
set activity_log = '[]'::jsonb
where activity_log is null;
