create table if not exists public.procedure_delivery_status (
  id uuid primary key default gen_random_uuid(),
  procedure_id uuid not null unique references public.client_procedures(id) on delete cascade,
  status text not null default 'PENDIENTE_RECEPCION',
  received_at timestamptz null,
  notified_at timestamptz null,
  picked_up_at timestamptz null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_procedure_delivery_status
    check (status in ('PENDIENTE_RECEPCION', 'RECIBIDO', 'AVISADO_RETIRO', 'RETIRADO'))
);

create index if not exists idx_procedure_delivery_status_procedure_id
  on public.procedure_delivery_status (procedure_id);

create index if not exists idx_procedure_delivery_status_status
  on public.procedure_delivery_status (status);

drop trigger if exists trg_procedure_delivery_status_updated_at on public.procedure_delivery_status;
create trigger trg_procedure_delivery_status_updated_at
before update on public.procedure_delivery_status
for each row execute function public.set_updated_at();

