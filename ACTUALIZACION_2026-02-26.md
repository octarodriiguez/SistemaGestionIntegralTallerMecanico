# Actualizacion 2026-02-26

Este documento resume los cambios implementados sobre feedback de pruebas reales.

## 1) Telefonos: validacion y persistencia

### Cambios
- El telefono ahora puede quedar vacio (`null`) o con `0` para omitir.
- Se normaliza a solo digitos antes de guardar.
- Se agrega confirmacion en UI antes de guardar el alta:
  - Mensaje de confirmacion con el numero que se va a almacenar.

### Impacto
- Evita guardar numeros invalidos.
- Evita enviar WhatsApp a destinatarios incorrectos.

### Archivos
- `app/api/clientes/route.ts`
- `components/modules/tramites/new-client-with-vehicle-form.tsx`

---

## 2) Asociacion correcta de vehiculo por tramite

### Problema
- Cuando un cliente tenia varios vehiculos, algunas vistas mostraban el primer vehiculo del cliente y no el del tramite.

### Solucion implementada
- En nuevas altas se guarda tag de dominio en `client_procedures.notes`:
  - Formato: `[DOMINIO:ABC123] ...`
- Las APIs ahora resuelven el vehiculo por ese dominio (con fallback al primero si no existe tag legacy).

### Archivos
- `app/api/clientes/route.ts`
- `app/api/tramites/route.ts`
- `app/api/alertas/route.ts`
- `app/api/avisos/retiro/route.ts`
- `app/api/tramites/oficina/route.ts`

---

## 3) Avisos: ajustes funcionales y visuales

### Cambios
- Seccion `Vencimientos` inicia cerrada por defecto.
- Etiqueta `O` cambiada a `OBLEA`.
- Tablas con texto mas legible (`text-sm`).
- En `Retiro`, botones con `flex-wrap` para evitar superposicion.
- Columna `Obs` agregada en tabla de retiro.

### Archivos
- `app/alertas/page.tsx`

---

## 4) Clientes: edicion operativa y acciones nuevas

### Cambios
- Columna `Obs` visible en tabla.
- Boton para editar pago por tramite:
  - Edita `total_amount`, `amount_paid`, recalcula `paid`.
- Boton para eliminar tramite cargado.
- Boton para marcar `Retirado` desde clientes (mesa de entrada), con captura de monto abonado.
- Tabla con tipografia mas legible y ajuste de layout.

### Archivos
- `app/clientes/page.tsx`
- `app/api/tramites/route.ts` (nuevos `PATCH` y `DELETE`)

---

## 5) Tramites: vista de cargados

### Cambios
- Se agrega bloque "Ultimos tramites cargados" en la pantalla de Tramites.
- Se refresca automaticamente luego de un alta exitosa.
- Etiqueta `OBLEA` aplicada en listado.

### Archivos
- `app/tramites/page.tsx`

---

## 6) API nuevas/modificadas

### `PATCH /api/tramites`
Actualiza montos del tramite.

Body:
```json
{
  "procedureId": "uuid",
  "totalAmount": 30000,
  "amountPaid": 15000
}
```

Validaciones:
- `amountPaid >= 0`
- `totalAmount >= 0`
- `amountPaid <= totalAmount`

### `DELETE /api/tramites`
Elimina un tramite por id.

Body:
```json
{
  "procedureId": "uuid"
}
```

---

## 7) Estado de compilacion

Verificacion ejecutada:
- `npm run build` -> OK

---

## 8) Pendiente para siguiente bloque

- Edicion completa del formulario de alta (todos los campos en modal de edicion integral).
- Revisar en produccion casos puntuales de desincronizacion `Avisado/Recibido` si reaparecen.
- Boton especifico de "eliminar cliente" (hoy se implemento eliminar tramite).
