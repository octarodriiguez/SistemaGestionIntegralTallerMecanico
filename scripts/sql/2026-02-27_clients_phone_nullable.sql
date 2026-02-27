begin;

-- Permite telefono nulo en clientes.
alter table if exists public.clients
  alter column phone drop not null;

-- Normaliza valores "basura" previos a null.
update public.clients
set phone = null
where trim(coalesce(phone, '')) = ''
   or regexp_replace(coalesce(phone, ''), '\D', '', 'g') in ('0');

commit;
