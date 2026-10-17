# Operación del catálogo TokXray — 10 de octubre de 2026

## Resultado verificado

- Reporte vigente México: 10 de septiembre–9 de octubre de 2026 (30 días), 2,000 fichas de video.
- Lote de 1,000 enlaces: ejecución Apify `SPty5iywYC5PkFubV`, completada en 5m43s, costo observado US$4.227 (tope US$4.40, saldo existente; sin contratar un plan).
- 944 MP4 nuevos publicados; 56 enlaces privados/no encontrados. Los 12 originales de más de 19 MiB se recuperaron por separado, validando formato y tamaño antes de publicarlos; no se redujo su calidad.
- Los 944 MP4 ocupan 3,004,850,611 bytes (~2.80 GiB). Todos quedaron vinculados por SKU exacto a 618 productos; cero vínculos sin producto y cero discrepancias de SKU.
- 304 productos solo tienen identidad obtenida del reporte de videos. Sus métricas comerciales permanecen nulas hasta importar la ficha completa; no se incluyen en oportunidades ni en el ranking de productos.
- 301 videos nuevos pertenecen a creadores ya presentes en el ranking. Los demás conservan su autor original sin inventar métricas de creador. Cero diferencias de autor entre el lote y Kalodata.
- Reporte vigente: 1,108 MP4, de los cuales 1,091 tienen producto y aparecen en el catálogo principal. Catálogo total: 4,248 MP4, incluyendo los reportes anteriores.
- El piloto previo procesó 100 enlaces (89 publicados) por US$0.420; no está incluido en el costo del lote de 1,000.
- Skinglo de @julietaskin, ID 7652957372519959828: descargado y analizado en producción; segunda apertura reutiliza el mismo análisis.
- GMV, ventas, vistas, rango y ranking de los 1,000 registros permanecen intactos: checksum anterior y posterior `6394b1b8dbc9377cfd5b843316f4b43a`.

## Actualización manual

1. Exportar de Kalodata los archivos de creadores, productos y videos, con mercado y rango de fechas. Para productos y creadores, usar 30 días. Para videos, exportar por separado 7 y 30 días.
2. Entrar con la cuenta fundadora a https://tokxray.com/admin/import y seleccionar Importación.
3. Subir los Excel. Se procesan creadores → productos → videos. Cada archivo es una transacción: se importa completo o se rechaza. Repetirlo actualiza los IDs existentes; no duplica videos ni borra MP4, análisis o vínculos manuales.
4. Para productos específicos, incluir su exportación de producto y los videos que tengan su ID/URL de producto. Un título parecido no demuestra que sea el mismo SKU. Los productos diferentes con igual nombre se conservan por separado. Cuando el Excel de videos aporta un SKU exacto pero falta la ficha completa del producto, se puede crear una identidad `video_source` con nombre y enlace originales. Precio, ventas, GMV y comisión quedan nulos; no participa en el ranking de productos ni en oportunidades hasta importar su reporte.
5. Para publicar el MP4, ejecutar `clockworks/tiktok-video-scraper` en Apify con enlaces completos y `shouldDownloadVideos: true`. Revisar el límite de costo antes de iniciar. No activar búsqueda de videos relacionados al descargar una lista exacta.
6. Cuando el lote figure SUCCEEDED, copiar su Run ID al panel «Publicar un lote de videos de Apify» y pulsar «Importar / reanudar lote». Se copian grupos pequeños al almacenamiento propio. Se puede pausar y reanudar; los archivos ya publicados se omiten.

El Excel contiene métricas y enlaces, no el archivo de video. La importación del Excel y la publicación de MP4 son dos pasos diferentes. El importador de lotes no inicia ejecuciones de pago ni análisis de IA.

## Fechas y rankings

Todos los órdenes del catálogo aplican el mismo periodo antes de paginar. Solo hay dos cápsulas: «Últimos 7 días» y «Últimos 30 días». La selección inicial es 30 días; se muestran las fechas exactas del reporte. No se mezclan reportes históricos.

Los archivos disponibles hasta ahora son de 30 días. Para poblar 7 días hace falta esa exportación de Kalodata: no se calcula una semana dividiendo el mes entre cuatro. Las métricas se guardan por video y rango para que una importación semanal no sobrescriba las cifras mensuales guardadas.

Un video antiguo puede seguir apareciendo si tiene ventas en el periodo actual. El selector corresponde a la fecha de las ventas del reporte, no necesariamente a la fecha de publicación del video.

## Análisis

Pegar un enlace completo de TikTok en https://tokxray.com/tools. Si falta el MP4, se solicita una descarga acotada a Apify. Después Gemini procesa audio e imagen y guarda el guion, estructura y tres variantes para reutilizarlos en otras aperturas. Requiere acceso de pago/fundador aprobado.

Límites actuales: la descarga automática admite MP4 hasta 19 MiB; el análisis de archivos ya almacenados admite hasta 200 MiB mediante Gemini Files API; 5 nuevas solicitudes de descarga por usuario/día y 100 globales/día; lotes administrativos separados. Los límites de análisis del servidor también se aplican. Una URL externa por sí sola no aporta ventas verificadas ni el SKU: esos datos provienen de Kalodata o de asignación manual.

## Costos y volumen

- Apify Free, tarifa consultada: US$3/1,000 videos + US$1.30/1,000 MP4, aproximadamente US$4.30/1,000 intentos. El piloto real fue US$0.42/100 enlaces. Fallos, reintentos y cambios de tarifa pueden alterar el total. Fuente: https://apify.com/clockworks/tiktok-video-scraper/pricing
- Quedan 892 fichas del reporte sin MP4, incluyendo enlaces privados/no disponibles ya intentados. No reejecutar manifiestos antiguos sin excluir los videos publicados y los fallos permanentes. A la tarifa observada, 1,000 intentos costaron US$4.227; almacenamiento, transferencia y análisis se contabilizan aparte.
- Gemini 3.5 Flash-Lite: US$0.30/millón de tokens de entrada y US$2.50/millón de salida. El clip comprobado de 8 segundos consumió 995 de entrada y 478 de salida: estimación US$0.0014935. No extrapolar un clip de 8 segundos a videos largos; medir varios tamaños. Fuente: https://ai.google.dev/gemini-api/docs/pricing
- Supabase Pro incluye cuotas de almacenamiento y transferencia compartidas por organización. Almacenamiento adicional: US$0.0213/GB/mes; transferencia excedente: US$0.09/GB, o US$0.03/GB para transferencia en caché. Ver cuotas disponibles y factura en https://supabase.com/pricing

La recomendación es descargar por lotes y analizar bajo demanda. No es necesario generar un análisis de cada MP4 antes de publicarlo.

## Verificación

Prueba real en el navegador publicada: los tres Excel originales importaron 500 creadores, 300 productos y 2,000 videos; 2,800 actualizados, cero duplicados.

58 pruebas de frontend/unidad, TypeScript y compilación de producción correctas; además pasaron cuatro regresiones de procesamiento por grupos y dos de importación/reanudación. Pasaron las regresiones SQL de refresco de métricas y asociación exacta. En producción se verificaron las cápsulas, el catálogo de 1,091 videos, una ficha de producto con métricas pendientes y los 17 videos relacionados de @gomita_oficial. Prueba SQL de periodos independientes, paginación y restricciones de campos premium correcta. Importador sin sesión: HTTP 401. RPC de escritura: sin permiso para usuarios anónimos o autenticados; solo servicio, tras validar fundador en la función.

Este trabajo no prueba un cobro real de Stripe. La validación de pago real → webhook firmado → acceso → comisión sigue documentada por separado en RELEASE_STATUS_2026-10-10.md.
