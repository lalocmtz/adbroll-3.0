# Landing y recorrido Pro — 16 de octubre de 2026

## Publicación completada
Producción confirmada en https://tokxray.com/ con el commit `330cd381da1276fea0e9d1073dca8d4e99181009` y despliegue Vercel `dpl_gTuVPrzgJJiMv5EHdu4DmJ2LP4Mm` en estado READY. Capturas de comprobación: `output/landing-tour-2026-10-16/published-hero.png` y `published-product-tour.png`.

- Hero con un único CTA principal: Ver qué está vendiendo → /app.
- Tres demostraciones del producto con capturas reales: catálogo, guion/análisis y comparador de oportunidades. Imágenes WebP (aprox. 224 KiB en total), carga diferida y enlace para ampliar.
- Caso sincronizado con el video elegido: ventas reportadas × comisión del producto. El ingreso calculado se etiqueta como estimación, no como pago confirmado al creador.
- Escenarios de uso expresamente ilustrativos, sin identidades, estrellas ni reseñas inventadas.
- Precio US$15 sin cambios. CTAs de la landing abren la exploración; acciones premium abren /pricing. El pago requiere el botón explícito de compra.
- Corregido el reconocimiento de acceso vitalicio, temporal vigente, trialing y fundador en useBlurGate; no se modificaron autorizaciones del servidor.

## Validación
- 373 pruebas en 49 archivos aprobadas. Después de los ajustes finales de copy/imágenes, 16 pruebas de landing repetidas y aprobadas.
- TypeScript, build y git diff --check aprobados. Persisten los avisos previos de tamaño de bundles/Browserslist.
- Revisión visual local escritorio y 390×844: sin desbordamiento horizontal; CTA → catálogo → Ver guion → oferta Pro por US$15, sin iniciar pago.
- Capturas fuente: output/landing-tour-2026-10-16. No contienen datos privados de la cuenta; los recortes de producto publicados excluyen navegación/identidad del fundador.

## Incidencia operativa descubierta durante las capturas
Guiones/análisis guardados funcionan. La generación de variantes recibe Gemini HTTP429 RESOURCE_EXHAUSTED por cuota diaria. Prueba única del 17 octubre 01:30:11 UTC: quotaWindow=day; RetryInfo 80988 segundos (~17 octubre 18:00 México), sin garantizar disponibilidad al terminar.

Se publicaron generate-script-variants v13, process-catalog-analysis v3, transcribe-and-analyze v14, translate-script v4, analyze-script-insights v12 y la migración gemini_quota_backoff. Respetan el tiempo de espera y evitan repetir cuotas diarias/desconocidas inmediatamente. JWT y autenticación privada conservados.

La cola automática de análisis permanece pausada (enabled=false, límites 1500/día y 2 concurrentes preservados). Se recuperaron 116 trabajos fallidos por cuota como pendientes. No se cambió plan, modelo ni facturación. Antes de reactivar el lote, verificar la cuota del proyecto de Gemini y reservar capacidad para solicitudes interactivas. La descarga de nuevos enlaces sigue dependiendo de resolver el límite de Apify señalado en la revisión anterior.
