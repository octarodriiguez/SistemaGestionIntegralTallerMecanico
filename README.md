# 🔧 Sistema de Gestión para Talleres de GNC

Sistema web progresivo (PWA) para la gestión integral de talleres mecánicos especializados en Gas Natural Comprimido (GNC).

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ instalado
- PostgreSQL (o cuenta de Supabase)
- Git

### Instalación

1. **Clonar el repositorio**
```bash
git clone <tu-repo-url>
cd taller-gnc-system
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:
- `DATABASE_URL`: URL de conexión a PostgreSQL/Supabase
- `NEXTAUTH_SECRET`: Genera uno con `openssl rand -base64 32`

4. **Configurar base de datos**
```bash
# Generar cliente Prisma
npm run db:generate

# Ejecutar migraciones
npm run db:migrate

# (Opcional) Cargar datos de prueba
npm run db:seed
```

5. **Iniciar servidor de desarrollo**
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
taller-gnc-system/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Rutas de autenticación
│   ├── (dashboard)/         # Rutas principales protegidas
│   ├── api/                 # API Routes
│   ├── globals.css          # Estilos globales
│   ├── layout.tsx           # Layout root
│   └── page.tsx             # Página principal
├── components/              # Componentes React
│   ├── ui/                  # Componentes shadcn/ui
│   ├── forms/               # Formularios reutilizables
│   ├── tables/              # Componentes de tablas
│   └── layouts/             # Layouts compartidos
├── lib/                     # Utilidades y configuración
│   ├── actions/             # Server Actions
│   ├── hooks/               # Custom React Hooks
│   └── utils.ts             # Funciones auxiliares
├── prisma/                  # Configuración Prisma
│   ├── schema.prisma        # Schema de base de datos
│   ├── migrations/          # Migraciones
│   └── seeds/               # Scripts de seed
├── public/                  # Assets estáticos
│   ├── icons/               # Íconos de la app
│   └── images/              # Imágenes
├── scripts/                 # Scripts de utilidad
└── DOCUMENTACION_PROYECTO.md # Documentación completa
```

## 🛠️ Stack Tecnológico

- **Frontend:** Next.js 15, React 19, TypeScript
- **Estilos:** Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes
- **Base de Datos:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Autenticación:** NextAuth.js v5
- **Validación:** Zod + React Hook Form
- **Estado:** Zustand
- **Deploy:** Vercel

## 📦 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Ejecutar build
npm run lint         # Linter ESLint

# Prisma
npm run db:generate  # Generar cliente Prisma
npm run db:push      # Push schema a BD (dev)
npm run db:migrate   # Crear migración
npm run db:studio    # Abrir Prisma Studio
npm run db:seed      # Seed de datos
```

## 🎯 Roadmap de Desarrollo

### ✅ Fase 0: Setup Inicial (Completado)
- [x] Configuración del proyecto
- [x] Estructura de carpetas
- [x] Configuración de Tailwind
- [x] Componentes UI base

### 🚧 Fase 1: MVP Core (En Progreso)
- [ ] Schema completo de base de datos
- [ ] Módulo de Clientes (CRUD)
- [ ] Módulo de Vehículos
- [ ] Sistema de autenticación
- [ ] Dashboard básico

### 📋 Fase 2: Gestión Financiera
- [ ] Módulo de Distribuidoras
- [ ] Cuenta corriente
- [ ] Reportes financieros

### 🔔 Fase 3: Alertas Inteligentes
- [ ] Scraper ENARGAS
- [ ] Sistema de alertas de vencimientos
- [ ] Integración WhatsApp

### 📄 Fase 4: Comprobantes
- [ ] Generación de PDFs
- [ ] Numeración automática
- [ ] Templates personalizables

### 📱 Fase 5: PWA & Offline
- [ ] Service Workers
- [ ] Soporte offline
- [ ] Instalación como app

## 📖 Documentación

La documentación completa del proyecto se encuentra en:
- **[DOCUMENTACION_PROYECTO.md](./DOCUMENTACION_PROYECTO.md)** - Arquitectura, diseño y decisiones técnicas
- **[PRISMA_GUIDE.md](./PRISMA_GUIDE.md)** - Guía completa de base de datos con Prisma
- **[DATABASE_ERD.md](./DATABASE_ERD.md)** - Diagrama de entidad-relación y estructura
- **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** - Configuración paso a paso de la base de datos
- **[SETUP.md](./SETUP.md)** - Guía detallada de instalación paso a paso

## 🤝 Contribución

Este es un proyecto privado en desarrollo. Para consultas contactar al desarrollador principal.

## 📝 Licencia

Privado - Todos los derechos reservados

## 📧 Contacto

Para consultas sobre el proyecto, contactar al equipo de desarrollo.

---

**Versión:** 0.1.0  
**Estado:** En desarrollo - Fase 1  
**Última actualización:** Febrero 2026
