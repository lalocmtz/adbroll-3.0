# 📋 adbroll Implementation Tasks

**Source of Truth:** This document tracks all implementation tasks in execution order.
**Instructions:** Mark tasks as `[x]` when completed. Add notes/blockers inline.

---

## ✅ MVP COMPLETADO - Diciembre 2024

### Resumen del MVP Funcional

El MVP de AdBroll está 100% funcional con las siguientes características:

---

## 🎯 ESTRUCTURA FINAL

### Menú Principal
- [x] **Videos** (`/app`) - Top 100 videos ordenados por ingresos
- [x] **Productos** (`/products`) - Top 20 productos con CRUD manual
- [x] **Creadores** (`/creadores`) - Top 100 creadores importados

### Panel Admin (Oculto)
- [x] **Importación** (`/admin/import`) - Carga de archivos .xlsx

---

## 🆕 NUEVA ARQUITECTURA MP4 - Diciembre 2024

### Cambio de arquitectura: URLs TikTok → Videos MP4 reales

- [x] Migración de base de datos con nuevas columnas:
  - `video_mp4_url` - URL del video en Supabase Storage
  - `thumbnail_url` - URL del thumbnail
  - `duration` - Duración del video
  - `transcript` - Transcripción del audio
  - `analysis_json` - Análisis estructurado (hook/body/cta)
  - `variants_json` - Variantes IA generadas
  - `processing_status` - Estado del procesamiento

- [x] Storage buckets creados:
  - `/videos/*` - Videos MP4 públicos
  - `/thumbnails/*` - Thumbnails públicos

- [x] Edge functions nuevas:
  - `download-tiktok-video` - Descarga MP4 via RapidAPI TikTok Downloader
  - `transcribe-and-analyze` - Transcribe con AssemblyAI + analiza con OpenAI

- [x] Nuevo frontend estilo ViralViews:
  - `VideoCardNew.tsx` - Tarjetas con hover-autoplay
  - `VideoAnalysisModalNew.tsx` - Modal con 3 pestañas (Script, Análisis, Variantes)
  - `useAnalyzeVideo.ts` - Hook para manejo del flujo completo

### Flujo nuevo:
1. **Importación Kalodata** → Descarga automática de MP4s en background
2. Usuario hace click en "Analizar guión"
3. Si no hay MP4 → descarga via RapidAPI → guarda en Storage
4. Transcribe con AssemblyAI
5. Analiza con OpenAI (hook/body/cta + variantes)
6. Muestra resultados en modal

### Descarga automática al importar (Diciembre 2024):
- [x] Al importar videos desde Kalodata, se descargan automáticamente los MP4
- [x] Usa EdgeRuntime.waitUntil() para procesamiento en background
- [x] 2 segundos de delay entre descargas para evitar rate limits
- [x] Actualiza processing_status: pending → downloaded

### API Keys requeridas:
- `RAPIDAPI_KEY` - Para descargar videos de TikTok
- `ASSEMBLYAI_API_KEY` - Para transcripción de audio
- `OPENAI_API_KEY` - Para análisis y generación de variantes

---

## 📺 SECCIÓN VIDEOS - COMPLETADO

- [x] Mostrar 100 videos ordenados por ingresos (desc)
- [x] Tarjetas con hover-autoplay de videos MP4
- [x] Overlay con métricas al hacer hover
- [x] Filtros por categoría
- [x] Ordenamiento por ingresos/ventas
- [x] Paginación funcional
- [x] Modal de análisis con 3 pestañas:
  - Script (transcripción completa)
  - Análisis (Hook, Cuerpo, CTA)
  - Variantes IA (3 hooks + variante del cuerpo)

---

## 🛍 SECCIÓN PRODUCTOS - COMPLETADO

- [x] Mostrar Top 20 productos
- [x] Cada tarjeta muestra: Imagen, Nombre, Precio, Comisión %, Categoría
- [x] Link al producto externo
- [x] CRUD manual (solo founder)

---

## 👤 SECCIÓN CREADORES - COMPLETADO

- [x] Mostrar Top 50 creadores importados
- [x] Sistema de filtros
- [x] Ordenamiento instantáneo

---

## ⚙️ PANEL ADMIN - COMPLETADO

- [x] Ruta oculta: `/admin/import`
- [x] Solo accesible por usuarios con rol "founder"
- [x] Importación de 3 archivos

---

## 🔌 FUNCIONALIDAD IA - COMPLETADO

- [x] Transcripción automática con AssemblyAI
- [x] Análisis de secciones (Hook, Cuerpo, CTA) con OpenAI
- [x] Generación de variantes IA
- [x] Sistema de caché (si ya existe transcript, no re-procesa)

---

## 📁 ARCHIVOS CLAVE

```
src/
├── App.tsx
├── components/
│   ├── DashboardNav.tsx
│   ├── VideoCardNew.tsx          # Nueva tarjeta con hover-autoplay
│   ├── VideoAnalysisModalNew.tsx # Nuevo modal de análisis
│   └── ProductCard.tsx
├── hooks/
│   └── useAnalyzeVideo.ts        # Hook para flujo de análisis
├── pages/
│   ├── Dashboard.tsx             # /app - Videos
│   ├── Products.tsx
│   ├── Creators.tsx
│   └── Admin.tsx
supabase/
└── functions/
    ├── download-tiktok-video/    # Descarga MP4 via RapidAPI
    ├── transcribe-and-analyze/   # AssemblyAI + OpenAI
    └── ...
```

---

**Última actualización:** Diciembre 2024
**Estado:** MVP 100% Funcional con arquitectura MP4
