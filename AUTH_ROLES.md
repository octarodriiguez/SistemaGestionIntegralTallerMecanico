# Autenticacion, Roles y Pendientes de Oficina

Este documento describe el bloque nuevo implementado para:
- Login con sesion persistente.
- Control de permisos por rol.
- Flujo de pendientes de oficina para marcar carga en WINPEC.

Fecha: 2026-02-23

## Cambio de login (importante)

Desde esta version, el acceso es con:
- `usuario + contraseña`

Ya no se usa `email + contraseña` para iniciar sesion.

## 1) Objetivo funcional

Separar el trabajo por perfiles:
- `MESA_ENTRADA`: carga clientes/tramites y consultas operativas.
- `OFICINA`: gestiona avisos/alertas y controla pendientes administrativos (WINPEC).

Ademas, dejar trazabilidad de "cargado en WINPEC" para tramites que no sean reparacion varia.

## 2) Componentes implementados

### Backend
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/me/route.ts`
- `app/api/tramites/oficina/route.ts`
- `lib/auth-session.ts`
- `middleware.ts`

### Frontend
- `app/login/page.tsx`
- `components/layout/app-shell.tsx`
- `components/modules/tramites/office-pending-card.tsx`
- `components/modules/tramites/office-pending-panel.tsx`
- `app/tramites/page.tsx`
- `lib/modules.ts`

### SQL
- `scripts/sql/2026-02-23_auth_roles.sql`
- `scripts/sql/2026-02-23_procedure_office_status.sql`

## 3) Modelo de datos

### 3.1 Usuarios de aplicacion
Tabla: `public.app_users`

Campos principales:
- `id` (uuid, pk)
- `username` (unique)
- `full_name`
- `role` (`OFICINA` | `MESA_ENTRADA`)
- `password_hash` (bcrypt)
- `active` (bool)
- `created_at`, `updated_at`

### 3.2 Sesiones
Tabla: `public.app_sessions`

Campos:
- `token` (pk)
- `user_id` (fk -> `app_users.id`)
- `expires_at`
- `created_at`

Cookie usada:
- `sgitm_session` (httpOnly, sameSite=lax, secure en produccion).

TTL actual:
- 14 dias.

### 3.3 Estado de oficina por tramite
Tabla: `public.procedure_office_status`

Campos:
- `procedure_id` (unique, fk -> `client_procedures.id`)
- `status` (`PENDIENTE_CARGA` | `CARGADO_WINPEC`)
- `loaded_to_winpec_at`
- `notes`
- `created_at`, `updated_at`

## 4) Flujo de autenticacion

1. Usuario entra a `/login`.
2. `POST /api/auth/login` valida `username + password`.
3. Si es correcto:
- crea registro en `app_sessions`.
- setea cookie `sgitm_session`.
4. Middleware valida la cookie en cada request protegida.
5. `GET /api/auth/me` devuelve usuario autenticado actual.
6. `POST /api/auth/logout` elimina sesion y borra cookie.

## 5) Matriz de permisos actual

### OFICINA
Puede acceder a todo.

### MESA_ENTRADA
No puede acceder a:
- Modulos UI:
  - `/avisos`
  - `/alertas`
  - `/distribuidoras`
  - `/comprobantes`
- APIs:
  - `/api/avisos/*`
  - `/api/alertas/*`
  - `/api/tramites/oficina`

Si intenta entrar:
- En paginas: redireccion a `/dashboard`.
- En APIs: `403`.

## 6) Pendientes de oficina (WINPEC)

Seccion nueva en `Tramites`:
- visible solo para rol `OFICINA`.
- lista tramites no `REPARACION_VARIA`.
- permite:
  - filtrar por estado (`PENDIENTE_CARGA`, `CARGADO_WINPEC`, `ALL`)
  - buscar por persona/dominio
  - marcar tramite como `CARGADO_WINPEC`.

Endpoint:
- `GET /api/tramites/oficina`
- `POST /api/tramites/oficina` con body:
```json
{
  "procedureId": "uuid",
  "action": "mark_winpec"
}
```

### 6.1 Alta automatica en estado pendiente

Cuando se crea un tramite nuevo desde el formulario principal:
- si el tramite requiere distribuidora (no `REPARACION_VARIA`),
- se crea/actualiza automaticamente en `procedure_office_status` con:
  - `status = PENDIENTE_CARGA`
  - `notes = "Pendiente de carga en WINPEC"`

Archivo involucrado:
- `app/api/clientes/route.ts`

### 6.2 Marcado masivo inicial (backlog)

Para dejar todo lo historico como cargado y empezar limpio desde hoy:
- ejecutar `scripts/sql/2026-02-23_office_mark_all_loaded.sql` una sola vez.

Resultado:
- tramites historicos (excepto `REPARACION_VARIA`) quedan en `CARGADO_WINPEC`.
- desde ese momento, solo los nuevos apareceran como `PENDIENTE_CARGA`.

### 6.3 Notificacion visual en menu

Se agrego badge numerico sobre el boton/modulo `Tramites` en sidebar:
- visible solo para rol `OFICINA`.
- muestra cantidad de registros `PENDIENTE_CARGA`.
- refresco automatico cada 30 segundos.

Endpoint del contador:
- `GET /api/tramites/oficina/pending-count`

Archivos involucrados:
- `app/api/tramites/oficina/pending-count/route.ts`
- `components/layout/app-shell.tsx`

## 7) Puesta en marcha (obligatorio)

Ejecutar en este orden:

1. `scripts/sql/2026-02-23_auth_roles.sql`
2. `scripts/sql/2026-02-23_procedure_office_status.sql`

Si falta alguno:
- Login/roles no funciona.
- Pendientes de oficina no funciona.

## 8) Usuarios iniciales creados por SQL

- `ofi_admin` / `1234`
- `admin` / `1234`

Recomendacion:
- Cambiar ambas contraseñas al primer uso.

## 9) Variables de entorno requeridas

Minimo necesario:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Sin esas variables, middleware y APIs protegidas no pueden validar sesion.

## 10) Checklist de verificacion rapida

1. Abrir `/login`.
2. Probar login con `admin`:
- entra a dashboard.
- no ve modulos restringidos en menu.
- no puede abrir `/avisos` (redirecciona).
3. Probar login con `ofi_admin`:
- ve todos los modulos.
- en `Tramites` ve card de pendientes oficina.
- puede marcar `WINPEC` en una fila.
4. Verificar en BD:
- `app_sessions` con registro activo.
- `procedure_office_status` actualizada al marcar.

## 11) Troubleshooting

### Error "No autenticado"
- Revisar cookie `sgitm_session`.
- Verificar que `POST /api/auth/login` responda 200.

### Error "No se pudo validar sesion"
- Revisar `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
- Revisar permisos de la key en proyecto Supabase.

### Error al usar pendientes oficina
- Ejecutar SQL `2026-02-23_procedure_office_status.sql`.
- Confirmar existencia de tabla `procedure_office_status`.

## 12) Seguridad (importante)

- No exponer `SUPABASE_SERVICE_ROLE_KEY` en frontend.
- Si una key fue compartida por chat o logs, rotarla en Supabase.
- Mantener `secure` cookie activo en produccion (ya implementado).

## 13) Estado actual y limites

Estado:
- Login/roles funcional.
- Middleware activo.
- Restriccion de modulos y APIs funcional.
- Pendientes de oficina funcional para `OFICINA`.

Limites actuales:
- No existe pantalla de gestion de usuarios.
- No existe cambio de password desde UI.
- No hay auditoria avanzada (quien marco WINPEC).

## 14) Siguiente iteracion recomendada

1. Pantalla de administracion de usuarios (alta/baja/rol).
2. Cambio de password forzado en primer login.
3. Auditoria de acciones (`created_by`, `updated_by`) en estados de oficina y retiro.
