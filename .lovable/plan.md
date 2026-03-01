

## Plan: Boton para resetear descargas fallidas

### Que se hara

Agregar un boton "Reintentar descargas fallidas" en la seccion de Importacion del admin (`src/pages/Admin.tsx`) que:

1. Muestre cuantos videos estan en estado `permanently_failed` o `download_failed`
2. Al hacer clic, ejecute un UPDATE via edge function (service role) para resetear `download_attempts = 0` y `processing_status = 'pending'` en esos videos
3. Refresque las stats del panel

### Cambios tecnicos

**1. Nuevo edge function: `supabase/functions/reset-failed-downloads/index.ts`**
- Recibe request autenticado (verifica rol founder)
- Hace UPDATE en tabla `videos`: donde `processing_status IN ('permanently_failed', 'download_failed')`, setea `processing_status = 'pending'` y `download_attempts = 0`
- Retorna cantidad de videos reseteados

**2. Modificar `src/pages/Admin.tsx`**
- Agregar estado `isResettingDownloads`
- Agregar funcion `handleResetFailedDownloads` que invoca el edge function
- Agregar stat para contar videos fallidos (permanently_failed + download_failed) en `loadStats`
- Agregar boton entre las stats cards y el boton principal de procesamiento, solo visible cuando hay videos fallidos
- Boton con icono RefreshCw, texto "Reintentar X descargas fallidas", color outline con borde naranja
- Al completar, muestra toast con cantidad reseteada y refresca stats

### Flujo del usuario

1. Entra a Admin > Importacion
2. Ve cuantos videos estan fallidos en la card de "Sin MP4" (ya existente)
3. Hace clic en "Reintentar descargas fallidas"
4. Los videos se resetean a `pending` con `download_attempts = 0`
5. Luego puede hacer clic en "Procesar Paralelo" para que el pipeline los descargue de nuevo

