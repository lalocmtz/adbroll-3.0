# Revisión móvil y funcionamiento — 16 octubre 2026

## Problemas reproducidos y corregidos

- **Audio superpuesto:** producción montaba dos reproductores del mismo modal. El oculto tenía autoplay y audio, mientras el visible estaba pausado. Ahora existe un solo reproductor, iniciado por el usuario, que pausa los demás al reproducirse y se detiene al cerrar/cambiar de video o esconder la pestaña. Las tarjetas muestran imágenes o un fotograma silencioso, sin reproducción automática.
- **Bloque blanco en iPhone:** se sustituyó el modal duplicado por una estructura responsive con `dvh`, un área de desplazamiento móvil y márgenes seguros. Video, métricas, producto y pestañas comparten una sola vista; no hay un pie fijo vacío sobre el contenido.
- **Demasiado texto/controles:** cabecera móvil con menú, marca y acceso; afiliados dentro del menú. Título «Videos que están vendiendo». Periodos 7/30 días y ordenamiento en una fila deslizable. Procedencia, fecha del reporte y MXN siguen accesibles en Información, sin repetirlos en cada tarjeta.
- **Ranking móvil:** tarjetas con botón de videos visible; escritorio conserva la tabla. Se eliminó la comisión de respaldo del 8%, que no provenía del producto. También se retiró el 6% de respaldo en Productos/Favoritos.
- **Guiones fallidos:** el video de drenaje linfático reportado por el usuario se volvió a procesar correctamente en producción y quedó guardado. Se observaron respuestas 503 intermitentes del proveedor en otras solicitudes; ahora hay reintentos acotados y errores legibles sin nombres internos.
- **Preparación automática:** las cargas nuevas disparan una cola privada de transcripción/análisis compartidos. Abrir el catálogo consulta los resultados guardados. Las variantes se generan únicamente al pedirlas. Los análisis antiguos sin variantes siguen siendo válidos.
- **Carga inicial:** las páginas se cargan por separado. Bundle principal de ~1.8 MB a ~794 KB sin comprimir (~515 a ~247 KB gzip). Administración se descarga solo cuando se visita.
- **Detalles adicionales:** navegación vuelve arriba; Configuración exige sesión y conserva destino al entrar; errores de login persistentes con indicación de Google cuando corresponda; menú móvil con foco, cierre Escape y objetivos táctiles de 44 px; etiquetas accesibles; imágenes de producto con estado de sustitución.

## Cobertura

Revisión visual y de ancho a 390 × 844, más comprobaciones a 360 × 780 y escritorio a 1440 × 900. Capturas en `output/mobile-audit-2026-10-16/`.

| Sección | Revisión / cambio |
| --- | --- |
| Landing | Jerarquía y banner de afiliados reducido, cabecera y CTA |
| Registro / login | Google/correo, precio claro, errores, etiquetas y cierre |
| Unlock / programa / colaboraciones | Precio vigente, legibilidad, ancho móvil y CTA |
| Videos | Periodos, orden, categorías, tarjetas, apertura sin autoplay |
| Modal | Un reproductor, guion guardado, análisis, traducción y variantes |
| Productos / relacionados | Títulos extensos, imágenes, relación exacta, vacío comprensible |
| Ranking | Tarjetas móviles, botón visible, filtros compactos, enlaces exactos |
| Oportunidades | Tarjetas, filtro, imagen ausente y metadatos accesibles |
| Analizar video | Resultado base independiente de variantes; solicitud explícita y errores |
| Favoritos | Pestañas, cuadrícula, estado vacío y acceso con cuenta |
| Configuración / soporte | Etiquetas, protección de ruta y contacto |
| Administración | Panel de cola visible solo al fundador, estado/costos/errores reales |

## Verificación técnica

- 36 archivos de pruebas, **237 pruebas aprobadas**; compilación Vite, TypeScript y `git diff --check` correctos.
- Prueba de migración con PGlite: cola inicialmente desactivada, permisos privados, token de un solo uso, invalidación por cambio de archivo, topes y reintentos.
- Backend desplegado: transcribe-and-analyze v12, process-catalog-analysis v1, generate-script-variants v11, translate-script v2, analyze-catalog-link v11, catalog-download v3, import-apify-batch v4.
- Migración `20261016190000_catalog_analysis_queue.sql` aplicada. Cola activa, máximo 2 solicitudes simultáneas, 1,500 intentos diarios, 3 intentos por video; despacho cada minuto. Tablas privadas sin acceso al cliente; resumen administrativo valida rol fundador.
- Piloto: 19 videos completados en 20 intentos, cero errores finales, costo estimado por tokens US$0.0618867. Estimación, no factura, y no incluye alojamiento ni descarga.
- A las 18:17 UTC: **3,007 de 4,248 videos descargados tenían análisis listo**; el resto continúa en la cola. Prioriza el reporte más reciente. No representa 4,248 videos del periodo actual.

## Límites y seguimiento

- El lote histórico está en proceso; no se afirma que todos los guiones ya estén listos. Estado y fallos finales en Administración. Preparación/reintentos continúan sin mantener el navegador abierto.
- El filtro de 7 días muestra un estado vacío porque no existe un reporte semanal importado. Se comprobó el retorno a 30 días. Hace falta cargar ese reporte; no se interpolaron ventas semanales desde cifras mensuales.
- Chrome con viewport móvil no sustituye una prueba física de Safari en iPhone. El código corrige la duplicación observada y contempla `playsInline`, `dvh` y safe-area; resta confirmar en el dispositivo del reporte.
- No se efectuó un cargo real ni se modificaron precio, comisiones o credenciales en esta revisión.
- La pantalla de Google aún puede mostrar el dominio técnico de Supabase. Personalizar esa pantalla es una configuración de OAuth/dominio aparte; no se cambió la identidad ni los permisos de las cuentas.
- Los avisos existentes de Supabase (vista security-definer, funciones con search_path mutable, optimizaciones RLS/índices y protección contra contraseñas filtradas) requieren una revisión específica; no se eliminaron permisos de funciones existentes a ciegas. Referencias: https://supabase.com/docs/guides/database/database-linter y https://supabase.com/docs/guides/auth/password-security.

## Publicación y comprobación final

Publicado en **https://tokxray.com**. Vercel `dpl_8UCKcwxKmJS9ps3FmPnbocAa8BCy`, estado READY, commit `c264a19215b8c9b79a857a18cb932698e4f242ce`. Dominio raíz y www asociados al despliegue.

Comprobaciones reales después de publicar:

- Abrir el video de @srachave: un solo reproductor interactivo, pausado, sin autoplay; guion original y análisis disponibles. Pulsar Play inicia únicamente ese video. Cerrar elimina el reproductor y deja **cero videos con audio reproduciéndose**.
- Guion de @emiliocampos244: traducción completa al inglés correcta; generación explícita de **2 variantes nuevas**; guion original conservado.
- Botón del producto → consola M15, UUID correcto, **5 videos relacionados**. Ranking → @emiliocampos244, **13 videos**. Ambas vistas a 390 px sin desbordamiento horizontal.
- Analizar por enlace → resultado existente con guion por segundos; no volvió a transcribir el archivo ni exigió variantes para mostrarlo.
- Configuración cargó los datos y acceso administrador; panel de afiliados mostró las condiciones vigentes de US$5 + 15%, líder 5%, retiro mínimo US$50.
- Panel de preparación visible al fundador, cola activa y cero fallos finales. Último corte de base a **18:24 UTC: 3,024 listos y 1,224 pendientes**, costo acumulado estimado US$0.1219069 de esta cola; los 2,981 resultados previos reutilizados no se vuelven a cobrar por abrirlos.
- Producción comprobada a **390 × 844 y 1440 × 900**, sin desbordamiento del documento, un solo reproductor del modal y sin reproducción espontánea. Se restauró el tamaño normal del navegador y se dejó abierto el catálogo.

Evidencias principales: `produccion-catalogo-390.png`, `produccion-guion-390.png`, `produccion-guion-1440.png`, `produccion-traduccion-390.png`, `produccion-variantes-390.png`, `produccion-producto-videos-390.png`, `produccion-tools-390.png`, `produccion-cola-390.png`, en el directorio de capturas mencionado arriba.
