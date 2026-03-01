

## Sistema Global de Atribución de Videos a Productos

### Problemas identificados

1. **Productos duplicados**: Hay 3-4 variantes del mismo producto (ej: "Aceite de Orégano" aparece con nombres ligeramente diferentes), fragmentando los videos entre ellos
2. **Matching incorrecto**: El producto #1 "Aceite de Orégano" tiene 1 solo video vinculado, y es sobre "Aceite de Afeitado" (match falso por la palabra "aceite")
3. **1,067 videos sin producto** de 2,790 totales (38% sin vincular)
4. **No hay herramienta de asignación masiva** -- solo se puede asignar uno por uno desde cada VideoCard

### Solución: 3 componentes

---

### 1. Panel de Asignación Masiva (nueva página `/admin/attribution`)

Una vista diseñada para asignar videos a productos rápido y en lote:

- **Layout**: Dos columnas
  - **Izquierda**: Lista de videos (con thumbnail, título, producto actual si tiene)
  - **Derecha**: Selector de producto destino (búsqueda + producto seleccionado fijo)
- **Flujo de trabajo**:
  1. El admin selecciona un producto destino (ej: "Aceite de Orégano")
  2. El sistema muestra videos candidatos: videos que mencionan ese producto en título/transcript pero NO están vinculados, más videos actualmente mal vinculados
  3. El admin marca con checkbox los videos correctos
  4. Clic en "Asignar seleccionados" -- vinculación instantánea en lote
- **Filtros**: Ver solo sin producto, ver solo mal vinculados, buscar por texto
- **Acción rápida de desvincular**: Botón "X" para quitar producto de un video con un clic

**Archivos nuevos:**
- `src/pages/admin/VideoAttribution.tsx` -- Página principal del panel
- `src/components/admin/AttributionVideoList.tsx` -- Lista de videos seleccionables
- `src/components/admin/AttributionProductSelector.tsx` -- Selector de producto destino

**Archivos modificados:**
- `src/App.tsx` -- Agregar ruta `/admin/attribution`
- `src/pages/Admin.tsx` -- Agregar botón de acceso al panel de atribución

---

### 2. Mejora del matching automático: Deduplicación de productos

El matcher actual falla porque hay productos duplicados. Antes de hacer matching, se agrupan los duplicados.

**Cambios en `supabase/functions/auto-match-videos-products/index.ts`:**
- Agregar paso de "agrupación de productos similares" usando los primeros 30 caracteres normalizados del nombre
- Cuando un video matchea con un duplicado, vincularlo al producto "principal" (el de mayor `total_ingresos_mxn`)
- Aumentar threshold de keyword matching de 0.5 a 0.6 para reducir falsos positivos (como "aceite de afeitado" matcheando con "aceite de orégano")
- Agregar lista negra de palabras genéricas que no deben contar como match (aceite, crema, set, pack, etc.)

---

### 3. Mejora de "Ver videos" en productos (RelatedVideos)

**Cambios en `src/pages/RelatedVideos.tsx`:**
- Agregar búsqueda de "videos candidatos" además de los ya vinculados: videos cuyo título/transcript menciona el producto pero no están vinculados
- Mostrar sección separada "Videos posiblemente relacionados (sin vincular)" con botón "Vincular" en cada uno
- Agregar botón "Desvincular" visible en cada video vinculado (solo founders)
- Crear una edge function `supabase/functions/find-candidate-videos/index.ts` que busca videos candidatos por nombre de producto en título/transcript

---

### Edge function nueva: `find-candidate-videos`

Busca videos que probablemente pertenecen a un producto pero no están vinculados:
- Busca por palabras clave del nombre del producto en `title`, `product_name`, y `transcript`
- Excluye videos ya vinculados a otro producto (a menos que tengan baja confianza)
- Devuelve hasta 50 candidatos ordenados por relevancia

---

### Resumen de archivos

**Nuevos (4):**
- `src/pages/admin/VideoAttribution.tsx`
- `src/components/admin/AttributionVideoList.tsx`
- `src/components/admin/AttributionProductSelector.tsx`
- `supabase/functions/find-candidate-videos/index.ts`

**Modificados (4):**
- `src/App.tsx` (nueva ruta)
- `src/pages/Admin.tsx` (botón de acceso)
- `src/pages/RelatedVideos.tsx` (videos candidatos + desvincular)
- `supabase/functions/auto-match-videos-products/index.ts` (deduplicación + threshold)

### Impacto esperado

- Asignación masiva: vincular 20-50 videos a un producto en menos de 1 minuto
- Desvincular videos incorrectos con un solo clic
- Auto-matching más preciso al agrupar duplicados y filtrar palabras genéricas
- Vista de producto muestra todos los videos relevantes, vinculados y candidatos

