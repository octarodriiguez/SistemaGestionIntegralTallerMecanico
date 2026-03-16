# 📋 Sistema de Gestión para Talleres de GNC

## 🎯 Descripción del Proyecto

Sistema web intuitivo para la gestión integral de talleres mecánicos especializados en GNC (Gas Natural Comprimido), diseñado para reemplazar la gestión manual mediante planillas de Excel con una solución moderna, escalable y fácil de usar.

### Objetivo Principal
Digitalizar y automatizar la gestión de:
- Clientes y vehículos
- Trámites y obleas (con sistema de alertas automáticas)
- Cuentas corrientes con distribuidoras
- Comprobantes (recibos, presupuestos, garantías)

---

## 🏗️ Stack Tecnológico

### Frontend
- **Next.js 15** - Framework React con App Router
- **TypeScript** - Tipado estático para mayor seguridad
- **Tailwind CSS** - Estilos utility-first
- **shadcn/ui** - Componentes UI accesibles y customizables

### Backend
- **Next.js API Routes** - Endpoints integrados en App Router
- **Prisma ORM** - Gestión de base de datos con type-safety

### Base de Datos
- **Supabase** (PostgreSQL) - Base de datos relacional en la nube
- **PostgreSQL** - Sistema de gestión de base de datos

### Autenticación
- **NextAuth.js v5** o **Supabase Auth** - Gestión de usuarios y sesiones

### Deploy & Hosting
- **Vercel** - Hosting y deploy automático
- **PWA (Progressive Web App)** - App instalable con soporte offline

### Librerías Complementarias
- **Puppeteer/Playwright** - Web scraping de página ENARGAS
- **react-pdf** o **@react-pdf/renderer** - Generación de PDFs
- **Zustand** - Gestión de estado global
- **React Hook Form + Zod** - Validación de formularios
- **TanStack Table** - Tablas avanzadas
- **react-hot-toast** - Notificaciones

---

## 📊 Módulos del Sistema

### 1. Módulo de Clientes y Vehículos
**Funcionalidades:**
- ✅ Registro de clientes con datos de contacto
- ✅ Vinculación de vehículos a clientes
- ✅ Información de vehículos: marca, modelo, dominio
- ✅ Historial de trámites por vehículo
- ✅ Sistema de búsqueda y filtros

**Campos principales:**
- Cliente: nombre, apellido, teléfono
- Vehículo: marca, modelo, dominio, tipo de trámite
- Distribuidora asignada
- Estado de pago

### 2. Módulo de Trámites
**Tipos de trámites:**
- Oblea (renovación periódica)
- Prueba hidráulica
- Conversión
- Modificación
- Desmontaje

**Funcionalidades:**
- ✅ Registro de trámites realizados
- ✅ Precios por tipo de trámite (configurables)
- ✅ Historial de precios
- ✅ Estado del trámite y distribuidora encargada

### 3. Módulo de Alertas de Vencimientos (★ Funcionalidad Estrella)
**Características:**
- 🤖 **Scraping automático** de página ENARGAS
- 📅 **Detección de vencimientos** de obleas (6-12 meses)
- 🔔 **Alertas mensuales** de clientes con obleas próximas a vencer
- 📱 **Integración con WhatsApp Web** para notificaciones
- ✅ **Verificación cruzada** con base de datos local

**Fuente de datos:**
- URL: https://www.enargas.gob.ar/secciones/gas-natural-comprimido/consulta-dominio.php
- Método: Scraping con Puppeteer/Playwright

### 4. Módulo de Distribuidoras y Cuenta Corriente
**Funcionalidades:**
- ✅ Gestión de 2-5 distribuidoras
- ✅ Registro de insumos: descripción, precio, cantidad
- ✅ Movimientos de cuenta corriente
- ✅ Pagos: efectivo o transferencia
- ✅ Cálculo automático de deuda pendiente
- ✅ Historial de movimientos

**Campos principales:**
- Distribuidora: nombre, contacto
- Transacción: fecha, concepto, monto, tipo de pago
- Saldo: deuda actual

### 5. Módulo de Comprobantes
**Tipos de documentos:**
- Recibos
- Presupuestos
- Planillas de garantía

**Funcionalidades:**
- ✅ Numeración correlativa automática
- ✅ Generación de PDFs imprimibles (A4)
- ✅ Plantillas personalizables
- ✅ Historial de comprobantes emitidos

### 6. Módulo de Usuarios
**Características:**
- ✅ Sistema de autenticación seguro
- ✅ Preparado para multi-usuario (escalabilidad futura)
- ✅ Roles y permisos (admin, operador, etc.)
- ✅ Actualmente: un solo usuario con permisos totales

---

## 🗄️ Arquitectura de Base de Datos

### Esquema de Tablas Principales

```
📦 users
├─ id (UUID, PK)
├─ email (String, unique)
├─ name (String)
├─ password_hash (String)
├─ role (Enum: ADMIN, OPERATOR)
├─ created_at (DateTime)
└─ updated_at (DateTime)

📦 clients
├─ id (UUID, PK)
├─ first_name (String)
├─ last_name (String)
├─ phone (String)
├─ created_at (DateTime)
└─ updated_at (DateTime)

📦 vehicles
├─ id (UUID, PK)
├─ client_id (UUID, FK -> clients)
├─ brand (String)
├─ model (String)
├─ domain (String, unique, indexed)
├─ created_at (DateTime)
└─ updated_at (DateTime)

📦 procedure_types
├─ id (UUID, PK)
├─ name (Enum: OBLEA, PRUEBA_HIDRAULICA, CONVERSION, MODIFICACION, DESMONTAJE)
├─ current_price (Decimal)
├─ created_at (DateTime)
└─ updated_at (DateTime)

📦 procedures
├─ id (UUID, PK)
├─ vehicle_id (UUID, FK -> vehicles)
├─ procedure_type_id (UUID, FK -> procedure_types)
├─ distributor_id (UUID, FK -> distributors, nullable)
├─ price (Decimal)
├─ paid (Boolean)
├─ payment_date (DateTime, nullable)
├─ procedure_date (DateTime)
├─ expiration_date (DateTime, nullable) // Para obleas
├─ notes (Text, nullable)
├─ created_at (DateTime)
└─ updated_at (DateTime)

📦 distributors
├─ id (UUID, PK)
├─ name (String)
├─ contact (String, nullable)
├─ phone (String, nullable)
├─ created_at (DateTime)
└─ updated_at (DateTime)

📦 distributor_transactions
├─ id (UUID, PK)
├─ distributor_id (UUID, FK -> distributors)
├─ type (Enum: PURCHASE, PAYMENT)
├─ description (String)
├─ amount (Decimal)
├─ payment_method (Enum: CASH, TRANSFER, nullable)
├─ transaction_date (DateTime)
├─ created_at (DateTime)
└─ updated_at (DateTime)

📦 receipts
├─ id (UUID, PK)
├─ receipt_type (Enum: RECEIPT, BUDGET, WARRANTY)
├─ receipt_number (String, unique)
├─ client_id (UUID, FK -> clients)
├─ vehicle_id (UUID, FK -> vehicles, nullable)
├─ procedure_id (UUID, FK -> procedures, nullable)
├─ amount (Decimal, nullable)
├─ description (Text)
├─ issue_date (DateTime)
├─ pdf_url (String, nullable)
├─ created_at (DateTime)
└─ updated_at (DateTime)

📦 price_history
├─ id (UUID, PK)
├─ procedure_type_id (UUID, FK -> procedure_types)
├─ price (Decimal)
├─ valid_from (DateTime)
├─ valid_to (DateTime, nullable)
├─ created_at (DateTime)
└─ updated_at (DateTime)

📦 procedure_alerts
├─ id (UUID, PK)
├─ vehicle_id (UUID, FK -> vehicles)
├─ procedure_id (UUID, FK -> procedures)
├─ alert_date (DateTime)
├─ expiration_date (DateTime)
├─ status (Enum: PENDING, NOTIFIED, COMPLETED)
├─ scraped_data (JSON, nullable) // Datos de ENARGAS
├─ created_at (DateTime)
└─ updated_at (DateTime)
```

### Relaciones Principales
- Un **cliente** puede tener múltiples **vehículos** (1:N)
- Un **vehículo** puede tener múltiples **trámites** (1:N)
- Un **trámite** pertenece a un **tipo de trámite** (N:1)
- Una **distribuidora** puede tener múltiples **transacciones** (1:N)
- Un **comprobante** puede estar vinculado a un **cliente**, **vehículo** y **trámite** (N:1)

---

## 🎨 Diseño de Interfaz (UI/UX)

### Principios de Diseño
1. **Simplicidad ante todo:** Interfaz intuitiva para usuarios no familiarizados con tecnología
2. **Botones grandes y claros:** Fácil navegación táctil
3. **Formularios sencillos:** Campos bien identificados con validación en tiempo real
4. **Feedback visual:** Confirmaciones, errores y estados claros
5. **Responsivo:** Funcional en desktop, tablet y móvil

### Componentes Clave
- 📋 **Dashboard principal:** Resumen de alertas, deudas y actividad reciente
- 🔍 **Buscadores inteligentes:** Por cliente, dominio, teléfono
- 📊 **Tablas ordenables:** Con paginación y filtros
- 📱 **Cards informativos:** Para cada cliente/vehículo
- 🖨️ **Vista previa de impresión:** Antes de generar PDFs

---

## 🚀 Plan de Implementación

### Fase 1 - MVP Core (2-3 semanas)
**Objetivo:** Base funcional del sistema

- [ ] Setup del proyecto (Next.js + TypeScript + Tailwind)
- [ ] Configuración de Supabase y Prisma
- [ ] Schema completo de base de datos
- [ ] Sistema de autenticación básico
- [ ] **Módulo de Clientes:**
  - CRUD completo (Crear, Leer, Actualizar, Eliminar)
  - Formularios de registro
  - Listado con búsqueda
- [ ] **Módulo de Vehículos:**
  - Vinculación con clientes
  - CRUD de vehículos
  - Vista de historial
- [ ] UI/UX con componentes shadcn/ui
- [ ] Diseño responsive

### Fase 2 - Gestión Financiera (1-2 semanas)
**Objetivo:** Control de distribuidoras y cuenta corriente

- [ ] **Módulo de Distribuidoras:**
  - CRUD de distribuidoras
  - Gestión de transacciones
- [ ] **Cuenta Corriente:**
  - Registro de compras e insumos
  - Registro de pagos
  - Cálculo automático de saldo
  - Historial de movimientos
- [ ] **Dashboard Financiero:**
  - Resumen de deudas por distribuidora
  - Gráficos de movimientos
  - Exportación de reportes

### Fase 3 - Alertas Inteligentes (2 semanas)
**Objetivo:** Sistema automático de vencimientos

- [ ] **Scraper de ENARGAS:**
  - Configuración de Puppeteer/Playwright
  - Scraping de datos por dominio
  - Manejo de errores y reintentos
- [ ] **Sistema de Alertas:**
  - Detección de vencimientos próximos
  - Verificación cruzada con BD
  - Listado mensual de clientes a notificar
- [ ] **Integración WhatsApp Web:**
  - Generación de enlaces wa.me
  - Plantillas de mensajes
  - Botón "Avisar" por cliente

### Fase 4 - Comprobantes (1 semana)
**Objetivo:** Generación de documentos imprimibles

- [ ] **Sistema de Numeración:**
  - Secuencias automáticas por tipo
  - Formato configurable
- [ ] **Generación de PDFs:**
  - Plantilla de recibos
  - Plantilla de presupuestos
  - Plantilla de garantías
- [ ] **Gestión de Comprobantes:**
  - Historial de documentos emitidos
  - Vista previa antes de imprimir
  - Descarga y reimpresión

### Fase 5 - PWA & Offline (1 semana)
**Objetivo:** App instalable con soporte sin conexión

- [ ] **Configuración PWA:**
  - Service Workers
  - Manifest.json
  - Íconos y splash screens
- [ ] **Soporte Offline:**
  - Caché de datos críticos
  - Sincronización automática
  - Indicadores de estado de conexión
- [ ] **Optimizaciones:**
  - Lazy loading de componentes
  - Compresión de assets
  - Performance monitoring

### Fase 6 - Testing & Deploy (1 semana)
**Objetivo:** Lanzamiento a producción

- [ ] Testing end-to-end
- [ ] Corrección de bugs
- [ ] Documentación de usuario final
- [ ] Deploy en Vercel
- [ ] Configuración de dominios
- [ ] Backup automático de BD

---

## 🔧 Configuración del Proyecto

### Variables de Entorno (.env)

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# Scraping
ENARGAS_URL="https://www.enargas.gob.ar/secciones/gas-natural-comprimido/consulta-dominio.php"
```

### Comandos Principales

```bash
# Instalación
npm install

# Desarrollo
npm run dev

# Build
npm run build

# Prisma
npx prisma generate        # Generar cliente Prisma
npx prisma migrate dev     # Crear migración
npx prisma studio          # Abrir GUI de BD

# Deploy
vercel --prod
```

---

## 📱 Progressive Web App (PWA)

### ¿Por qué PWA?

**Ventajas:**
- ✅ Instalable como app de escritorio
- ✅ Funciona offline con Service Workers
- ✅ Actualizaciones automáticas
- ✅ Un solo código para web y desktop
- ✅ Menor tamaño (1 MB vs 100-200 MB de Electron)
- ✅ Cross-platform (Windows, Mac, Linux)
- ✅ Sin distribución de instaladores

**Funcionamiento Offline:**
1. **Service Worker** cachea datos críticos
2. Cuando hay conexión: sincronización automática con Supabase
3. Sin conexión: se trabaja con datos locales (IndexedDB)
4. Al recuperar conexión: sync automático de cambios

**Instalación para el usuario:**
1. Abrir la web en Chrome/Edge
2. Click en ícono de "Instalar" en la barra de direcciones
3. La app aparece en el escritorio como programa normal
4. Se abre en ventana propia sin barra del navegador

---

## 🔍 Sistema de Scraping ENARGAS

### Flujo de Trabajo

```
1. Usuario solicita verificación de vencimientos
2. Sistema obtiene lista de dominios de la BD
3. Para cada dominio:
   a. Puppeteer abre página ENARGAS
   b. Completa formulario con dominio
   c. Extrae fecha de última oblea
   d. Calcula fecha de vencimiento
   e. Compara con BD local
4. Genera alertas para vencimientos próximos
5. Actualiza tabla procedure_alerts
```

### Implementación Técnica

```typescript
// Pseudocódigo del scraper
async function scrapeENARGAS(domain: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('https://www.enargas.gob.ar/...');
  await page.type('#dominio', domain);
  await page.click('#submit');
  await page.waitForSelector('.resultado');
  
  const lastObleaDate = await page.$eval('.fecha', el => el.textContent);
  
  await browser.close();
  
  return parseDate(lastObleaDate);
}
```

### Consideraciones
- ⚠️ Rate limiting: No sobrecargar el servidor
- ⚠️ Manejo de errores: Reintentos en caso de fallo
- ⚠️ Headless mode: No abrir navegador visible
- ⚠️ User-Agent: Simular navegador real

---

## 📄 Generación de Comprobantes

### Tipos de Documentos

#### 1. Recibo
- Número correlativo
- Datos del cliente
- Concepto y monto
- Fecha de emisión
- Firma/sello (opcional)

#### 2. Presupuesto
- Número correlativo
- Datos del cliente y vehículo
- Detalle de trabajos
- Precios por ítem
- Total estimado
- Validez del presupuesto

#### 3. Garantía
- Número correlativo
- Datos del cliente y vehículo
- Trabajo realizado
- Fecha de realización
- Período de garantía
- Condiciones

### Tecnología: react-pdf

```typescript
import { Document, Page, Text, View } from '@react-pdf/renderer';

const ReciboDocument = ({ data }) => (
  <Document>
    <Page size="A4">
      <View>
        <Text>Recibo N° {data.number}</Text>
        <Text>Cliente: {data.client}</Text>
        <Text>Monto: ${data.amount}</Text>
      </View>
    </Page>
  </Document>
);
```

---

## 📞 Integración con WhatsApp

### Método: WhatsApp Web Links

**Funcionamiento:**
- Se genera un enlace `wa.me` con mensaje pre-completado
- Al hacer click, abre WhatsApp Web o la app
- El usuario solo confirma el envío

**Ejemplo de implementación:**

```typescript
function generateWhatsAppLink(phone: string, message: string) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

// Uso
const message = `Hola ${client.name}, te recordamos que tu oblea vence el ${expirationDate}. ¡Agenda tu turno!`;
const link = generateWhatsAppLink(client.phone, message);
```

**Mejora futura (Fase 6+):**
- Integración con n8n para envío automático
- WhatsApp Business API para mensajes masivos
- Plantillas de mensajes personalizables

---

## 🔐 Seguridad

### Medidas Implementadas

1. **Autenticación:**
   - NextAuth.js con sesiones seguras
   - Hash de contraseñas con bcrypt
   - Tokens JWT

2. **Autorización:**
   - Middleware para proteger rutas
   - Validación de permisos por rol
   - RBAC (Role-Based Access Control)

3. **Base de Datos:**
   - Row Level Security (RLS) en Supabase
   - Queries parametrizadas (Prisma)
   - Backups automáticos

4. **API:**
   - Rate limiting
   - Validación de inputs con Zod
   - CORS configurado

5. **Frontend:**
   - HTTPS obligatorio en producción
   - CSP (Content Security Policy)
   - XSS protection

---

## 📈 Escalabilidad Futura

### Funcionalidades Planificadas

**Corto Plazo (3-6 meses):**
- [ ] Multi-usuario con roles diferenciados
- [ ] Dashboard con métricas y KPIs
- [ ] Exportación de reportes (Excel, PDF)
- [ ] Sistema de backup y restauración
- [ ] Modo oscuro

**Mediano Plazo (6-12 meses):**
- [ ] App móvil nativa (React Native)
- [ ] Integración con sistemas de facturación electrónica
- [ ] API pública para integraciones
- [ ] Notificaciones push
- [ ] Chat en vivo con clientes

**Largo Plazo (12+ meses):**
- [ ] Multi-tenant (varios talleres en una misma instancia)
- [ ] Marketplace de repuestos
- [ ] IA para predicción de demanda
- [ ] Integración con ERP/CRM
- [ ] White-label para comercialización

---

## 📚 Documentación Adicional

### Estructura del Repositorio

```
proyecto-taller-gnc/
├─ app/                    # Next.js App Router
│  ├─ (auth)/             # Rutas de autenticación
│  ├─ (dashboard)/        # Rutas principales
│  ├─ api/                # API Routes
│  └─ layout.tsx          # Layout principal
├─ components/            # Componentes React
│  ├─ ui/                 # shadcn/ui components
│  ├─ forms/              # Formularios
│  └─ tables/             # Tablas
├─ lib/                   # Utilidades
│  ├─ prisma.ts           # Cliente Prisma
│  ├─ auth.ts             # Configuración NextAuth
│  └─ utils.ts            # Helpers
├─ prisma/
│  ├─ schema.prisma       # Schema de BD
│  └─ migrations/         # Migraciones
├─ public/                # Assets estáticos
├─ scripts/               # Scripts de utilidad
│  ├─ scraper.ts          # Scraper ENARGAS
│  └─ seed.ts             # Seed de BD
├─ .env                   # Variables de entorno
├─ next.config.js         # Configuración Next.js
├─ package.json
├─ tsconfig.json
└─ README.md
```

### Guías de Referencia

1. **Para Desarrolladores:**
   - Convenciones de código
   - Guía de contribución
   - Testing guidelines

2. **Para Usuarios:**
   - Manual de uso
   - FAQ
   - Troubleshooting

3. **Para Deployment:**
   - Guía de instalación
   - Configuración de servidores
   - Backup y restauración


---

## 🤝 Consideraciones de Comercialización

### Preparación para el Mercado

**Ventajas competitivas:**
- ✅ Especializado en talleres de GNC
- ✅ Sistema de alertas automáticas (diferenciador clave)
- ✅ Interfaz ultra-simple para usuarios no técnicos
- ✅ Sin costos de infraestructura inicial (free tier)
- ✅ Escalable a multi-tenant

**Modelo de negocio potencial:**
- 💰 Suscripción mensual por taller
- 💰 Freemium (límite de clientes/vehículos)
- 💰 Licencia perpetua
- 💰 Comisión por transacción

**Requisitos para comercializar:**
- ✅ Documentación completa (en progreso)
- ✅ Versión multi-tenant
- ✅ Sistema de billing automatizado
- ✅ Soporte técnico definido
- ✅ Legal: términos de servicio, privacidad
- ✅ Marketing: landing page, demos, casos de éxito

---

## 📞 Contacto y Soporte

**Desarrollador:** [Tu nombre]
**Email:** [Tu email]
**Repositorio:** [URL del repo cuando esté disponible]

---

## 📝 Changelog

### v0.1.0 (Planificación)
- ✅ Definición de stack tecnológico
- ✅ Diseño de arquitectura de BD
- ✅ Planificación de fases de desarrollo
- ✅ Documentación inicial

---

**Última actualización:** Febrero 2026
**Estado del proyecto:** En planificación
**Próximo hito:** Fase 1 - MVP Core
---

## Avances recientes (21-02-2026)

### Frontend del menu principal
- Se implemento una nueva pantalla inicial en `app/page.tsx`.
- Se agrego una `sidebar` lateral con los mismos modulos principales del sistema.
- Se construyo una grilla de tarjetas grandes rectangulares para:
  - Clientes y Vehiculos
  - Tramites
  - Alertas Inteligentes
  - Distribuidoras
  - Comprobantes
  - Dashboard
- Se aplico enfoque responsive: en desktop se ve sidebar + panel; en mobile se adapta en columna.
- Se agregaron iconos, estados visuales por modulo y botones de ingreso.
- Se agregaron microanimaciones (entrada de tarjetas y hover).

### Diseno y estilos
- Se redefinio el look general en `app/globals.css`:
  - Fondo con gradientes
  - Paneles tipo glass
  - Tarjetas con sombras y transiciones
  - Utilidades CSS para tipografia display y animaciones
- Se actualizaron tipografias en `app/layout.tsx`:
  - Fuente base: `Sora`
  - Fuente de titulos: `Rajdhani`

### Ajustes tecnicos
- Se actualizaron metadatos base del layout principal.
- Se resolvio error de arranque por dependencia faltante:
  - Error detectado: `Cannot find module 'autoprefixer'`
  - Solucion aplicada: `npm install -D autoprefixer`
- Verificaciones ejecutadas:
  - `npm run lint` -> sin errores
  - `npm run build` -> compilacion correcta

### Comandos para ejecutar el frontend
```bash
npm run dev
```
URL local: `http://localhost:3000`

### Estado actual
- El menu principal ya esta listo como base visual navegable.
- Todavia no se conecto base de datos ni logica de negocio en esta pantalla.
- Siguiente paso sugerido: crear rutas reales por modulo (`/clientes`, `/tramites`, etc.) y arrancar el modulo de Clientes.

---

## Rutas y modulos implementados (21-02-2026)

### Objetivo
Se implemento la estructura inicial de navegacion para separar el sistema por modulos y dejar base lista para sumar logica y base de datos en cada seccion.

### Rutas creadas
- `/dashboard` -> Vista principal del sistema
- `/clientes` -> Gestion de clientes y vehiculos
- `/tramites` -> Gestion de tramites (oblea, prueba hidraulica, conversion, etc.)
- `/alertas` -> Control de vencimientos y notificaciones
- `/distribuidoras` -> Cuenta corriente, compras y pagos por distribuidora
- `/comprobantes` -> Recibos, presupuestos y garantias

### Archivos agregados
- `app/dashboard/page.tsx`
- `app/clientes/page.tsx`
- `app/tramites/page.tsx`
- `app/alertas/page.tsx`
- `app/distribuidoras/page.tsx`
- `app/comprobantes/page.tsx`

### Cambios de navegacion en menu principal
Archivo modificado: `app/page.tsx`

Cambios aplicados:
- Se agrego `href` en la configuracion de modulos.
- La sidebar lateral ahora usa `Link` y navega a rutas reales.
- El boton `Abrir modulo` de cada tarjeta dirige a su ruta correspondiente.
- El CTA `Nuevo tramite` navega a `/tramites`.

### Estado actual
- Todas las rutas existen y renderizan correctamente.
- Cada modulo tiene una pantalla placeholder funcional con boton para volver al menu principal.
- Aun no hay logica de negocio ni conexion a BD dentro de cada modulo.

### Verificacion tecnica
- `npm run lint` ejecutado sin errores luego de crear rutas y enlaces.

### Siguiente paso recomendado
- Crear un layout/plantilla compartida para las paginas de modulos (evitar duplicacion de estructura).
- Agregar indicador de modulo activo en sidebar segun la ruta actual.
- Empezar implementacion funcional por `clientes`.

---

## Bitacora de avances (21-02-2026 - Continuacion)

### 1) Conexion de datos: cambio de estrategia
Se reemplazo el acceso de runtime por Prisma/Postgres directo (que fallaba por DNS/puertos) por conexion HTTP usando Supabase JS en backend.

Cambios:
- Dependencia agregada: `@supabase/supabase-js`
- Cliente server creado: `lib/supabase-server.ts`
- Variables de entorno documentadas en `.env.example`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

Impacto:
- Las rutas API de la app ahora funcionan via HTTPS (443), evitando bloqueo de `5432/6543` en red local.

### 2) APIs migradas a Supabase
Se migraron de Prisma a Supabase estas rutas:
- `app/api/clientes/route.ts`
- `app/api/vehiculos/route.ts`

Y se agrego:
- `app/api/catalogos/route.ts` (tipos de tramite + distribuidoras)

Funcionalidad actual:
- `GET /api/clientes` con busqueda por nombre/apellido/telefono/dominio.
- `POST /api/clientes` crea cliente + vehiculo + tramite inicial.
- `POST /api/vehiculos` crea vehiculo para cliente existente.
- `GET /api/catalogos` entrega catalogos para combos.

### 3) Unificacion visual de modulos
Se implemento un shell compartido para que todos los modulos mantengan mismo dise�o y sidebar persistente.

Archivos:
- `components/layout/app-shell.tsx`
- `lib/modules.ts`

Aplicado en:
- `app/page.tsx`
- `app/dashboard/page.tsx`
- `app/clientes/page.tsx`
- `app/tramites/page.tsx`
- `app/alertas/page.tsx`
- `app/distribuidoras/page.tsx`
- `app/comprobantes/page.tsx`

Extras de UX:
- Sidebar activa segun ruta actual.
- Opcion `hideHeader` para ocultar encabezado en pantallas puntuales.

### 4) Ajustes de estilo global
- Se corrigieron variables base para tarjetas blancas en `app/globals.css`.
- Se agrego configuracion VS Code para evitar falsos errores de Tailwind:
  - `.vscode/settings.json`

### 5) Reorganizacion funcional entre modulos
Decision aplicada:
- `Clientes`: listado y filtros como foco principal.
- `Tramites`: altas operativas como foco principal.

#### Modulo Clientes
- Quedo como lista de clientes/vehiculos con filtro.
- Se agrego boton `Nuevo cliente` que abre modal unico de alta.
- El modal reutiliza el formulario de alta principal de tramites.

Archivo principal:
- `app/clientes/page.tsx`

#### Modulo Tramites
- Quedo como modulo principal de alta de tramite.
- Se elimino la tarjeta "Alta de vehiculo" por solicitud funcional.

Archivo principal:
- `app/tramites/page.tsx`

### 6) Alta de tramite: nuevos campos requeridos
Se extendio el formulario de alta para incluir:
- Tipo de tramite (combo)
- Distribuidora (seleccionable, obligatoria cuando aplica)
- Estado de pago (`pagado/no pagado`)
- Monto abonado
- Observacion
- Vehiculo obligatorio (marca/modelo/dominio)

Archivo:
- `components/modules/tramites/new-client-with-vehicle-form.tsx`

Validaciones de backend en `POST /api/clientes`:
- Tipo de tramite obligatorio.
- Distribuidora obligatoria para tipos que la requieren.
- Si `pagado = true`, `monto abonado > 0`.
- Si `pagado = false`, `monto abonado = 0`.
- Dominio unico de vehiculo.
- Vehiculo obligatorio.

### 7) SQL de catalogos y tramite de cliente
Se creo/actualizo script:
- `scripts/sql/2026-02-21_client_procedures_catalogs.sql`

Incluye:
- Tabla `procedure_types`
- Tabla `distributors`
- Tabla `client_procedures`
- Indices y triggers `updated_at`
- Seed de tipos de tramite:
  - Reparacion varia
  - Renovacion de oblea
  - Prueba hidraulica
  - Modificacion
  - Conversion
  - Desmontaje
- Nuevos campos de pago en `client_procedures`:
  - `paid` (boolean)
  - `amount_paid` (numeric)
- `ALTER TABLE ... IF NOT EXISTS` para aplicar cambios sin romper instancias ya creadas.

### 8) Estado tecnico de cierre del dia
Verificaciones realizadas en cada bloque de cambios:
- `npm run lint` -> OK
- `npm run build` -> OK

Observacion pendiente no bloqueante:
- Warnings de Next 15 sobre `metadata.viewport` y `metadata.themeColor` (no afectan funcionamiento).

### 9) Resultado funcional actual
- Navegacion modular estable con sidebar en todo el sistema.
- Modulo clientes enfocado en consulta/listado con alta por modal.
- Modulo tramites enfocado en la operacion de alta con reglas de negocio basicas.
- Backend conectado a Supabase por HTTP y funcionando con catalogos/tramites/clientes/vehiculos.

---

## Bitacora de avances (22-02-2026)

### 1) Modulo Tramites: redise�o funcional y visual
Se reestructuro el formulario principal de `Tramites` para reflejar el flujo operativo real del taller.

Cambios aplicados:
- Se oculto el encabezado superior del modulo (`hideHeader`).
- Se elimino el campo `email` del formulario de alta.
- Se reorganizo la UI por bloques:
  1. Datos del cliente
  2. Datos del vehiculo
  3. Datos del tramite
  4. Observaciones
- Se puso `tipo de tramite` y `distribuidora` en la misma fila.
- Se agregaron campos economicos separados:
  - `Total a pagar`
  - `Monto abonado`
- Vehiculo obligatorio en alta (marca/modelo/dominio requeridos).

Archivo principal:
- `components/modules/tramites/new-client-with-vehicle-form.tsx`

### 2) Reglas de negocio en tramites
Se implementaron reglas de autocompletado para `Total a pagar` segun tipo de tramite:
- `RENOVACION_OBLEA` -> 30000
- `PRUEBA_HIDRAULICA` -> 180000
- `REPARACION_VARIA` -> editable manualmente

Validaciones backend:
- `amountPaid <= totalAmount`
- Distribuidora obligatoria solo para tramites que la requieren
- Vehiculo obligatorio
- Dominio unico

Archivo backend:
- `app/api/clientes/route.ts`

### 3) Persistencia de montos de cobro
Se ajusto el registro de `client_procedures` para guardar:
- `paid`
- `total_amount`
- `amount_paid`

SQL actualizado:
- `scripts/sql/2026-02-21_client_procedures_catalogs.sql`

Incluye:
- columnas nuevas en creacion de tabla
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para entornos ya existentes

### 4) Modulo Clientes orientado a tramites masivos
Se transformo la vista de `/clientes` para operar sobre historico de tramites (escenario de 1600+ registros).

Cambios:
- Filtro por fecha (por defecto: hoy)
- Opcion `Ver todos`
- Busqueda por texto
- Paginacion
- Tabla simplificada con columnas:
  - Nombre
  - Apellido
  - Telefono
  - Marca
  - Modelo
  - Dominio
  - Tipo de tramite
  - Fecha de tramite
- Boton de contacto WhatsApp por fila:
  - `https://api.whatsapp.com/send?phone=549...`

Archivo principal:
- `app/clientes/page.tsx`

### 5) API nueva de tramites para filtros y paginacion
Se creo endpoint dedicado para consulta operacional de tramites:
- `GET /api/tramites`

Capacidades:
- filtros por `date`
- modo `all=1`
- paginacion (`page`, `pageSize`)
- busqueda por:
  - nombre/apellido/telefono
  - dominio
  - marca
  - modelo

Archivo:
- `app/api/tramites/route.ts`

### 6) Correcciones de errores en busqueda
Problema detectado:
- Error `PGRST100` por uso de `.or(...)` con campos embebidos (`clients.*`) en PostgREST.

Solucion aplicada:
- Se reemplazo por busqueda en 2 pasos:
  1. resolver `client_id` por `clients` y `vehicles`
  2. filtrar `client_procedures` con `in(client_id, ...)`

Adicional:
- Busqueda ahora case-insensitive consistente.
- Si hay texto en busqueda, se ignora filtro de fecha y busca sobre todo el historico.

### 7) Fix de validacion "Required"
Problema detectado en alta:
- Zod marcaba `vehicle.color` y `vehicle.notes` como `Required`.

Causa:
- uso incorrecto de `.required()` sobre objeto `vehicle`.

Fix:
- se elimino esa llamada para mantener `color/notes` opcionales.

### 8) Compatibilidad temporal por esquema incompleto en BD
Problema detectado:
- Error `PGRST204` por columna faltante (`amount_paid`) en cache/esquema.

Mitigacion aplicada:
- fallback en backend para insertar `client_procedures` sin columnas nuevas si no existen aun.

Nota:
- una vez migrada la BD completa, el fallback puede retirarse.

### 9) Migracion de 4000 registros desde CSV
Se definio y uso estrategia de carga por staging:
- `stg_clients`
- `stg_vehicles`
- `stg_client_procedures`

Luego se migran a tablas finales:
- `clients`
- `vehicles`
- `client_procedures`

Punto clave resuelto:
- Como `client_ref` no existe en tablas finales, se genero mapeo temporal `client_ref_map` para relacionar `client_ref -> client_id` real autogenerado por Supabase.

### 10) Ajustes visuales finales
- Se redujo sensacion de contenido "apretado a la derecha".
- Se amplio y redistribuyo espacio en shell/layout.
- Se centro el contenido del modulo clientes.
- Se ajusto ancho util de tabla y filtros.

Archivos de layout/UI tocados:
- `components/layout/app-shell.tsx`
- `app/clientes/page.tsx`
- `app/tramites/page.tsx`

### 11) Estado tecnico de cierre
Verificaciones ejecutadas repetidamente tras cambios:
- `npm run lint` -> OK
- `npm run build` -> OK

Pendiente no bloqueante:
- warnings de Next.js 15 por `metadata.viewport` y `metadata.themeColor` (no afectan operacion)
- falta de iconos del manifest (`icon-144x144.png`) en entorno local

### 12) Estado funcional actual
- Alta de tramite operativa con reglas de cobro.
- Listado de clientes/tramites operativo para volumen alto, con filtros y paginacion.
- Busqueda por persona/telefono/dominio/marca/modelo operativa.
- Contacto por WhatsApp operativo desde cada fila.
- Datos migrables desde CSV con estrategia de staging y mapeo de IDs.

---

## Modulo Alertas (Implementacion clave)

### Objetivo del modulo
El modulo `Alertas` es la funcionalidad central del sistema para recordar renovaciones de GNC.
Su foco operativo es identificar, verificar y notificar clientes cuyo tramite de:
- `RENOVACION_OBLEA`
- `PRUEBA_HIDRAULICA`
requiere contacto en el periodo actual, con verificacion externa via ENARGAS.

### Alcance implementado en esta fase
Se implemento un MVP funcional completo con:
1. Tabla operativa de alertas con filtros, estado y acciones.
2. Comprobacion masiva de vencimientos desde boton de UI.
3. Integracion de scraping ENARGAS por dominio.
4. Persistencia de estado por tramite (`pendiente / avisado / no corresponde`).
5. Accion de aviso por WhatsApp desde cada fila.

---

### Flujo funcional del modulo

#### 1) Carga inicial de alertas
La pantalla `app/alertas/page.tsx` consulta `GET /api/alertas` y muestra una tabla con:
- Datos del cliente y vehiculo
- Tipo de tramite
- Fecha del tramite interno
- Fecha obtenida desde ENARGAS
- Estado de alerta
- Boton de accion `Avisar`

#### 2) Filtros de trabajo
La vista soporta:
- Busqueda por persona, telefono, dominio, marca o modelo
- Filtro por mes via fecha
- Modo `Ver todos`
- Filtro por estado:
  - `PENDIENTE_DE_AVISAR`
  - `AVISADO`
  - `NO_CORRESPONDE_AVISAR`
- Paginacion

#### 3) Comprobacion de vencimientos
Boton: `Comprobar vencimientos`
- Ejecuta `POST /api/alertas/comprobar`
- Recorre los registros filtrados (oblea / PH)
- Obtiene dominio del cliente
- Consulta ENARGAS via scraping
- Compara mes/a�o de fecha ENARGAS contra mes/a�o del tramite interno
- Actualiza estado:
  - `PENDIENTE_DE_AVISAR` si coincide
  - `NO_CORRESPONDE_AVISAR` si no coincide
  - si ya estaba `AVISADO` y sigue correspondiendo, mantiene `AVISADO`

#### 4) Aviso al cliente
Boton por fila: `Avisar`
- Ejecuta `POST /api/alertas/avisar`
- Marca estado `AVISADO`
- Guarda `notified_at`
- Abre link de WhatsApp:
  - `https://api.whatsapp.com/send?phone=549...`

---

### Componentes tecnicos implementados

#### UI
- `app/alertas/page.tsx`
  - Tabla completa
  - Filtros
  - Paginacion
  - Botones de accion

#### APIs
- `app/api/alertas/route.ts`
  - listado + filtros + paginacion
- `app/api/alertas/comprobar/route.ts`
  - comprobacion masiva con scraping ENARGAS
- `app/api/alertas/avisar/route.ts`
  - actualizacion de estado a `AVISADO`

#### Servicio de scraping
- `lib/enargas-scraper.ts`
  - Playwright + Chromium
  - consulta por dominio en:
    - `https://www.enargas.gob.ar/secciones/gas-natural-comprimido/consulta-dominio.php`
  - extraccion de ultima fecha valida `dd/MM/yyyy`
  - helper de comparacion por mes/año

#### SQL de soporte
- `scripts/sql/2026-02-22_alertas_status.sql`
  - crea tabla `procedure_alert_status`
  - indices por `procedure_id` y `status`
  - trigger `updated_at`

---

### Modelo de estado de alertas
Tabla: `public.procedure_alert_status`

Campos clave:
- `procedure_id` (FK a `client_procedures`, unico)
- `status`:
  - `PENDIENTE_DE_AVISAR`
  - `AVISADO`
  - `NO_CORRESPONDE_AVISAR`
- `enargas_last_operation_date`
- `last_checked_at`
- `notified_at`
- `notes`

Observacion:
- el estado se desacopla del tramite para tener trazabilidad especifica de alerta.

---

### Reglas de negocio aplicadas en comprobacion

1. Se contemplan solo codigos:
- `RENOVACION_OBLEA`
- `PRUEBA_HIDRAULICA`

2. Comparacion temporal:
- Se compara mes y a�o (no dia) entre:
  - fecha interna del tramite
  - ultima fecha de operacion obtenida de ENARGAS

3. Resultado:
- Coincide mes/a�o -> `PENDIENTE_DE_AVISAR`
- No coincide -> `NO_CORRESPONDE_AVISAR`

4. Preservacion de estado avisado:
- Si un registro ya estaba `AVISADO` y sigue cumpliendo condicion, no se revierte.

5. Resguardo operativo:
- Limite de seguridad para scraping masivo en un solo disparo (`slice(0, 200)` dominios) para evitar sobrecarga accidental.

---

### Requisitos operativos para usar el modulo

1. Ejecutar SQL de estado:
- `scripts/sql/2026-02-22_alertas_status.sql`

2. Tener Playwright Chromium instalado localmente:
```bash
npx playwright install chromium
```

3. Variables Supabase configuradas:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

### Estado actual del modulo
- UI operativa: SI
- Filtros y paginacion: SI
- Estado por fila: SI
- Boton avisar + WhatsApp: SI
- Comprobacion ENARGAS automatica: SI
- Persistencia de resultado de comprobacion: SI

---

### Proximos pasos recomendados
1. Guardar historico de cada corrida de comprobacion (run_id, total evaluados, tiempo, errores).
2. Soporte de mensajes predefinidos de WhatsApp para alertas.
3. Cola/background job para comprobaciones largas.
4. Estrategia de reintentos por dominio con fallo transitorio.
5. Distincion visual entre alerta por Oblea y por PH con badges.

---

## Bitacora de avances (03-03-2026)

### 1) Avisos: re-avisar habilitado
- En la tabla de vencimientos, el boton `Avisar` ahora queda habilitado siempre que exista telefono.
- Ya no depende de que el estado sea `PENDIENTE_DE_AVISAR`.
- Archivo: `app/alertas/page.tsx`.

### 2) Retiro de tramites: acciones masivas
- Se agregaron checks por fila y seleccion total en la tabla.
- Se agregaron acciones masivas:
  - `Marcar recibidos (N)`
  - `Avisar seleccionados`
- Para aviso masivo se muestra confirmacion con `SweetAlert2` y luego se abren los chats de WhatsApp.
- Archivos:
  - `app/alertas/page.tsx`
  - `app/api/avisos/retiro/estado/route.ts`

### 3) Persistencia de estado en retiro
- Se mantiene el flujo de estados:
  - default: `PENDIENTE_RECEPCION`
  - al marcar recibido: `RECIBIDO`
  - al avisar: `AVISADO_RETIRO`
  - al retirar: `RETIRADO`
- Se agrego proteccion para no degradar un tramite ya `RETIRADO` a estados anteriores por error.
- El endpoint de estado ahora acepta `procedureId` o `procedureIds`.
- Archivo: `app/api/avisos/retiro/estado/route.ts`.

### 4) Filtro "Cargados ayer" corregido
- Se ajusto la logica para que tome el dia de carga anterior al ultimo dia con movimientos.
- Esto evita que en inicio de semana se mezclen resultados del dia actual.
- Archivo: `app/api/avisos/retiro/route.ts`.

### 5) Exportacion a Excel y PDF
- Se agrego exportacion en ambos bloques del modulo `Avisos`:
  - Vencimientos: Excel (CSV) y PDF
  - Retiro: Excel (CSV) y PDF
- Archivo: `app/alertas/page.tsx`.

### 6) Resumen de retirados/pendientes en navegacion
- Se agrego resumen visible sobre el modulo `Avisos` en sidebar:
  - `P`: pendientes de retiro
  - `R`: retirados
- Se actualiza periodicamente.
- Archivos:
  - `components/layout/app-shell.tsx`
  - `app/api/avisos/retiro/resumen/route.ts`

### 7) Permisos para mesa de entrada en retiro
- Se habilito acceso a endpoints de retiro para `MESA_ENTRADA`.
- Ahora puede operar marcado de estado en retiro sin quedar bloqueado por rol.
- Archivo: `middleware.ts`.

### 8) ENARGAS en deploy (Vercel)
- Problema detectado en produccion: Playwright no encontraba binario de Chromium.
- Evidencia en logs:
  - `browserType.launch: Executable doesn't exist...`
- Cambios aplicados:
  - Script post-instalacion:
    - `postinstall: playwright install chromium`
  - Flags de Chromium para entorno serverless:
    - `--no-sandbox`
    - `--disable-setuid-sandbox`
    - `--disable-dev-shm-usage`
- Archivos:
  - `package.json`
  - `lib/enargas-scraper.ts`

### 9) Configuracion obligatoria en Vercel
- Definir variable de entorno:
  - `PLAYWRIGHT_BROWSERS_PATH=0`
- Luego hacer redeploy para que se instale Chromium en build.

### 10) Deploy de codigo
- Commit subido a `main`:
  - `170e8d7`
- Incluye todos los cambios anteriores.

### 11) Script ENARGAS: migracion para deploy serverless (Vercel)

#### Problema detectado
- En local el scraping funcionaba correctamente.
- En deploy fallaba con error:
  - `Executable doesn't exist ... chromium_headless_shell ...`
- Causa: en funciones serverless no siempre existe el binario de Chromium en runtime, y depender de `playwright install` en build resulto inestable.

#### Solucion implementada
- Se migro el scraper a modo hibrido:
  - **Produccion (Vercel/AWS):**
    - `playwright-core` + `@sparticuz/chromium`
    - Usa binario compatible con Lambda/serverless sin depender de descarga manual en build.
  - **Local:**
    - Mantiene `playwright` para desarrollo normal.

Archivo modificado:
- `lib/enargas-scraper.ts`

Dependencias agregadas:
- `@sparticuz/chromium`
- `playwright-core`

Archivo modificado:
- `package.json`

#### Logica tecnica actual del scraper
1. Detecta entorno serverless con:
   - `process.env.VERCEL`
   - `process.env.AWS_EXECUTION_ENV`
2. Si es serverless:
   - importa `playwright-core`
   - obtiene executable path desde `@sparticuz/chromium`
   - lanza navegador con args/runtime de chromium serverless
3. Si no es serverless (local):
   - importa `playwright`
   - lanza Chromium local con flags de estabilidad
4. Continúa el mismo flujo de scraping ENARGAS:
   - abre consulta por dominio
   - extrae fechas
   - calcula y devuelve ultima operacion

#### Cambios de configuracion
- Se removio `postinstall: playwright install chromium` de `package.json`.
- Ya no se depende de descarga de browser durante el build para que funcione en Vercel.

#### Commit de este bloque
- Commit subido a `main`:
  - `731fc09`

### 12) Ajustes de Avisos + avance de Comprobantes (commit `19b75a8`)

#### Avisos: estado visual de envio
- Se unifico el comportamiento visual del boton `Avisar` para evitar confusion operativa.
- Cuando el aviso ya fue enviado:
  - En `Vencimientos` (`status = AVISADO`), el boton se muestra en verde y texto `Avisado`.
  - En `Retiro de tramites` (`status = AVISADO_RETIRO`), el boton tambien se muestra en verde y texto `Avisado`.
- Objetivo: identificar rapido que registros ya fueron notificados por WhatsApp.

Archivo:
- `app/alertas/page.tsx`

#### Comprobantes: primera version funcional
- Se reemplazo el placeholder de `Comprobantes` por una vista operativa con datos reales de tramites.
- Funcionalidades agregadas:
  - Busqueda por persona o dominio.
  - Filtro por estado:
    - `Todos`
    - `Retirados`
    - `Pendientes`
  - Contadores visibles:
    - total retirados
    - total pendientes
  - Tabla con columnas:
    - Cliente
    - Dominio
    - Vehiculo
    - Tramite
    - Fecha
    - Estado (`RETIRADO` / `PENDIENTE`)
- Fuente de datos:
  - reutiliza endpoint de retiros (`/api/avisos/retiro`) en modo `all` para trazabilidad de estado.

Archivo:
- `app/comprobantes/page.tsx`

#### Commit de este bloque
- Commit subido a `main`:
  - `19b75a8`

## 2026-03-16

### Cambios generales
- Se agrego campo **Descuento** en alta de tramites y se guarda como tag [DESC] en observaciones.
- Se agrego campo **Cantidad de tubos** para PH (tag [TUBOS]).
- Ajuste de filtros de retiro: opcion **Dia anterior** (fecha anterior real) en avisos de retiro.
- Formulario de edicion en Clientes ahora carga catalogos antes de abrir (muestra distribuidora y tipo).

### Configuracion de precios
- Nuevo modulo **Configuracion** para editar precios de Oblea y PH (se retiro del alta).
- Endpoint de precios ahora **update por code** (no upsert) para evitar errores de columnas NOT NULL.

### Distribuidoras / Cuenta corriente
- Nuevo modulo completo de Distribuidoras: listado, detalle y alta.
- Endpoints: /api/distribuidoras, /api/distribuidoras/[id], /api/distribuidoras/[id]/transactions.
- Tabla de transacciones con filtros, paginacion, totales y export Excel/PDF.
- Cards del listado con estilo blanco (igual al dashboard).
- En detalle: panel de distribuidora a la derecha, botones **Ingreso** (verde, flecha abajo) y **Pago** (rojo, flecha arriba).

### Compatibilidad DB actual
- Se ajustaron endpoints y formularios de distribuidoras para usar solo 
ame y phone cuando faltan columnas opcionales.

