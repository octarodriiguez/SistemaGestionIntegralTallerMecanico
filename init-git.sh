#!/bin/bash

# Script de inicialización del repositorio Git

echo "🚀 Inicializando repositorio Git..."

# Inicializar Git
git init

# Agregar todos los archivos
git add .

# Primer commit
git commit -m "🎉 Initial commit - Configuración del proyecto Taller GNC

- Setup de Next.js 15 con TypeScript
- Configuración de Tailwind CSS y shadcn/ui
- Estructura de carpetas completa
- Archivos de configuración (Prisma, ESLint, etc.)
- Documentación inicial (README, SETUP, DOCUMENTACION)
- Componentes UI base (Button, Card)
- Utilidades y constantes
- Configuración PWA básica

Fase 0 completada ✅"

echo "✅ Repositorio Git inicializado correctamente"
echo ""
echo "📋 Próximos pasos:"
echo "1. Crear repositorio en GitHub"
echo "2. git remote add origin <tu-repo-url>"
echo "3. git push -u origin main"
echo ""
echo "O si quieres crear una nueva rama:"
echo "git checkout -b develop"
