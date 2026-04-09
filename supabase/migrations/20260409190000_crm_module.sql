create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text,
  whatsapp text,
  email text,
  property_type text,
  budget text,
  zone text,
  notes text,
  stage text default 'Interesado',
  created_at timestamp default now()
);

create table if not exists public.property_links (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  generated_url text,
  property_type text,
  colleague_agency text,
  created_at timestamp default now()
);

alter table public.clients enable row level security;
alter table public.property_links enable row level security;

drop policy if exists "Authenticated users can read clients" on public.clients;
drop policy if exists "Authenticated users can insert clients" on public.clients;
drop policy if exists "Authenticated users can update clients" on public.clients;
drop policy if exists "Authenticated users can delete clients" on public.clients;

create policy "Authenticated users can read clients"
on public.clients
for select
to authenticated
using (true);

create policy "Authenticated users can insert clients"
on public.clients
for insert
to authenticated
with check (true);

create policy "Authenticated users can update clients"
on public.clients
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete clients"
on public.clients
for delete
to authenticated
using (true);

drop policy if exists "Authenticated users can read property links" on public.property_links;
drop policy if exists "Authenticated users can insert property links" on public.property_links;
drop policy if exists "Authenticated users can update property links" on public.property_links;
drop policy if exists "Authenticated users can delete property links" on public.property_links;

create policy "Authenticated users can read property links"
on public.property_links
for select
to authenticated
using (true);

create policy "Authenticated users can insert property links"
on public.property_links
for insert
to authenticated
with check (true);

create policy "Authenticated users can update property links"
on public.property_links
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete property links"
on public.property_links
for delete
to authenticated
using (true);
