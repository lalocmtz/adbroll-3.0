

## Plan: Ranking basado en la ultima importacion (no acumulado)

### Problema actual

Cuando subes un nuevo archivo de productos/creadores, los datos anteriores (de diciembre, enero, etc.) siguen apareciendo con rank y metricas viejas. El sistema trata todo como "eterno" en vez de mostrar solo lo mas reciente.

**Videos**: Ya tiene el fix correcto (resetea ranks antes de importar).
**Productos**: NO resetea ranks. Los 759 productos MX todos tienen rank, incluyendo los de diciembre.
**Creadores**: NO tiene mecanismo de "solo los mas recientes". Los 84 creadores MX incluyen datos desde diciembre 2025.
**Oportunidades**: Es una vista (VIEW) derivada de productos, se arregla automaticamente al arreglar productos.

### Solucion

#### 1. Edge Function: `process-kalodata-products` (productos)

Agregar un paso de reset ANTES del upsert (igual que ya hace `process-kalodata` para videos):

```text
-- Antes de upsert:
UPDATE products SET rank = NULL WHERE market = '{market}'
```

Esto hace que solo los productos del archivo recien subido tengan rank. Los productos viejos siguen en la DB pero sin rank.

#### 2. Edge Function: `process-kalodata-creators` (creadores)

Agregar un paso de reset antes del upsert:

```text
-- Antes de upsert:
UPDATE creators SET last_imported_from_kalodata_at = NULL WHERE country = '{market}'
```

Luego en el upsert, setear `last_imported_from_kalodata_at = now()` para cada creador importado.

#### 3. Frontend: `src/pages/Products.tsx`

- Agregar opcion de sort "Ranking actual" como default (igual que Dashboard)
- En modo "Ranking actual": filtrar `rank IS NOT NULL` y ordenar por `rank ASC`
- Esto muestra solo los ~200 productos del ultimo archivo

#### 4. Frontend: `src/pages/Creators.tsx`

- Filtrar por `last_imported_from_kalodata_at IS NOT NULL` por default
- Esto muestra solo los ~50 creadores del ultimo archivo importado

#### 5. Frontend: `src/pages/Dashboard.tsx`

- Ya funciona correctamente (filtra `rank IS NOT NULL` en modo ranking). Sin cambios.

#### 6. Frontend: `src/pages/Opportunities.tsx`

- La vista `product_opportunities` deriva de `products`. Al resetear ranks en productos, los productos viejos sin rank seguiran apareciendo porque la vista no filtra por rank.
- Agregar filtro en la query: solo productos con `rank IS NOT NULL` (los de la ultima importacion).

### Resumen de archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/process-kalodata-products/index.ts` | Agregar reset de `rank = NULL` antes del upsert |
| `supabase/functions/process-kalodata-creators/index.ts` | Agregar reset de `last_imported_from_kalodata_at = NULL` + setear timestamp en cada upsert |
| `src/pages/Products.tsx` | Agregar sort "Ranking actual" como default, filtrar rank IS NOT NULL |
| `src/pages/Creators.tsx` | Filtrar solo creadores con `last_imported_from_kalodata_at IS NOT NULL` |
| `src/pages/Opportunities.tsx` | Filtrar productos con rank (ultima importacion) |

### Resultado esperado

- Al subir un archivo nuevo de 200 productos, solo esos 200 apareceran con ranking
- Los productos viejos de diciembre seguiran en la DB pero no apareceran en el ranking principal
- Lo mismo para creadores: solo los del ultimo archivo importado
- Las oportunidades se calcularan solo sobre productos recientes

