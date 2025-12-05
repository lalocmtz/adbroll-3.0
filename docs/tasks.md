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

## 🆕 BACKEND RELACIONAL + IMPORTACIÓN INTELIGENTE - Diciembre 2024

### Cambio de arquitectura: DELETE + INSERT → UPSERT Inteligente

- [x] Migración de base de datos con índices:
  - `products_producto_nombre_idx` - Índice en nombre de producto
  - `creators_creator_handle_idx` - Índice en handle de creador
  - `videos_product_id_idx` - Índice en product_id
  - `videos_creator_handle_idx` - Índice en creator_handle
  - `videos_video_url_idx` - Índice en video_url
  - `videos_creator_id_idx` - Índice en creator_id (FK)

- [x] Nueva columna `creator_id` en videos para relación con creadores

- [x] Edge functions actualizadas con lógica UPSERT:
  - `process-kalodata-products` - Busca por name, actualiza si existe
  - `process-kalodata-creators` - Busca por handle, actualiza si existe
  - `process-kalodata` - Busca por video_url, actualiza métricas + mapea creator_id

### Comportamiento de importación inteligente:
✔ Si el producto ya existe → actualizar métricas (gmv, price, image)
✔ Si el creador ya existe → actualizar followers/avatar
✔ Si el video ya existe → actualizar métricas pero NO re-descargar MP4
✔ Si el producto cambió → re-mapeo automático product_id
✔ Si el creador cambió → re-mapeo automático creator_id
✔ Si es nuevo → crear + descargar mp4
✔ Nada se borra
✔ Nada se duplica

### Frontend con JOINs:
- [x] Dashboard usa JOIN para obtener datos de producto
- [x] VideoCard muestra imagen y GMV del producto asociado
- [x] Navegación cruzada: Video → Producto, Producto → Videos, Creador → Videos

---

## 🔗 NAVEGACIÓN BIDIRECCIONAL COMPLETA - Diciembre 2024

### Nuevas rutas implementadas:
- [x] `/videos/product/:productId` - Videos de un producto específico
- [x] `/videos/creator/:creatorId` - Videos de un creador específico

### Páginas de detalle:
- [x] **RelatedVideos** actualizada con DashboardLayout integrado
- [x] Header compacto con imagen, nombre, GMV y badge de ranking
- [x] Grid de videos con filtros y paginación
- [x] Navegación cruzada completa

### Video Card mejorada:
- [x] Producto asociado clickeable con imagen y GMV
- [x] Badge "Ver producto →" en tarjeta de video
- [x] Mensaje "Sin producto asignado" cuando no hay producto
- [x] Click navega a `/videos/product/:id`

### Creadores simplificados:
- [x] Solo 2 botones: "Ver videos" y "TikTok"
- [x] Eliminado botón "Productos" (simplificación)
- [x] "Ver videos" navega a `/videos/creator/:id`

### Productos actualizados:
- [x] Botón "Ver videos" navega a `/videos/product/:id`
- [x] Ruta correcta en lugar de query params

---

## 📺 SECCIÓN VIDEOS - COMPLETADO

- [x] Mostrar 100 videos ordenados por ingresos (desc)
- [x] Tarjetas con hover-autoplay de videos MP4
- [x] Grid 4 columnas limpio sin métricas duplicadas
- [x] Filtros por categoría
- [x] Ordenamiento por ingresos/ventas/vistas/ganancias
- [x] Paginación funcional
- [x] Sistema de favoritos por usuario (tabla favorites_videos)
- [x] Check de favorito al montar componente
- [x] Producto asociado clickeable en tarjeta con imagen y GMV
- [x] Modal de análisis con 3 pestañas:
  - Script (transcripción completa con botón copiar)
  - Análisis (Hook, Cuerpo, CTA con colores distintivos)
  - Variantes IA (3 variantes completas: hook + cuerpo + CTA)
- [x] Métricas en modal: Ingresos, Ventas, Comisión, Vistas
- [x] Favoritos persistentes en modal

---

## 🛍 SECCIÓN PRODUCTOS - COMPLETADO (FASE 2)

- [x] Mostrar todos los productos con paginación (20 por página)
- [x] Cada tarjeta muestra: Imagen, Nombre, Precio, Comisión %, Categoría
- [x] Link al producto externo (TikTok Shop)
- [x] Sistema de favoritos por usuario
- [x] Badge de ranking (#1, #2, etc.) con 🔥 para top 5
- [x] Métricas: Ingresos 30D, Ventas 30D, Precio, Comisión
- [x] Botón "Ver videos" → navega a `/videos/product/:id`
- [x] UI alineada con tarjetas de videos (misma estética)

---

## 👤 SECCIÓN CREADORES - COMPLETADO (FASE 2)

- [x] Mostrar Top 50 creadores importados
- [x] Sistema de filtros (pills)
- [x] Ordenamiento instantáneo
- [x] Sistema de favoritos por usuario (tabla `favorites`)
- [x] Badge de ranking con 🔥 para top 5
- [x] Botón "Ver videos" → navega a `/videos/creator/:id`
- [x] Botón "TikTok" → abre perfil externo
- [x] UI simplificada (solo 2 botones por tarjeta)

---

## 💖 SISTEMA DE FAVORITOS - COMPLETADO (FASE 2)

- [x] Videos: tabla `favorites_videos` (video_url, video_data)
- [x] Productos: tabla `favorites_products` (product_id, product_data)
- [x] Creadores: tabla `favorites` genérica (item_type="creator", item_id)
- [x] FavoriteButton componente reutilizable para los 3 tipos
- [x] Check de favorito al montar componente
- [x] Toggle sin recargar página

---

## 🔗 NAVEGACIÓN CRUZADA - COMPLETADO (FASE 3)

- [x] Producto → Videos (`/videos/product/:id`)
- [x] Creador → Videos (`/videos/creator/:id`)
- [x] Video → Producto (click en mini card → `/videos/product/:id`)
- [x] RelatedVideos con DashboardLayout, filtros y paginación
- [x] Header compacto con info de entidad (imagen, nombre, GMV)

---

## ⚙️ PANEL ADMIN - COMPLETADO

- [x] Ruta oculta: `/admin/import`
- [x] Solo accesible por usuarios con rol "founder"
- [x] Importación de 3 archivos con UPSERT inteligente

---

## 🔌 FUNCIONALIDAD IA - COMPLETADO

- [x] Transcripción automática con AssemblyAI
- [x] Análisis de secciones (Hook, Cuerpo, CTA) con OpenAI
- [x] Generación de variantes IA
- [x] Sistema de caché (si ya existe transcript, no re-procesa)

---

## 🎨 FASE 1 - LAYOUT GLOBAL - COMPLETADO

- [x] DashboardLayout con sidebar fija + header universal
- [x] Sidebar con navegación: Videos, Productos, Creadores, Favoritos, Tools, Settings
- [x] Tarjeta de suscripción "AdBroll Pro – $25/mes"
- [x] Tarjeta de usuario con modal de cuenta
- [x] Header con selectores de idioma (ES/EN) y moneda (MXN/USD)
- [x] Responsive: sidebar fija en desktop, drawer en mobile

---

## 🎨 FASE 2 - REDISEÑO VISUAL - COMPLETADO

- [x] Reducción de top padding a 20-28px
- [x] Subtítulo minimal "📊 Datos actualizados – últimos 30 días"
- [x] Sistema unificado de FilterPills
- [x] Paginación compacta (32px circular buttons)
- [x] Reducción de gap entre cards (gap-3)
- [x] Layout uniforme: subtítulo → pills → grid → paginación

---

## 📁 ARCHIVOS CLAVE

```
src/
├── App.tsx
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx
│   │   ├── DashboardSidebar.tsx
│   │   └── DashboardHeader.tsx
│   ├── VideoCardOriginal.tsx      # Tarjeta con producto + badge
│   ├── VideoAnalysisModalOriginal.tsx
│   ├── FilterPills.tsx
│   ├── CompactPagination.tsx
│   └── ProductCard.tsx
├── hooks/
│   └── useAnalyzeVideo.ts
├── pages/
│   ├── Dashboard.tsx              # /app - Videos con JOIN productos
│   ├── Products.tsx               # Ver videos → /videos/product/:id
│   ├── Creators.tsx               # Ver videos → /videos/creator/:id
│   ├── RelatedVideos.tsx          # /videos/product/:id y /videos/creator/:id
│   ├── Favorites.tsx
│   ├── Tools.tsx
│   ├── Settings.tsx
│   └── Admin.tsx
supabase/
└── functions/
    ├── process-kalodata/          # UPSERT videos + mapeo creator_id
    ├── process-kalodata-products/ # UPSERT productos
    ├── process-kalodata-creators/ # UPSERT creadores
    ├── download-tiktok-video/
    ├── transcribe-and-analyze/
    └── auto-match-videos-products/
```

---

## 📊 ESQUEMA DE BASE DE DATOS

### products
- id (uuid, PK)
- producto_nombre (text, indexed)
- imagen_url (text)
- producto_url (text)
- categoria (text)
- precio_mxn (numeric)
- price (numeric)
- commission (numeric)
- commission_amount (numeric)
- revenue_30d (numeric)
- total_ingresos_mxn (numeric)
- sales_7d (integer)
- total_ventas (integer)
- creators_count (integer)
- rating (numeric)
- rank (integer)
- created_at, updated_at

### creators
- id (uuid, PK)
- creator_handle (text, indexed, unique)
- usuario_creador (text)
- nombre_completo (text)
- avatar_url (text)
- seguidores (integer)
- total_ingresos_mxn (numeric)
- total_videos (integer)
- promedio_visualizaciones (integer)
- total_live_count (integer)
- gmv_live_mxn (numeric)
- revenue_live (numeric)
- revenue_videos (numeric)
- tiktok_url (text)
- country (text)
- created_at, updated_at, last_import

### videos
- id (uuid, PK)
- video_url (text, indexed, unique)
- video_mp4_url (text)
- thumbnail_url (text)
- title (text)
- creator_name (text)
- creator_handle (text, indexed)
- creator_id (uuid, FK → creators.id, indexed)
- product_name (text)
- product_id (uuid, FK → products.id, indexed)
- product_price, product_sales, product_revenue (numeric)
- views (integer)
- sales (integer)
- revenue_mxn (numeric)
- roas (numeric)
- category (text)
- country (text)
- rank (integer)
- transcript (text)
- analysis_json (jsonb)
- variants_json (jsonb)
- processing_status (text)
- duration (numeric)
- imported_at, created_at, updated_at

---

**Última actualización:** Diciembre 2024
**Estado:** Navegación bidireccional completa implementada
