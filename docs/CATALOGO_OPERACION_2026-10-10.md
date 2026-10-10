# Operación del catálogo TokXray — 10 de octubre de 2026

## Resultado verificado

- Reporte vigente México: 10 de septiembre–9 de octubre de 2026 (30 días), 2,000 fichas de video.
- Piloto Apify: 100 enlaces, ejecución `oyd4q7HpSifnSUHYD`, completada en 1m36s, costo observado US$0.420.
- 89 MP4 publicados, 11 omitidos por no estar disponibles o no superar la validación. Los archivos válidos ocupan 220,460,498 bytes (~210 MiB).
- Videos descargados del reporte: 75 → 164. Catálogo principal con producto y MP4: 58 → 147.
- WindBoss Drenaje Linfático, SKU 1736327955572163659: 0 → 13 videos disponibles.
- Video de Skinglo de @julietaskin, ID 7652957372519959828: descargado y analizado en producción; segunda apertura reutiliza el mismo análisis.
- El catálogo total conserva 3,304 MP4: 3,214 migrados + 89 del lote + Skinglo.

## Actualización manual

1. Exportar de Kalodata los archivos de creadores, productos y videos, con mercado y rango de fechas. Para productos y creadores, usar 30 días. Los videos admiten periodos separados de 7, 30 o 60 días.
2. Entrar con la cuenta fundadora a https://tokxray.com/admin/import y seleccionar Importación.
3. Subir los Excel. Se procesan creadores → productos → videos. Cada archivo es una transacción: se importa completo o se rechaza. Repetirlo actualiza los IDs existentes; no duplica videos ni borra MP4, análisis o vínculos manuales.
4. Para productos específicos, incluir su exportación de producto y los videos que tengan su ID/URL de producto. Un título parecido no demuestra que sea el mismo SKU. Los productos diferentes con igual nombre se conservan por separado.
5. Para publicar el MP4, ejecutar `clockworks/tiktok-video-scraper` en Apify con enlaces completos y `shouldDownloadVideos: true`. Revisar el límite de costo antes de iniciar. No activar búsqueda de videos relacionados al descargar una lista exacta.
6. Cuando el lote figure SUCCEEDED, copiar su Run ID al panel «Publicar un lote de videos de Apify» y pulsar «Importar / reanudar lote». Se copian grupos pequeños al almacenamiento propio. Se puede pausar y reanudar; los archivos ya publicados se omiten.

El Excel contiene métricas y enlaces, no el archivo de video. La importación del Excel y la publicación de MP4 son dos pasos diferentes. El importador de lotes no inicia ejecuciones de pago ni análisis de IA.

## Fechas y rankings

Todos los órdenes del catálogo aplican el mismo periodo antes de paginar. «Último reporte» es la opción inicial. «Histórico» es explícito y usa el último reporte guardado de cada video; no suma ventanas superpuestas ni convierte esas cifras en ventas acumuladas de por vida.

Los archivos disponibles hasta ahora son de 30 días. Para poblar 7 y 60 días hacen falta esas exportaciones de Kalodata: no se calcula una semana dividiendo el mes entre cuatro. Las métricas se guardan por video y rango para que una importación semanal no sobrescriba las cifras mensuales guardadas.

Un video antiguo puede seguir apareciendo si tiene ventas en el periodo actual. El selector corresponde a la fecha de las ventas del reporte, no necesariamente a la fecha de publicación del video.

## Análisis

Pegar un enlace completo de TikTok en https://tokxray.com/tools. Si falta el MP4, se solicita una descarga acotada a Apify. Después Gemini procesa audio e imagen y guarda el guion, estructura y tres variantes para reutilizarlos en otras aperturas. Requiere acceso de pago/fundador aprobado.

Límites actuales: MP4 hasta 19 MiB; 5 nuevas solicitudes de descarga por usuario/día y 100 globales/día; lotes administrativos separados. Los límites de análisis del servidor también se aplican. Una URL externa por sí sola no aporta ventas verificadas ni el SKU: esos datos provienen de Kalodata o de asignación manual.

## Costos y volumen

- Apify Free, tarifa consultada: US$3/1,000 videos + US$1.30/1,000 MP4, aproximadamente US$4.30/1,000 intentos. El piloto real fue US$0.42/100 enlaces. Fallos, reintentos y cambios de tarifa pueden alterar el total. Fuente: https://apify.com/clockworks/tiktok-video-scraper/pricing
- Quedan 1,836 fichas del reporte sin MP4; descargar todos sus enlaces costaría aproximadamente US$7.90 con esa tarifa, antes de almacenamiento y reproducción. Están preparados 19 archivos locales de hasta 100 enlaces; no se han ejecutado. Incluyen los enlaces del piloto no publicados, que pueden seguir sin estar disponibles.
- Gemini 3.5 Flash-Lite: US$0.30/millón de tokens de entrada y US$2.50/millón de salida. El clip comprobado de 8 segundos consumió 995 de entrada y 478 de salida: estimación US$0.0014935. No extrapolar un clip de 8 segundos a videos largos; medir varios tamaños. Fuente: https://ai.google.dev/gemini-api/docs/pricing
- Supabase Pro incluye cuotas de almacenamiento y transferencia compartidas por organización. Almacenamiento adicional: US$0.0213/GB/mes; transferencia excedente: US$0.09/GB, o US$0.03/GB para transferencia en caché. Ver cuotas disponibles y factura en https://supabase.com/pricing

La recomendación es descargar por lotes y analizar bajo demanda. No es necesario generar un análisis de cada MP4 antes de publicarlo.

## Verificación

Prueba real en el navegador publicada: los tres Excel originales importaron 500 creadores, 300 productos y 2,000 videos; 2,800 actualizados, cero duplicados.

58 pruebas automatizadas, TypeScript y compilación de producción correctas. Prueba SQL de periodos independientes, paginación y restricciones de campos premium correcta. Importador sin sesión: HTTP 401. RPC de escritura: sin permiso para usuarios anónimos o autenticados; solo servicio, tras validar fundador en la función.

Este trabajo no prueba un cobro real de Stripe. La validación de pago real → webhook firmado → acceso → comisión sigue documentada por separado en RELEASE_STATUS_2026-10-10.md.
