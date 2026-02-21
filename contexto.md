# 📋 Sistema de Gestión para Talleres de GNC - Resumen Ejecutivo

## 📌 Información General del Proyecto

### Descripción
Sistema web progresivo (PWA) diseñado específicamente para la gestión integral de talleres mecánicos especializados en Gas Natural Comprimido (GNC). El sistema reemplaza la gestión manual mediante planillas de Excel con una solución moderna, escalable y fácil de usar.

### Objetivo Principal
Digitalizar y automatizar la gestión completa de un taller de GNC, incluyendo:
- Clientes y vehículos
- Trámites y renovación de obleas
- Control de vencimientos con alertas automáticas
- Cuenta corriente con distribuidoras
- Generación de comprobantes

### Cliente/Usuario Objetivo
- **Usuario principal:** Taller de GNC en Cosquín, Córdoba, Argentina
- **Perfil de usuario:** Propietario/administrador con conocimientos básicos de tecnología
- **Necesidad:** Interfaz intuitiva, botones grandes, fácil de usar para personas no familiarizadas con tecnología

---

## 🎯 Problema que Resuelve

### Situación Actual (Antes)
El taller gestiona todo mediante múltiples planillas de Excel:

1. **Planilla de Clientes:**
   - Nombre, apellido, teléfono
   - Datos del vehículo (marca, modelo, dominio)
   - Tipo de trámite (oblea, conversión, etc.)
   - Distribuidora encargada
   - Estado de pago

2. **Planilla de Distribuidoras:**
   - Control de insumos comprados
   - Precios y cantidades
   - Pagos realizados (efectivo/transferencia)
   - Cálculo de deuda a cuenta corriente

3. **Planilla de Comprobantes:**
   - Recibos
   - Presupuestos
   - Planillas de garantía

### Problemas de la Situación Actual
- ❌ Datos dispersos en múltiples archivos
- ❌ Sin alertas automáticas de vencimientos
- ❌ Difícil búsqueda de información
- ❌ Riesgo de pérdida de datos
- ❌ No hay historial completo por vehículo
- ❌ Cálculos manuales propensos a errores
- ❌ Sin integración con sistemas externos

---

## ✨ Solución Propuesta

### Funcionalidades Principales

#### 1. Módulo de Clientes y Vehículos
- ✅ Registro completo de clientes con datos de contacto
- ✅ Vinculación de múltiples vehículos por cliente
- ✅ Historial completo de trámites por vehículo
- ✅ Búsqueda rápida por nombre, teléfono o dominio

#### 2. Módulo de Trámites
Tipos de trámites soportados:
- **Oblea** (renovación periódica 6-12 meses)
- **Prueba Hidráulica**
- **Conversión a GNC**
- **Modificación**
- **Desmontaje**

Características:
- ✅ Registro de fecha de realización y vencimiento
- ✅ Control de estado de pago
- ✅ Vinculación con distribuidora encargada
- ✅ Historial de precios

#### 3. Sistema de Alertas Inteligentes ⭐ (Funcionalidad Estrella)
- 🤖 **Scraping automático** de la página de ENARGAS
- 📅 **Detección automática** de vencimientos próximos (30 días antes)
- 🔔 **Alertas mensuales** con listado de clientes a notificar
- 📱 **Integración con WhatsApp Web** para envío de recordatorios
- ✅ **Verificación cruzada** entre ENARGAS y base de datos local

#### 4. Módulo de Distribuidoras
- ✅ Gestión de 2-5 distribuidoras simultáneas
- ✅ Registro de compras de insumos (descripción, precio, cantidad)
- ✅ Control de pagos (efectivo/transferencia)
- ✅ **Cálculo automático de deuda** actual
- ✅ Historial completo de movimientos

#### 5. Módulo de Comprobantes
Generación de documentos profesionales:
- **Recibos** (con numeración correlativa)
- **Presupuestos** (con fecha de validez)
- **Planillas de Garantía**

Características:
- ✅ Numeración automática por tipo
- ✅ Generación de PDFs imprimibles (A4)
- ✅ Plantillas personalizables
- ✅ Historial de comprobantes emitidos

#### 6. Dashboard Principal
- 📊 Vista rápida de alertas pendientes
- 💰 Resumen de deudas con distribuidoras
- 📈 Actividad reciente
- 🔍 Acceso rápido a búsquedas

---

## 🏗️ Arquitectura Técnica

### Stack Tecnológico Seleccionado

#### Frontend
- **Framework:** Next.js 15.1.6 (App Router)
- **Lenguaje:** TypeScript 5
- **Estilos:** Tailwind CSS 3.4
- **Componentes UI:** shadcn/ui (Radix UI)
- **Iconos:** Lucide React

#### Backend
- **API:** Next.js API Routes (integrado)
- **Autenticación:** NextAuth.js v5

#### Base de Datos
- **Motor:** PostgreSQL (via Supabase)
- **ORM:** Prisma 5.22
- **Validación:** Zod
- **Formularios:** React Hook Form

#### Librerías Complementarias
- **Estado Global:** Zustand
- **Notificaciones:** React Hot Toast
- **Tablas:** TanStack Table
- **PDFs:** @react-pdf/renderer
- **Scraping:** Playwright
- **Fechas:** date-fns
- **Seguridad:** bcrypt

#### Deployment
- **Hosting:** Vercel
- **Tipo:** Progressive Web App (PWA)
- **Soporte Offline:** Service Workers

### ¿Por qué PWA en lugar de Desktop App?

**Ventajas de PWA:**
- ✅ Instalable como app de escritorio
- ✅ Funciona offline con Service Workers
- ✅ Actualizaciones automáticas (sin reinstalar)
- ✅ Un solo código para web y desktop
- ✅ Tamaño pequeño (1 MB vs 100-200 MB de Electron)
- ✅ Cross-platform (Windows, Mac, Linux)
- ✅ Accesible desde cualquier dispositivo con navegador

**Decisión técnica:**
Se descartó Electron por ser innecesariamente pesado para este caso de uso. PWA ofrece todas las ventajas necesarias con menor complejidad.

---

## 📊 Modelo de Datos (Base de Datos)

### Estructura de Tablas (11 modelos principales)

#### 1. **users** - Usuarios del Sistema