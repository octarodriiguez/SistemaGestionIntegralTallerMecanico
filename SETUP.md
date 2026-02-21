# Guía de Instalación

## 🚀 Setup Completo del Proyecto

### 1. Configuración de Supabase

1. Crear cuenta en [https://supabase.com](https://supabase.com)
2. Crear nuevo proyecto
3. Ir a Settings > Database
4. Copiar la "Connection string" (URI)
5. Reemplazar `[YOUR-PASSWORD]` con tu password

```
postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

### 2. Configuración de Variables de Entorno

Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

Completa las siguientes variables:

```env
# Database - Pega tu connection string de Supabase
DATABASE_URL="postgresql://postgres:..."

# NextAuth - Genera un secret
NEXTAUTH_SECRET="genera con: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Instalación de Dependencias

```bash
npm install
```

### 4. Configuración de Base de Datos

```bash
# Generar cliente de Prisma
npm run db:generate

# Crear tablas en la base de datos
npm run db:push

# O si prefieres usar migraciones:
npm run db:migrate
```

### 5. Iniciar Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 🔧 Comandos Útiles

### Base de Datos

```bash
# Ver base de datos en interfaz gráfica
npm run db:studio

# Crear una nueva migración
npm run db:migrate

# Resetear base de datos (¡cuidado en producción!)
npx prisma migrate reset

# Cargar datos de prueba
npm run db:seed
```

### Desarrollo

```bash
# Modo desarrollo con hot-reload
npm run dev

# Build de producción
npm run build

# Ejecutar build de producción
npm run start

# Verificar código con ESLint
npm run lint
```

## 📦 Deploy en Vercel

### Opción 1: Deploy desde GitHub

1. Push tu código a GitHub
2. Ir a [vercel.com](https://vercel.com)
3. Import repository
4. Configurar variables de entorno
5. Deploy

### Opción 2: Deploy desde CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy a producción
vercel --prod
```

### Variables de Entorno en Vercel

Agregar en Vercel Dashboard > Settings > Environment Variables:

```
DATABASE_URL=tu_url_de_supabase
NEXTAUTH_SECRET=tu_secret
NEXTAUTH_URL=https://tu-dominio.vercel.app
```

## 🐛 Troubleshooting

### Error: Prisma Client no generado

```bash
npm run db:generate
```

### Error: No puede conectar a la base de datos

1. Verificar que `DATABASE_URL` esté correcto en `.env`
2. Verificar que el proyecto de Supabase esté activo
3. Verificar que la IP esté permitida (Supabase permite todas por defecto)

### Error: Módulo no encontrado

```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 ocupado

```bash
# Usar otro puerto
PORT=3001 npm run dev
```

## 📚 Recursos

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

## ❓ Necesitas Ayuda?

Revisa la documentación completa en `DOCUMENTACION_PROYECTO.md`
