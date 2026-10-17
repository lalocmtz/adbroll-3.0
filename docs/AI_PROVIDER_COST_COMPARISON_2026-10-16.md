# IA para TokXray: costo, capacidad y recomendación

Revisión: 16 de octubre de 2026, México. Tarifas oficiales consultadas esa noche; importes en USD, sin impuestos, descargas, almacenamiento ni infraestructura. Esta revisión no cambia proveedores, claves, facturación ni modelos.

**Recomendación: mantener Gemini 3.5 Flash-Lite para transcripción y análisis de video, resolver la cuota del proyecto y evaluar GPT-6 Luna / Claude Haiku 5.5 solamente para las tareas de texto.** Para el lanzamiento, el menor riesgo operativo pesa más que ahorrar fracciones de centavo en cada llamada. No se realizó un benchmark comparativo de calidad.

## Lo que usa realmente la plataforma

- `_shared/gemini.ts` selecciona `GEMINI_MODEL`, por defecto `gemini-3.5-flash-lite`. El registro de producción confirma ese modelo.
- `_shared/analyze-owned-video.ts` envía el MP4 a Gemini; obtiene transcripción, segmentos, hook, desarrollo, CTA y observaciones visuales. Reutiliza el análisis base guardado para distintos usuarios.
- Las variantes y traducciones son solicitudes de texto separadas, bajo demanda.
- La cola automática actual ejecuta solicitudes normales de `generateContent`. **Todavía no utiliza la API Batch del proveedor ni obtiene su descuento.**
- Apify descarga videos; Supabase guarda archivos. Estos costos y sus bloqueos son independientes del modelo de IA.

## Tarifas comparables

Entrada y salida por un millón de tokens. Sin caché ni herramientas adicionales. La columna Batch representa una integración futura para trabajo que puede esperar.

| Modelo | Entrada estándar | Salida estándar | Entrada / salida Batch | Uso relevante |
|---|---:|---:|---:|---|
| Gemini 3.5 Flash-Lite | $0.30 | $2.50 | $0.15 / $1.25 | Video, audio, imágenes y texto |
| OpenAI GPT-6 Luna | $0.10 | $0.50 | $0.05 / $0.25 | Texto e imágenes |
| Claude Haiku 5.5 | $0.10 | $0.50 | $0.05 / $0.25 | Texto e imágenes |

Fuentes de precios: [Google](https://ai.google.dev/gemini-api/docs/pricing), [OpenAI](https://developers.openai.com/api/docs/pricing), [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing). Luna corresponde a prompts de hasta 272K tokens de entrada; Haiku, hasta 100K. Las tareas actuales son mucho menores. La salida facturada puede incluir razonamiento.

Gemini acepta el video con audio directamente. Luna y Haiku necesitan una transcripción y fotogramas preparados para reproducir ese flujo; cambiar únicamente el nombre del modelo no basta. Fuentes de capacidades: [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [Claude Haiku 5.5](https://platform.claude.com/docs/en/models/haiku-5-5/overview).

Dos precios antiguos no son una buena base para la decisión de lanzamiento: Gemini 2.5 Flash-Lite aparece a $0.10 entrada texto/imagen/video, $0.30 audio y $0.40 salida, pero Google limita la familia 2.5 a usuarios que ya la utilizaban; GPT-5 nano figura como obsoleto. No se comprobó elegibilidad de TokXray para 2.5. [Precios Google](https://ai.google.dev/gemini-api/docs/pricing), [disponibilidad Google](https://ai.google.dev/gemini-api/docs/deprecations), [estado GPT-5 nano](https://developers.openai.com/api/docs/models/gpt-5-nano).

## Costo real observado y proyección

Consulta de solo agregados en Supabase, sin textos ni datos personales:

| Muestra | Cantidad | Entrada promedio | Salida promedio | Equivalente a tarifa pagada |
|---|---:|---:|---:|---:|
| Análisis de videos guardados con metadatos de uso | 421 | 3,415.49 | 771.45 | **$2.95 por 1,000 análisis** |
| Llamadas exitosas desde el inicio del nuevo registro de uso | 99 | 3,318.95 | 753.70 | $0.285 total; $2.88 por 1,000 |

La primera muestra corresponde a videos. La segunda mezcla operaciones de IA y es una muestra distinta: **no deben sumarse**. Estos son costos estimados a tarifa pagada, no una factura ni el saldo consumido del plan gratuito. La muestra puede no representar videos más largos, ruido intenso o respuestas mayores. En el registro también hay 823 intentos fallidos; no se les asigna costo cero cuando falta información del proveedor.

Fórmula: `(tokens de entrada × tarifa entrada + tokens de salida facturada × tarifa salida) / 1,000,000`. En los videos medidos la salida incluye los tokens de razonamiento registrados. A este promedio, 10,000 análisis similares equivaldrían a unos **$29.53** de inferencia. Cada análisis guardado puede servir a muchos suscriptores sin repetir ese costo.

Para comparar variantes o traducción, un **escenario de texto** con 2,000 tokens de entrada y 1,000 de salida por solicitud da:

| 1,000 solicitudes de texto | Estándar | Batch |
|---|---:|---:|
| Gemini 3.5 Flash-Lite | $3.10 | $1.55 |
| GPT-6 Luna | $0.70 | $0.35 |
| Claude Haiku 5.5 | $0.70 | $0.35 |

Esto es aritmética con una carga supuesta, no una medición de calidad ni un ensayo entre proveedores. Los tokenizadores y el razonamiento cambian el consumo. La diferencia de $2.40 por 1,000 solicitudes de texto no justifica por sí sola rehacer el flujo de video durante el lanzamiento.

## Transcribir audio no equivale a analizar el video

OpenAI publica aproximadamente **$0.003/minuto** para `gpt-4o-mini-transcribe`; Google, aproximadamente **$0.005/minuto** para `gemini-3.5-transcribe`. Son unos $3 y $5 por 1,000 minutos respectivamente, antes del análisis visual y de los guiones. [Precio OpenAI](https://developers.openai.com/api/docs/pricing), [precio Google](https://ai.google.dev/gemini-api/docs/pricing).

Un flujo con Luna o Haiku puede combinar transcripción y fotogramas, pero exige extracción, sincronización, transporte y otra llamada de análisis. El precio final depende de duración, resolución y cantidad de fotogramas. No se puede comparar su precio de texto con el costo del MP4 completo como si fueran el mismo servicio.

Gemini documenta procesamiento conjunto de audio y video, con muestreo habitual de un fotograma por segundo. Ese muestreo puede omitir acciones muy rápidas; la elección de resolución también afecta costo y lectura de textos pequeños. [Procesamiento de video de Google](https://ai.google.dev/gemini-api/docs/video-understanding).

## Catálogo masivo y Batch

Las tres APIs ofrecen alrededor de 50% de descuento para solicitudes Batch. Gemini admite referencias a archivos multimodales y plantea un plazo objetivo de 24 horas; OpenAI documenta una ventana de 24 horas; Anthropic permite hasta 24 horas y puede dejar solicitudes expiradas. Es adecuado para preparar el catálogo, no para un usuario que espera variantes en pantalla. [Gemini Batch](https://ai.google.dev/gemini-api/docs/batch-api), [OpenAI Batch](https://developers.openai.com/api/docs/guides/batch), [Anthropic Batch](https://platform.claude.com/docs/en/build-with-claude/batch-processing).

Una implementación futura necesitaría persistir los identificadores de lote, gestionar archivos hasta completar el trabajo, guardar cada resultado una sola vez y reintentar únicamente solicitudes cuyo estado sea conocido. La cola actual continúa pausada por el incidente de cuota.

## Bloqueo actual y control de gasto

La llamada de variantes del 16 de octubre, 19:30:11 México, devolvió `429 RESOURCE_EXHAUSTED`, `quotaWindow: day` y un tiempo de reintento de 80,988 segundos. Es un límite diario confirmado por el proveedor, no un error de transcripción ni un límite por minuto. La señal de reintento apunta aproximadamente al 17 de octubre a las 18:00 México, sin garantía de recuperación.

La revisión visual de la cuenta indicada por el usuario encontró dos claves llamadas TOKXRAY en un mismo proyecto gratuito, junto con claves de otras aplicaciones. No se comparó el secreto desplegado con esas claves; esa vinculación todavía debe comprobarse antes de modificar la facturación.

Se abrió la configuración de facturación en `lalocmtz@gmail.com`. La pantalla solicita aceptar las condiciones de Google Cloud antes de continuar. Se dejó preparada, sin aceptar términos ni activar cargos; autorización de condiciones y presupuesto inicial solicitada al propietario. Evidencia: `output/landing-tour-2026-10-16/gemini-billing-ready.png`.

Para operar de forma estable, propongo un proyecto dedicado a TokXray, conservar límites diarios y de concurrencia en backend, y comenzar con un tope mensual de $10–20 sujeto a aprobación del propietario. El valor es una propuesta, no un ajuste aplicado. Separar proyectos ayuda a atribuir consumo; si comparten cuenta de facturación, también comparten sus límites globales.

Google puede requerir un prepago mínimo de $5. AI Studio permite un `Monthly spend cap` por proyecto, pero advierte retrasos de unos diez minutos y posibles excedentes de tareas largas. Un presupuesto de solo alertas tampoco detiene consumo. Se necesitan controles del proveedor **y** del backend. [Facturación y topes de Gemini](https://ai.google.dev/gemini-api/docs/billing#project-spend-caps), [presupuestos de Google Cloud](https://docs.cloud.google.com/billing/docs/how-to/budgets).

## Decisión propuesta

1. **Lanzamiento:** restaurar cuota operativa de Gemini, probar un video nuevo y una generación de variantes, después reanudar el catálogo de manera controlada. El precio medido es bajo y el flujo audiovisual ya existe.
2. **Optimización posterior:** evaluar Luna y Haiku para variantes/traducciones con las mismas transcripciones, midiendo fidelidad, español mexicano, cumplimiento de JSON, latencia y costo. Empatan en tarifa base; no se ha demostrado cuál escribe mejores variantes para TokXray.
3. **Escala:** preparar el catálogo con Batch, reutilizar transcripciones/análisis y reservar las variantes para solicitudes explícitas. Mejorar disponibilidad y evitar reprocesamientos puede ahorrar más que cambiar de proveedor indiscriminadamente.

La recomendación de Gemini es por compatibilidad, costo observado y esfuerzo de integración; no afirma que sea superior en todos los benchmarks ni garantiza más ventas para los creadores.

## Actualización posterior a la activación, 20:50 México

El propietario completó la facturación. Se verificó en AI Studio el nivel Pagado 1 del proyecto, MXN100 de saldo y recarga automática desactivada. TokXray completó una descarga nueva con Apify, análisis con Gemini, tres variantes y traducción. La cola de catálogo volvió a procesar y completar trabajos. La autorización/facturación pendiente descrita en la investigación inicial quedó superada; siguen pendientes la compra real de TokXray y la prueba comercial completa. Detalles y límites en `docs/LAUNCH_FIXES_2026-10-16.md`.
