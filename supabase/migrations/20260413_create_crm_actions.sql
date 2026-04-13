-- Tabla central de acciones del CRM para métricas y KPIs
create table if not exists public.crm_actions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete set null,
  lead_id uuid references public.clients(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  category text not null, -- ventas, captación, prospección, rentas, marketing, trámites
  action_type text not null, -- llamada, visita, oferta, etc
  operation_type text, -- venta, renta, captación, etc
  source_channel text, -- canal de origen
  status text, -- estado de la acción
  scheduled_at timestamptz, -- fecha/hora programada
  completed_at timestamptz, -- fecha/hora realizada
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices para consultas rápidas
create index if not exists idx_crm_actions_user_id on public.crm_actions(user_id);
create index if not exists idx_crm_actions_lead_id on public.crm_actions(lead_id);
create index if not exists idx_crm_actions_property_id on public.crm_actions(property_id);
create index if not exists idx_crm_actions_category on public.crm_actions(category);
create index if not exists idx_crm_actions_action_type on public.crm_actions(action_type);
create index if not exists idx_crm_actions_operation_type on public.crm_actions(operation_type);
create index if not exists idx_crm_actions_created_at on public.crm_actions(created_at);

-- Políticas de seguridad (ajustar según tu modelo de usuarios)
alter table public.crm_actions enable row level security;

-- Permitir lectura e inserción a usuarios autenticados (ajustar según roles reales)
drop policy if exists "Authenticated users can read crm_actions" on public.crm_actions;
drop policy if exists "Authenticated users can insert crm_actions" on public.crm_actions;

create policy "Authenticated users can read crm_actions"
on public.crm_actions
for select
using (true);

create policy "Authenticated users can insert crm_actions"
on public.crm_actions
for insert
with check (true);
