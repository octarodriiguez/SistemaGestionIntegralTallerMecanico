-- Marca como CARGADO_WINPEC todos los tramites actuales
-- excepto REPARACION_VARIA.
--
-- Resultado esperado:
-- - El backlog actual queda como cargado.
-- - Los tramites nuevos (creados desde la app) se insertan como
--   PENDIENTE_CARGA automaticamente por backend.

insert into public.procedure_office_status (
  procedure_id,
  status,
  loaded_to_winpec_at,
  notes
)
select
  cp.id,
  'CARGADO_WINPEC',
  now(),
  'Marcado masivo inicial'
from public.client_procedures cp
join public.procedure_types pt on pt.id = cp.procedure_type_id
where pt.code <> 'REPARACION_VARIA'
on conflict (procedure_id) do update
  set status = 'CARGADO_WINPEC',
      loaded_to_winpec_at = now(),
      notes = 'Marcado masivo inicial',
      updated_at = now();
