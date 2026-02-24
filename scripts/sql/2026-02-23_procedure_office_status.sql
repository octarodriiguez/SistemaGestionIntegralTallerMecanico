create table if not exists public.procedure_office_status (
  id uuid primary key default gen_random_uuid(),
  procedure_id uuid not null unique references public.client_procedures(id) on delete cascade,
  status text not null default 'PENDIENTE_CARGA',
  loaded_to_winpec_at timestamptz null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_procedure_office_status
    check (status in ('PENDIENTE_CARGA', 'CARGADO_WINPEC'))
);

create index if not exists idx_procedure_office_status_procedure_id
  on public.procedure_office_status (procedure_id);

create index if not exists idx_procedure_office_status_status
  on public.procedure_office_status (status);

drop trigger if exists trg_procedure_office_status_updated_at on public.procedure_office_status;
create trigger trg_procedure_office_status_updated_at
before update on public.procedure_office_status
for each row execute function public.set_updated_at();
