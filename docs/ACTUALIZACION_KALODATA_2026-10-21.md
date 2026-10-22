# Actualización Kalodata — 21 de octubre de 2026

Periodo comercial: **21 de septiembre a 20 de octubre de 2026**, México. Los nombres de los cuatro Excel tienen fecha 22 de octubre; se utilizó el periodo que contienen, no la fecha del nombre.

## Ampliación publicada el 21 de octubre

El buscador y la sección de tiendas están publicados en **https://tokxray.com/products** y **https://tokxray.com/shops**. Versión de producción: `135e785743dbd94429a75a04a2456e3deede511a`.

- Búsqueda por nombre, ID o enlace de producto, paginación en servidor, categoría, comisión mínima, disponibilidad de videos y ordenación.
- Ranking de 100 tiendas. Se descargaron los mejores productos de las 20 primeras: **379 relaciones verificadas**, hasta 20 productos por tienda según disponibilidad. La tienda y la marca no se equiparan por nombre.
- Ficha de producto con comisión estimada, ventas, periodo, videos y análisis disponibles. Las cifras ausentes aparecen como desconocidas; no se inventan posiciones de ranking.
- Exportaciones dirigidas de los **74 productos del Top 100 con menos de cinco referencias**: 740 observaciones de video. Se conservaron dos asignaciones previas a otro producto; hay 738 asociaciones exactas aplicadas.
- Importación adicional: **536 identidades de video nuevas**, **248 fichas de producto nuevas** y 17 fichas incompletas completadas. Se conservan las métricas globales, archivos, análisis y asignaciones manuales anteriores.

Las 94 exportaciones dirigidas quedaron archivadas por ID, periodo y SHA256 en `kalodata_targeted_report_rows`, sin acceso público al archivo original. Los rankings y ventas de estos archivos parciales no sustituyen las métricas de un ranking global.

El lote inicial de 822 archivos terminó con **735 MP4 adicionales disponibles y 87 exclusiones**. Apify confirmó 81 publicaciones privadas/no encontradas; las otras seis exclusiones no tienen causa confirmada. Costo registrado: **USD 2.384**.

De las 740 observaciones dirigidas, 177 MP4 ya estaban almacenados y siete enlaces ya se habían intentado en el primer lote. Se inició un segundo lote de **556 archivos faltantes**, run `0GJXxYPXxQCSl8A8Z`, dataset `P0eh4GXpVn9p8Mt31`, conservando el límite de USD 4.40. Su resultado final y la cola de análisis se registran en `outputs/2026-10-21/STATUS.md`; no confundir descarga terminada con análisis terminado.

Validación de esta ampliación: 133 comprobaciones SQL, 17 pruebas de importación de archivos y 98 pruebas de interfaz, TypeScript y compilación. Cada lote de datos dirigidos se ensayó con ROLLBACK y se aplicó con comprobaciones de preservación. Se verificó la interfaz publicada en escritorio y móvil.

## Diagnóstico inicial y primera publicación (antes de la ampliación)

Las secciones siguientes conservan el diagnóstico de partida. Sus pendientes de tiendas, buscador y descargas fueron atendidos en la ampliación anterior; no describen el estado actual.

| Archivo | Filas | Nuevas | Actualizadas | Estado |
| --- | ---: | ---: | ---: | --- |
| Productos | 500 | 137 | 363 | Métricas publicadas |
| Creadores | 100 | 1 | 99 | Métricas publicadas |
| Videos | 1,500 | 474 | 1,026 | Métricas publicadas |
| Tiendas | 100 | — | — | Archivo privado preparado; sección pública pendiente |

Se completaron 54 fichas que antes solo tenían identidad procedente de videos. Se crearon 477 identidades de producto adicionales para enlazar los nuevos videos por ID exacto; permanecen como `video_source`, sin ventas, precio o comisión inventados.

Se reutilizaron **678 MP4 con análisis listo**. **822 archivos siguen pendientes** (474 registros nuevos y 348 existentes sin MP4). No se ejecutaron lotes de Apify ni nuevas peticiones a Gemini durante esta actualización. El catálogo muestra 677 referencias reproducibles del periodo: un video conserva una exclusión manual de producto anterior y no se reasignó automáticamente.

La publicación fue atómica. Sus comprobaciones abortan ante cambios de MP4, miniaturas, transcripciones, análisis, variantes o asignaciones manuales. El reporte anterior mantiene sus 2,000 filas de métricas históricas.

## Diagnóstico para el buscador

Los 1,500 videos identifican **1,059 productos diferentes**. Solo 717 referencias corresponden a alguno de los 500 productos exportados; el resto apunta a otros 730 productos. De estos 730, 655 carecen de ficha comercial completa y 75 tienen una ficha histórica que conviene actualizar.

Cobertura de los 500 productos **dentro del nuevo Excel de videos**, antes de descargar sus archivos:

| Referencias identificadas | Productos |
| --- | ---: |
| Ninguna | 171 |
| Una | 154 |
| Entre dos y cuatro | 146 |
| Cinco o más | 29 |

En los 100 productos más vendidos: 16 no tienen referencias, 20 solo tienen una y 38 tienen entre dos y cuatro. Para alcanzar cinco por producto se requieren al menos **237 referencias adicionales**, repartidas entre esos 74 productos y siempre que existan. El inventario histórico ya conserva MP4 para 282 de los 500 productos; esto no significa que pertenezcan al nuevo periodo.

## Próxima exportación recomendada

1. Mantener el ranking general semanal de 1,500 videos por ingresos para detectar novedades.
2. Priorizar los 74 productos del Top 100 con menos de cinco videos. Exportar sus 10 mejores videos por ingresos del mismo periodo, cuando existan, para dejar margen a repeticiones y videos no disponibles. Buscar distintos creadores y enfoques; después ampliar a 10–20 por producto prioritario.
3. Ampliar fichas de productos a 1,000–1,500 y completar primero las 730 identidades ya referenciadas por videos. Evitar gastar la cuota solo en más videos del ranking general.
4. Elegir 20 tiendas prioritarias y exportar los productos desde cada tienda conservando el ID de tienda y el ID de producto. Un nombre de tienda no demuestra que sea una marca. Los cuatro archivos actuales no incluyen la relación tienda–producto.
5. Para ampliar referentes de grabación, priorizar creadores por **ingresos de videos**. El ranking exportado está ordenado por ventas totales e incluye especialistas en LIVE. En este lote, 50 de los 100 creadores no aparecen en el Excel de videos.
6. Repetir cada semana México, los últimos 30 días completos y las mismas columnas. Si se desea una lectura de actividad reciente, exportar 7 días por separado. No sumar ventanas de 30 días solapadas.

## Diseño propuesto de la sección de productos

La tarea principal del creador debe ser: **buscar un producto que ya tiene → comprobar su oportunidad → estudiar los videos que venden → preparar su versión**.

- Buscador por nombre y enlace/ID de TikTok Shop; por marca o tienda cuando exista una relación verificada. Consultar el catálogo completo desde el servidor, con paginación, evitando el límite de la carga actual de Productos.
- Filtros por categoría, ventas del reporte, comisión, precio, número de creadores y disponibilidad de videos/guiones. Mostrar explícitamente periodo y moneda.
- Ficha con ventas reportadas, comisión estimada por venta, creadores activos, fecha de datos y mejores videos vinculados por ID exacto. Separar ventas por LIVE y videos cuando el reporte lo permita.
- Ordenar videos por ventas, unidades o vistas. Añadir hook, transcripción y análisis disponibles, junto con su periodo; no mezclar ventas del producto con ventas de un video.
- Distinguir una ficha completa de un producto solo identificado desde un video. Mostrar cobertura real; no presentar listas vacías como contenido premium completo.
- Ranking de tiendas basado en el archivo Shop. Añadir marcas como entidad separada cuando se disponga de su identificación.

Esta actualización prepara los datos; **no publica todavía el nuevo buscador ni una sección de marcas/tiendas**.

## Protección técnica de próximas cargas

Migración aplicada: `20261022011630_weekly_report_imports.sql`.

- Periodo comercial explícito en productos y creadores.
- Archivo privado `kalodata_report_rows`, con fuente completa, identidad, periodo y estado de publicación. RLS activa; sin permisos de lectura para `anon` ni `authenticated`. Las filas Shop permanecen preparadas (`published_at` nulo).
- Rechazo de fechas imposibles, periodos incorrectos, identidades duplicadas y reportes anteriores que sobrescriban métricas actuales.
- El RPC de productos publica un **ranking completo** y elimina posiciones antiguas de productos ausentes, sin borrar sus fichas. Consolidar primero exportaciones por categoría/páginas; no publicar cada página como un ranking independiente.
- Ranking de creadores limitado al reporte vigente por país y a perfiles con MP4 disponibles. Resultado verificado como visitante: Top 20 de 53 creadores cubiertos.
- Videos y fichas se reconocen por sus IDs. Se mantienen los guiones y archivos ya almacenados. Reimportar un periodo reemplaza sus métricas, sin sumar ventas ni duplicar registros.

Validación: 58 sentencias de pruebas SQL ejecutadas en PGlite desechable; comprobaciones de integridad dentro de la transacción de publicación; conteos e historial comprobados tras el commit; permisos de archivo privado y lectura del ranking como visitante verificados. La alerta informativa del asesor sobre RLS sin políticas en el archivo privado es deliberada: solo el servicio puede acceder.

## Archivos de trabajo

Directorio local: `outputs/2026-10-21/importacion/` (excluido de Git).

- `TokXray_Cobertura_y_proxima_exportacion.xlsx`: prioridades y enlaces directos, cobertura de los 500 productos, 730 fichas por completar, creadores y tiendas.
- `source-manifest.json`: nombres de fuente, SHA256 y filtros originales.
- `before-*.json`: respaldo de productos/creadores y estado anterior de videos; no incluye credenciales.
- `publish.sql`, `publish-result.json`, `verification.json`: publicación y comprobaciones.
- `descargas-pendientes/`: manifiesto y nueve lotes de Apify (ocho de 100 y uno de 22), todavía sin ejecutar.

Antes de enviar un lote de pago, volver a cruzar sus IDs con los MP4 actuales: otro proceso o un usuario pudo haberlos descargado después de este diagnóstico. `scripts/audit-kalodata-refresh.py` prepara el manifiesto a partir de inventarios guardados; no consulta la base ni llama proveedores por sí mismo.
