
I'm using knowledge

## Objetivo
Eliminar el “congelamiento” del pipeline de descargas y dejar clarísimo por qué falla, qué debes hacer tú, y cómo blindar el sistema para que no vuelva a quedarse en bucle silencioso.

## Diagnóstico confirmado (con evidencia)
1. **Causa raíz actual:** el proveedor de descarga está devolviendo:
   - `"You have exceeded the MONTHLY quota for Requests on your current plan, BASIC"`
2. Esto significa que **no es un bug de parsing ni de importación**; es **límite de cuota agotada** del API externo.
3. El sistema parece “congelado” por dos razones de UX/lógica:
   - El worker sigue intentando en ciclos aunque no hay progreso real.
   - El botón de “Reintentar” resetea estados, pero con cuota agotada vuelve a fallar inmediatamente.

## Qué necesitas hacer tú (bloqueante operativo)
1. **Subir plan/cuota** del API actual en RapidAPI (llbbmm) para permitir más requests.
2. Después del upgrade, ejecutar “Reintentar descargas fallidas” + procesar pipeline.
3. Sin cuota disponible, **ningún cambio de código puede descargar MP4s**.

## Plan de implementación (código) para que no vuelva a “congelarse”
### Fase 1 — Fail-fast y mensaje claro de cuota agotada
**Archivos:**
- `supabase/functions/download-videos-batch/index.ts`
- `supabase/functions/download-tiktok-video/index.ts`
- `supabase/functions/get-tiktok-download-url/index.ts`

**Cambios:**
- Detectar explícitamente error de cuota del proveedor (`MONTHLY quota`, `exceeded`, `Upgrade your plan`).
- Responder con bandera estructurada (ej: `quotaExceeded: true`, `providerMessage`, `retryable: false`).
- No tratar ese caso como “error genérico”.
- En ese escenario, cortar batch temprano para evitar consumo inútil y spam de reintentos.

### Fase 2 — Estado de videos más preciso para cuota agotada
**Archivos:**
- `supabase/functions/download-videos-batch/index.ts`
- `supabase/functions/reset-failed-downloads/index.ts`

**Cambios:**
- Marcar videos afectados con estado dedicado (ej: `download_blocked_quota`) o equivalente semántico.
- Evitar incrementar intentos de forma engañosa cuando la falla es por cuota global (no por video roto).
- Incluir ese estado en el reset para que “Reintentar” realmente recupere todo cuando ya haya cuota.

### Fase 3 — Evitar bucles infinitos en UI/pipeline
**Archivos:**
- `src/hooks/useParallelPipeline.ts`
- `src/pages/Admin.tsx`

**Cambios:**
- Si backend devuelve `quotaExceeded`, detener sólo la fase de descargas de inmediato.
- Mostrar toast/error explícito: “Cuota mensual agotada del proveedor de descargas”.
- Agregar condición de “no progreso” por N ciclos para descargas y matching (evitar ciclo 1..100 sin cambio real).
- Mantener fases no dependientes funcionando cuando aplique, pero sin dar impresión de que “descarga sigue viva”.

### Fase 4 — UX de recuperación (“Reintentar” que sí se entienda)
**Archivo:**
- `src/pages/Admin.tsx`

**Cambios:**
- Mejorar copy del botón y resultado:
  - Qué se reseteó
  - Qué paso sigue (si falta cuota)
- Opcional recomendado: tras reset exitoso, ofrecer acción inmediata “Iniciar descargas ahora”.

### Fase 5 — Documentación operativa
**Archivo:**
- `docs/tasks.md`

**Cambios:**
- Registrar tarea completada: “Manejo de cuota agotada + anti-freeze pipeline”.
- Dejar checklist corto para soporte futuro (síntoma → causa → acción).

## Impacto esperado
- Ya no verás el pipeline “trabajando” indefinidamente sin avances.
- El sistema dirá claramente si el bloqueo es por plan/cuota.
- “Reintentar” será útil y predecible cuando vuelvas a tener cuota.
- Menos videos enviados a `permanently_failed` por un problema global temporal.

## Verificación que haré al implementar
1. Simular/forzar respuesta de cuota agotada y validar que:
   - Se corta el loop
   - Se muestra mensaje claro en Admin
2. Ejecutar reset y confirmar que incluye estados bloqueados por cuota.
3. Con cuota activa, correr pipeline y validar descenso real de `pending` + aumento de `downloaded`.
4. Confirmar que ya no hay ciclos infinitos de matching con 0 progreso.

## Nota importante
No se requieren cambios de esquema/RLS para este fix; es un ajuste de lógica de backend functions + UX de administración y manejo de estado.
