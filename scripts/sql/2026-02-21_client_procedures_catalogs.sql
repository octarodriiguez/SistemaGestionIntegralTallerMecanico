create extension if not exists "pgcrypto";

create table if not exists public.procedure_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  requires_distributor boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.distributors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contact text null,
  phone text null,
  email text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_procedures (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  procedure_type_id uuid not null references public.procedure_types(id),
  distributor_id uuid null references public.distributors(id) on delete set null,
  paid boolean not null default false,
  amount_paid numeric(10,2) not null default 0,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_procedures
  add column if not exists paid boolean not null default false;

alter table public.client_procedures
  add column if not exists amount_paid numeric(10,2) not null default 0;

create index if not exists idx_client_procedures_client_id on public.client_procedures (client_id);
create index if not exists idx_client_procedures_procedure_type_id on public.client_procedures (procedure_type_id);
create index if not exists idx_client_procedures_distributor_id on public.client_procedures (distributor_id);
create index if not exists idx_client_procedures_created_at on public.client_procedures (created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_procedure_types_updated_at on public.procedure_types;
create trigger trg_procedure_types_updated_at
before update on public.procedure_types
for each row execute function public.set_updated_at();

drop trigger if exists trg_distributors_updated_at on public.distributors;
create trigger trg_distributors_updated_at
before update on public.distributors
for each row execute function public.set_updated_at();

drop trigger if exists trg_client_procedures_updated_at on public.client_procedures;
create trigger trg_client_procedures_updated_at
before update on public.client_procedures
for each row execute function public.set_updated_at();

insert into public.procedure_types (code, display_name, requires_distributor)
values
  ('REPARACION_VARIA', 'Reparacion varia', false),
  ('RENOVACION_OBLEA', 'Renovacion de oblea', true),
  ('PRUEBA_HIDRAULICA', 'Prueba hidraulica', true),
  ('MODIFICACION', 'Modificacion', true),
  ('CONVERSION', 'Conversion', true),
  ('DESMONTAJE', 'Desmontaje', true)
on conflict (code) do update
set
  display_name = excluded.display_name,
  requires_distributor = excluded.requires_distributor,
  updated_at = now();
