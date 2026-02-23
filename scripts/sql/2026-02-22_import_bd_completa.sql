-- Importador de BD_Completa.csv (fuente unica, sin separar en 3 CSV)
-- Objetivo:
-- 1) Preservar TODOS los registros de tramites.
-- 2) Permitir re-ejecucion sin duplicar filas ya migradas.
-- 3) Dejar trazabilidad por row_id de staging.
--
-- Uso recomendado:
-- A) Crear stg_bd_completa y cargar el CSV (separador ';').
-- B) Ejecutar este script completo.
-- C) Revisar consultas finales de control.

create extension if not exists unaccent;

create table if not exists public.stg_bd_completa (
  row_id bigint generated always as identity primary key,
  raw_client_name text,
  raw_phone text,
  raw_brand_model text,
  raw_domain text,
  raw_procedure text,
  raw_fecha text,
  raw_distributor_name text,
  raw_amount_paid text,
  imported_at timestamptz not null default now()
);

create table if not exists public.legacy_import_bd_completa (
  row_id bigint primary key references public.stg_bd_completa(row_id) on delete cascade,
  status text not null,
  details text null,
  created_at timestamptz not null default now(),
  constraint chk_legacy_import_bd_completa_status
    check (status in ('IMPORTED', 'SKIPPED_NO_CLIENT', 'SKIPPED_NO_PROCEDURE_TYPE', 'SKIPPED_EMPTY_ROW'))
);

-- Distribuidoras base (idempotente)
insert into public.distributors (name)
values ('Universo'), ('Advan'), ('Hidro Cil')
on conflict (name) do nothing;

begin;

with normalized as (
  select
    s.row_id,
    trim(coalesce(s.raw_client_name, '')) as client_name_raw,
    regexp_replace(coalesce(s.raw_phone, ''), '\D', '', 'g') as phone_digits,
    upper(regexp_replace(trim(coalesce(s.raw_domain, '')), '\s+', '', 'g')) as domain_norm,
    trim(coalesce(s.raw_brand_model, '')) as brand_model_raw,
    lower(unaccent(trim(coalesce(s.raw_procedure, '')))) as procedure_norm,
    case
      when trim(coalesce(s.raw_fecha, '')) ~ '^\d{2}/\d{2}/\d{4}$'
      then to_date(trim(s.raw_fecha), 'DD/MM/YYYY')::timestamptz
      else null
    end as procedure_at,
    trim(coalesce(s.raw_distributor_name, '')) as distributor_name_raw,
    case
      when nullif(trim(coalesce(s.raw_amount_paid, '')), '') is null then null::numeric
      when trim(s.raw_amount_paid) ~ '^\d+([.,]\d+)?$'
        then replace(trim(s.raw_amount_paid), ',', '.')::numeric
      else null::numeric
    end as amount_paid_norm
  from public.stg_bd_completa s
  left join public.legacy_import_bd_completa m on m.row_id = s.row_id
  where m.row_id is null
),
prepared as (
  select
    n.row_id,
    case
      when n.client_name_raw = '' then ''
      when strpos(n.client_name_raw, ' ') > 0 then initcap(split_part(n.client_name_raw, ' ', 1))
      else initcap(n.client_name_raw)
    end as first_name_norm,
    case
      when n.client_name_raw = '' then 'Sin Apellido'
      when strpos(n.client_name_raw, ' ') > 0 then initcap(substr(n.client_name_raw, strpos(n.client_name_raw, ' ') + 1))
      else 'Sin Apellido'
    end as last_name_norm,
    n.phone_digits,
    n.domain_norm,
    case
      when n.brand_model_raw = '' then 'SIN_MARCA'
      when strpos(n.brand_model_raw, ' ') > 0 then upper(split_part(n.brand_model_raw, ' ', 1))
      else upper(n.brand_model_raw)
    end as brand_norm,
    case
      when n.brand_model_raw = '' then 'SIN_MODELO'
      when strpos(n.brand_model_raw, ' ') > 0 then trim(substr(n.brand_model_raw, strpos(n.brand_model_raw, ' ') + 1))
      else 'SIN_MODELO'
    end as model_norm,
    case
      when n.procedure_norm like '%prueba%hidraulica%' then 'PRUEBA_HIDRAULICA'
      when n.procedure_norm like '%renovacion%oblea%' then 'RENOVACION_OBLEA'
      when n.procedure_norm like '%conversion%' then 'CONVERSION'
      when n.procedure_norm like '%modificacion%' then 'MODIFICACION'
      when n.procedure_norm like '%desmontaje%' then 'DESMONTAJE'
      when n.procedure_norm like '%reparacion%' then 'REPARACION_VARIA'
      else null
    end as procedure_code_norm,
    n.procedure_at,
    n.distributor_name_raw,
    n.amount_paid_norm
  from normalized n
),
clients_to_insert as (
  select distinct
    p.first_name_norm as first_name,
    p.last_name_norm as last_name,
    coalesce(p.phone_digits, '') as phone
  from prepared p
  where p.first_name_norm <> ''
),
insert_clients as (
  insert into public.clients (first_name, last_name, phone, created_at, updated_at)
  select
    c.first_name,
    c.last_name,
    c.phone,
    now(),
    now()
  from clients_to_insert c
  where not exists (
    select 1
    from public.clients x
    where lower(x.first_name) = lower(c.first_name)
      and lower(x.last_name) = lower(c.last_name)
      and regexp_replace(coalesce(x.phone, ''), '\D', '', 'g') = regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')
  )
  returning id
),
prepared_with_client as (
  select
    p.*,
    c.id as client_id
  from prepared p
  left join public.clients c
    on lower(c.first_name) = lower(p.first_name_norm)
   and lower(c.last_name) = lower(p.last_name_norm)
   and regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') = regexp_replace(coalesce(p.phone_digits, ''), '\D', '', 'g')
),
insert_vehicles as (
  insert into public.vehicles (client_id, brand, model, domain, created_at, updated_at)
  select
    x.client_id,
    x.brand_norm,
    x.model_norm,
    x.domain_norm,
    now(),
    now()
  from (
    select
      p.client_id,
      p.brand_norm,
      p.model_norm,
      p.domain_norm,
      row_number() over (
        partition by p.domain_norm
        order by p.row_id
      ) as rn
    from prepared_with_client p
    where p.client_id is not null
      and p.domain_norm <> ''
      and length(p.domain_norm) >= 3
  ) x
  where x.rn = 1
  on conflict (domain) do nothing
  returning id
),
prepared_joined as (
  select
    p.row_id,
    p.client_id,
    pt.id as procedure_type_id,
    d.id as distributor_id,
    coalesce(p.procedure_at, now()) as created_at_norm,
    coalesce(p.amount_paid_norm, 0::numeric) as amount_paid_norm,
    coalesce(p.amount_paid_norm, 0::numeric) as total_amount_norm,
    case when coalesce(p.amount_paid_norm, 0::numeric) > 0 then true else false end as paid_norm,
    case
      when p.domain_norm <> '' then concat('Importado BD_Completa. Dominio: ', p.domain_norm)
      else 'Importado BD_Completa. Sin dominio'
    end as notes_norm
  from prepared_with_client p
  left join public.procedure_types pt on pt.code = p.procedure_code_norm
  left join public.distributors d on lower(d.name) = lower(p.distributor_name_raw)
),
insert_procedures as (
  insert into public.client_procedures (
    client_id,
    procedure_type_id,
    distributor_id,
    paid,
    total_amount,
    amount_paid,
    notes,
    created_at,
    updated_at
  )
  select
    p.client_id,
    p.procedure_type_id,
    p.distributor_id,
    p.paid_norm,
    p.total_amount_norm,
    p.amount_paid_norm,
    p.notes_norm,
    p.created_at_norm,
    now()
  from prepared_joined p
  where p.client_id is not null
    and p.procedure_type_id is not null
    and not exists (
      select 1 from public.legacy_import_bd_completa m where m.row_id = p.row_id
    )
  returning id
),
mark_imported as (
  insert into public.legacy_import_bd_completa (row_id, status, details)
  select
    p.row_id,
    'IMPORTED',
    null
  from prepared_joined p
  where p.client_id is not null
    and p.procedure_type_id is not null
    and not exists (
      select 1 from public.legacy_import_bd_completa m where m.row_id = p.row_id
    )
  on conflict (row_id) do nothing
  returning row_id
),
mark_skipped_no_client as (
  insert into public.legacy_import_bd_completa (row_id, status, details)
  select
    p.row_id,
    'SKIPPED_NO_CLIENT',
    'No se pudo resolver cliente por nombre+apellido+telefono'
  from prepared_joined p
  where p.client_id is null
    and not exists (
      select 1 from public.legacy_import_bd_completa m where m.row_id = p.row_id
    )
  on conflict (row_id) do nothing
  returning row_id
),
mark_skipped_no_procedure as (
  insert into public.legacy_import_bd_completa (row_id, status, details)
  select
    p.row_id,
    'SKIPPED_NO_PROCEDURE_TYPE',
    concat('No se pudo mapear tramite: ', coalesce(s.raw_procedure, ''))
  from prepared_joined p
  join public.stg_bd_completa s on s.row_id = p.row_id
  where p.client_id is not null
    and p.procedure_type_id is null
    and not exists (
      select 1 from public.legacy_import_bd_completa m where m.row_id = p.row_id
    )
  on conflict (row_id) do nothing
  returning row_id
)
select 1;

commit;

-- ===============================
-- CONTROLES RAPIDOS
-- ===============================
-- Resumen por estado de importacion:
-- select status, count(*) from public.legacy_import_bd_completa group by status order by status;
--
-- Total tramites en principal:
-- select count(*) from public.client_procedures;
--
-- Filas de staging todavia no evaluadas:
-- select count(*)
-- from public.stg_bd_completa s
-- left join public.legacy_import_bd_completa m on m.row_id = s.row_id
-- where m.row_id is null;
