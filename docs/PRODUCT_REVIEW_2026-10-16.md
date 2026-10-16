# TokXray — revisión de producto del 16 de octubre de 2026

## Publicación

Interfaz: `033524fa02303c1e079b99aa4248ca28bf71eb16` (incluye `911515b` y la entrega inicial `3f5c5b4`).
Vercel: `dpl_9wNLYoQ1Xf62yrCirhCJ3bpDiQyj`, READY y asignado a `tokxray.com`.
Último ajuste de errores de descarga: `2b92e64`, publicado en `catalog-download` v6.
Supabase: cuatro migraciones aplicadas y seis funciones actualizadas.

## Cambios

- Landing, registro, login, precio y mensajes de desbloqueo orientados a ventas, comisiones y decisiones de producto. Casos con cifras reales del catálogo y su período, sin promesas de ganancias.
- Precio conservado: US$15/mes; referencia MXN explícitamente aproximada. Registro gratuito separado de la suscripción.
- Análisis con gancho, primera frase y tiempos, mapa del guion, observaciones visuales y aprendizajes. Se retiró la sección «Qué falta comprobar». Las variantes siguen siendo una acción explícita.
- Segmentos compatibles con segundos actuales y milisegundos antiguos; cuando son parciales, la transcripción completa permanece accesible.
- Los tiempos solo se muestran después de medir la duración del archivo. Se descarta el conjunto de tiempos si algún segmento excede esa duración; se conserva el guion completo. Se verificó el caso de un video de 85.17 segundos cuyo último segmento generado terminaba en 121 segundos. En Herramientas, sin duración medida, se muestra el texto sin tiempos.
- Ranking limitado a 20 creadores con archivos disponibles, ordenados por ingresos de videos. Detalle con hasta 50 videos, en páginas de 20; vinculación por ID o usuario normalizado exacto, nunca aproximaciones de nombre.
- Oportunidades explica sus señales y permite consultar el cálculo del indicador.
- Panel exclusivo del fundador: suscriptores, accesos gratuitos, afiliados activos, almacenamiento, cola, proyección de tiempo y alertas. Entrada desde menú y Configuración.
- Registro privado de consumo de IA por intento: tokens, costo estimado, modelo, respuesta y duración. No guarda prompts, claves, usuarios ni contenidos. Histórico de análisis conservados separado del registro nuevo; no se suman para evitar duplicar gasto.
- Las descargas rechazadas definitivamente pueden reintentarse con cuota y espera. Los inicios inciertos no se reinician automáticamente para evitar cargos duplicados. Errores seguros sin datos del proveedor.
- Recuperación de pantallas que quedaron abiertas durante una publicación: un solo intento de recarga ante archivos antiguos que ya no existen y una alternativa manual si persiste el fallo.
- Landing sin cuadros grises por falta de portada: un fotograma para los videos visibles, sin autoplay; se pausa el video cuando deja de verse y al comenzar otro. Las tarjetas fuera de pantalla no preparan el archivo.

## Verificación automatizada

287 pruebas / 43 archivos aprobados; después, 9 pruebas específicas de errores Apify aprobadas, incluida una nueva para `platform-feature-disabled`. El ajuste final de portadas pasó 8 pruebas de landing y medios, TypeScript y una nueva compilación de producción. Pruebas SQL locales de permisos e idempotencia del panel/registro aprobadas. Aviso existente de tamaño de paquetes en Vite; no bloquea la compilación.

Comprobado en producción: inicio de sesión con Google, transcripción existente, traducción al inglés, generación de dos variantes, cierre sin audio residual, panel del fundador y perfil con 17 videos. Abrir el modal dejó ambos elementos de video pausados y sin autoplay. La versión final conservó el guion completo y descartó los tiempos imposibles del caso de prueba. El rechazo de Apify ahora se muestra como una pausa de descargas y no como un error genérico.

## Estado de contenido observado a las 15:28, hora de México

- 3,332 trabajos listos; 916 pendientes/en proceso; 113 completados en los últimos 60 minutos; cero trabajos fallidos.
- Proyección: unas 8.1 horas de procesamiento activo al ritmo observado. Puede cambiar por fallos, pausas y límites. Cola habilitada, concurrencia 2, límite 1,500 intentos/día UTC.
- 25.50 GB de archivos registrados en Storage. No incluye transferencia, copias de seguridad ni otros proyectos.
- 258 creadores con videos disponibles. Los 20 seleccionados suman 184 videos: entre 3 y 17 por creador. No se han descargado todavía 20–50 por cada uno.
- Registro nuevo de IA comprobado en producción: ya recibe llamadas exitosas y tokens desde la cola.

## Bloqueos externos

1. Apify muestra US$5.84 usados de US$5 del plan Free y ejecuciones bloqueadas hasta el 28 de octubre. El enlace nuevo de @julietaskin no llegó a crear una ejecución. Hace falta saldo/plan habilitado para validar nuevas descargas y ampliar creadores. Se solicitó al propietario resolverlo en la pantalla de facturación. No se contrató ningún plan.
2. El inicio de sesión con Google sí se probó correctamente en producción. Durante la revisión inicial Google Cloud pidió verificación en dos pasos, pero al cierre ya permitió entrar al proyecto `tokxray-auth-2026`. Nombre TokXray y enlaces a inicio, privacidad y términos ya estaban guardados. Al ejecutar «Verificar la marca», Google rechazó la revisión porque `https://tokxray.com` no está registrado a nombre de esta cuenta. Indica verificar propiedad y esperar 24 horas antes de volver a intentarlo. Se preparó la propiedad de prefijo URL en Search Console con `lalocmtz@gmail.com` y se descargó `google7d93f65f29c74801.html`; todavía NO se publicó en `public/` ni se verificó. Se solicitó autorización específica para conceder propiedad a esa cuenta. Copia local del archivo en `output/product-review-2026-10-16/`. La carga del logotipo, por separado, quedó bloqueada porque la extensión de Chrome no tiene habilitado «Allow access to file URLs»; no se cambió ese permiso. Pantallas abiertas para continuar.
3. El saldo real/créditos de Gemini y la cuota restante del plan de Storage no están conectados. El panel muestra consumo medido y enlaces a los proveedores; no inventa saldos.

## Siguiente export para alimentar creadores

Archivo de cobertura: `output/product-review-2026-10-16/top20-creator-coverage.csv`.

Exportar México, para los 20 perfiles, los mejores 50 videos por ventas de video (no ingresos de lives). Entregar reportes separados de últimos 7 y últimos 30 días, con inicio y final de período. Campos: ID y URL del video, usuario del creador, ID y URL del producto, nombre, ventas en MXN, unidades, vistas, comisión si existe y fecha de publicación. Mantener los IDs como texto para evitar que Excel los redondee.

Para alcanzar 20 disponibles por perfil faltan al menos 216 archivos distintos; para alcanzar 50 faltan al menos 816. El export puede requerir más candidatos por videos privados o eliminados. Los rankings de likes/vistas de Apify no sustituyen el ranking de ventas del reporte. No asignar productos por inferencias del título.

## Evidencia visual

Carpeta `output/product-review-2026-10-16/`. La comprobación móvil usa Chrome a 390 × 844; escritorio a 1492 × 708. Sin desbordamiento horizontal en las pantallas comprobadas. No equivale a una prueba física de Safari en iPhone. El precio para invitados se comprobó en el entorno local; en producción se verificó el estado de acceso ya activo del fundador, sin crear un cobro.
