create table if not exists public.procedure_alert_status (
  id uuid primary key default gen_random_uuid(),
  procedure_id uuid not null unique references public.client_procedures(id) on delete cascade,
  status text not null default 'PENDIENTE_DE_AVISAR',
  enargas_last_operation_date date null,
  last_checked_at timestamptz null,
  notified_at timestamptz null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_procedure_alert_status
    check (status in ('PENDIENTE_DE_AVISAR', 'AVISADO', 'NO_CORRESPONDE_AVISAR'))
);

create index if not exists idx_procedure_alert_status_procedure_id
  on public.procedure_alert_status (procedure_id);

create index if not exists idx_procedure_alert_status_status
  on public.procedure_alert_status (status);

drop trigger if exists trg_procedure_alert_status_updated_at on public.procedure_alert_status;
create trigger trg_procedure_alert_status_updated_at
before update on public.procedure_alert_status
for each row execute function public.set_updated_at();
