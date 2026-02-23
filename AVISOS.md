# Modulo Avisos

Este documento resume la implementacion actual del modulo **Avisos** (antes llamado Alertas).

## Objetivo

Centralizar en una sola pantalla dos flujos:

1. **Vencimientos**:
- Detectar tramites a avisar segun validacion ENARGAS.
- Avisar por WhatsApp.

2. **Retiro de tramites**:
- Marcar cuando el tramite fue recibido.
- Avisar al cliente para retiro.
- Marcar cuando el cliente retira.
- Filtrar por `Cargados ayer`, `Todos los pendientes` o `Todos`.

---

## Rutas de UI

- Nueva ruta principal: `app/avisos/page.tsx`
  - Reusa la pagina actual: exporta `app/alertas/page.tsx`.
- Ruta legacy mantenida: `app/alertas/page.tsx`

En el menu principal ahora figura:
- `key: "avisos"`
- `href: "/avisos"`
- `title: "Avisos"`

Archivo: `lib/modules.ts`

---

## Estructura de la pantalla

Archivo principal: `app/alertas/page.tsx`

La pantalla tiene 2 secciones desplegables:

1. **Vencimientos**
- Mantiene la logica existente (busqueda, filtro por mes, estado, comprobar vencimientos, avisar).
- Boton `Avisar` habilitado solo si `status = PENDIENTE_DE_AVISAR` y hay telefono.

2. **Retiro de tramites**
- Lista tramites de tipo `RENOVACION_OBLEA` y `PRUEBA_HIDRAULICA`.
- Filtros disponibles:
  - `Cargados ayer` (default)
  - `Todos los pendientes`
  - `Todos`
- Botones por fila:
  - `Recibido`
  - `Avisar` (habilita solo en estado `RECIBIDO` y con telefono)
  - `Retirado` (habilita en `RECIBIDO` o `AVISADO_RETIRO`)

---

## API de Avisos

### Vencimientos (compatibilidad nueva)

- `GET /api/avisos`
  - Alias de `GET /api/alertas`
  - Archivo: `app/api/avisos/route.ts`

- `POST /api/avisos/comprobar`
  - Alias de `POST /api/alertas/comprobar`
  - Archivo: `app/api/avisos/comprobar/route.ts`

- `POST /api/avisos/avisar`
  - Alias de `POST /api/alertas/avisar`
  - Archivo: `app/api/avisos/avisar/route.ts`

- `POST /api/avisos/comprobar-uno`
  - Alias de `POST /api/alertas/comprobar-uno`
  - Archivo: `app/api/avisos/comprobar-uno/route.ts`

### Retiro de tramites (nuevo)

- `GET /api/avisos/retiro`
  - Devuelve listado para gestion de retiro (con paginacion, busqueda y filtro).
  - Query params:
    - `filter`: `yesterday` | `pending` | `all` (default `yesterday`)
  - Archivo: `app/api/avisos/retiro/route.ts`

- `POST /api/avisos/retiro/estado`
  - Actualiza estado de retiro.
  - Body:
    - `procedureId: string`
    - `action: "received" | "notified" | "retired"`
  - Archivo: `app/api/avisos/retiro/estado/route.ts`

---

## Base de datos

### Tabla existente (vencimientos)

- `procedure_alert_status`
- SQL base: `scripts/sql/2026-02-22_alertas_status.sql`

### Tabla nueva (retiro)

SQL: `scripts/sql/2026-02-22_procedure_delivery_status.sql`

Tabla:
- `procedure_delivery_status`

Campos principales:
- `procedure_id` (unique, FK a `client_procedures.id`)
- `status`:
  - `PENDIENTE_RECEPCION`
  - `RECIBIDO`
  - `AVISADO_RETIRO`
  - `RETIRADO`
- `received_at`
- `notified_at`
- `picked_up_at`
- `notes`
- `created_at`
- `updated_at`

Incluye:
- indice por `procedure_id`
- indice por `status`
- trigger `trg_procedure_delivery_status_updated_at` con `public.set_updated_at()`

---

## Flujo operativo recomendado

### Vencimientos

1. Ir a `Avisos > Vencimientos`.
2. Elegir mes (ej: `2025-02` filtra **solo** febrero 2025).
3. Ejecutar `Comprobar vencimientos`.
4. Revisar estado y usar `Avisar` cuando corresponda.

### Retiro

1. Ir a `Avisos > Retiro de tramites`.
2. Cuando ingresa el tramite al taller: `Recibido`.
3. Cuando se avisa al cliente por WhatsApp: `Avisar`.
4. Cuando el cliente retira: `Retirado`.

Filtros en Retiro:
- `Cargados ayer`: tramites creados en el dia calendario anterior.
- `Todos los pendientes`: excluye estado `RETIRADO` y muestra solo casos accionables con `dominio + marca + modelo`.
- `Todos`: sin filtro de estado ni fecha.

---

## Migracion / Puesta en marcha

1. Ejecutar en la BD:

```sql
-- scripts/sql/2026-02-22_procedure_delivery_status.sql
```

2. Verificar que exista la funcion de trigger:
- `public.set_updated_at()`

3. Probar endpoints:
- `GET /api/avisos/retiro`
- `POST /api/avisos/retiro/estado`

---

## Notas tecnicas

- La UI de `/avisos` reutiliza el componente de `app/alertas/page.tsx` para mantener compatibilidad.
- Se mantienen rutas legacy `/alertas` y `/api/alertas` para no romper integraciones previas.
- El modulo ya quedo preparado para extender la seccion Retiro con:
  - plantillas de WhatsApp personalizadas,
  - filtros por estado,
  - auditoria de usuario que realiza cada accion.
