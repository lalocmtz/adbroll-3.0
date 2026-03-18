
I'm using knowledge

## Objetivo (en simple)
Corregir de raíz la atribución para que:
1) Nunca se mezclen MX y US en ninguna pantalla o proceso.
2) La atribución sea **video-first** (primero video, luego productos probables).
3) El sistema automático sugiera con alta precisión y tú/equipo solo validen rápido.
4) El flujo de importación quede en **un solo proceso definido**.

## Hallazgos confirmados en el código y datos
- En el panel de atribución masiva, el selector de productos **no filtra por mercado** (`AttributionProductSelector` trae top 200 global).
- En DB, el top 200 por ingresos es 100% US, por eso ves mezcla en panel MX.
- `find-candidate-videos` no recibe/aplica `market`, así que mezcla candidatos de ambos países.
- `RelatedVideos` y `VideoAttribution` no usan contexto de mercado ni pasan mercado a candidatos.
- Hay múltiples flujos de atribución manual (`VideoAttribution`, `PendingLinks`, modal por video) sin regla única.
- En import secuencial (`Admin.tsx` fase 6), `auto-match-videos-products` se invoca **sin market**, abriendo puerta a contaminación.
- `download-videos-batch` y `transcribe-videos-batch` no están segmentados por mercado.
- El matcher aún tiene rutas de falso positivo (ej. first-word/hashtag genérico tipo “aceite”).
- Métrica real: 110 links automáticos están por debajo de 0.75 de confianza.

## Solución propuesta (arquitectura final)
```text
Mercado seleccionado (MX/US)
        ↓
Cola de videos del mercado (video-first)
        ↓
Sugerencias de productos del mismo mercado (score + keywords)
        ↓
Validación manual 1-click / lote
        ↓
Lock manual_match (no lo pisa auto-match)
```

## Fase 1 — Blindaje de mercado en TODAS las capas
### Frontend
- `src/pages/admin/VideoAttribution.tsx`: incorporar `useMarket()` y trabajar por mercado activo.
- `src/components/admin/AttributionProductSelector.tsx`: filtrar `.eq("market", market)` y mostrar etiqueta de mercado.
- `src/pages/RelatedVideos.tsx`: cargar `product.market` y exigir coincidencia de mercado en candidatos.
- `src/components/PendingLinks.tsx`: filtrar videos por `country=market` y productos por `market`.
- `src/pages/Admin.tsx`: al abrir atribución, pasar mercado explícito (query param o contexto sincronizado).

### Backend functions
- `supabase/functions/find-candidate-videos/index.ts`: aceptar `market`; filtrar videos por `country=market`.
- `supabase/functions/download-videos-batch/index.ts`: aceptar `market`; procesar solo ese mercado.
- `supabase/functions/transcribe-videos-batch/index.ts`: aceptar `market`; procesar solo ese mercado.
- `supabase/functions/reset-failed-downloads/index.ts`: agregar modo por mercado (opcional global).

## Fase 2 — Atribución video-first (rápida y con alta probabilidad)
- Convertir `/admin/attribution` de product-first a **video-first**:
  - Lista de videos (unlinked o low-confidence) del mercado.
  - Al seleccionar video, mostrar “productos probables” con score y palabras coincidentes.
  - Confirmar con check 1-click + atajos (siguiente video, descartar, deshacer).
- Crear función nueva: `supabase/functions/find-candidate-products/index.ts`
  - Input: `videoId`, `market`, `limit`.
  - Score por transcript + title + product_name + hashtags.
  - Devuelve top candidatos ordenados por confianza.
  - Excluye keywords genéricas como único criterio.

## Fase 3 — Mejorar precisión del auto-match (sin “matches ridículos”)
- `supabase/functions/auto-match-videos-products/index.ts`:
  - Eliminar o endurecer rutas genéricas peligrosas (first-word/hashtag con términos genéricos).
  - Aplicar principio precisión>cobertura: no asignar si score < 0.75.
  - Respetar `manual_match=true` (no tocar vínculos manuales).
  - Registrar método y score final para auditoría.
- `src/hooks/useParallelPipeline.ts`:
  - Pasar `market` también a descarga/transcripción (además de matching).
  - Contadores “pending” segmentados por mercado para evitar falsa sensación de atasco.

## Fase 4 — Unificar importación en un solo proceso
- Simplificar `Admin.tsx`:
  - Dejar **un único botón oficial**: “Importar + procesar mercado seleccionado”.
  - Mantener un solo orquestador (pipeline paralelo); retirar lógica duplicada del secuencial.
  - Mostrar claramente: mercado activo, pendientes de ese mercado, progreso de ese mercado.
- Resultado: sin choques entre 2-3 procesos diferentes.

## Fase 5 — UX de control manual para equipo
- En panel de atribución:
  - Filtros: “sin producto”, “baja confianza”, “menciona palabra clave”, “top videos”.
  - Acciones: vincular, desvincular, marcar “revisado”.
  - Mostrar motivo del score (keywords detectadas) para decisión rápida.
- En `RelatedVideos`:
  - Sección “candidatos del mismo mercado”.
  - Botón “desvincular” y “re-asignar” sin salir de la vista.

## Fase 6 — Documentación y orden operativo
- Actualizar `docs/tasks.md` con checklist de:
  - Aislamiento MX/US extremo.
  - Atribución video-first.
  - Proceso único de importación.
- Dejar SOP corto para el equipo: importar → procesar → validar low-confidence.

## Verificación (criterios de aceptación)
1. En mercado MX, nunca aparecen productos US en atribución/manual.
2. En mercado US, nunca aparecen productos MX.
3. `find-candidate-videos` y `find-candidate-products` regresan solo datos del mercado solicitado.
4. Auto-match no asigna si score < 0.75.
5. `manual_match` no se sobrescribe por procesos automáticos.
6. El admin muestra pendientes/progreso por mercado correcto.
7. Flujo único de importación ejecuta sin duplicidad de fases.

## Archivos objetivo
- Frontend:
  - `src/pages/admin/VideoAttribution.tsx`
  - `src/components/admin/AttributionProductSelector.tsx`
  - `src/components/admin/AttributionVideoList.tsx`
  - `src/pages/RelatedVideos.tsx`
  - `src/components/PendingLinks.tsx`
  - `src/hooks/useParallelPipeline.ts`
  - `src/pages/Admin.tsx`
- Backend:
  - `supabase/functions/find-candidate-videos/index.ts`
  - `supabase/functions/auto-match-videos-products/index.ts`
  - `supabase/functions/download-videos-batch/index.ts`
  - `supabase/functions/transcribe-videos-batch/index.ts`
  - `supabase/functions/reset-failed-downloads/index.ts` (si aplicamos reset por mercado)
  - `supabase/functions/find-candidate-products/index.ts` (nuevo)
- Documentación:
  - `docs/tasks.md`
