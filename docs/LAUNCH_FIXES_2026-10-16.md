# TokXray — landing, Google y análisis de enlaces

Revisión del 16 de octubre de 2026. Sustituye los estados anteriores cuando se indican fechas posteriores. No declara toda la plataforma libre de errores.

## Correcciones

- **Franja sobre los videos:** el degradado de la landing terminaba abruptamente a un tercio de la imagen. Se eliminó y se movieron creador/producto a una cabecera separada. Se conservan controles nativos, inicio manual y pausa de otros videos.
- **Google:** protección ante dos pulsaciones simultáneas y recuperación del botón al volver desde Google mediante la caché de navegación de Safari. Los fallos de sesión ya no se presentan como una confirmación de correo pendiente. Un fallo transitorio al atribuir el referido tampoco rechaza un inicio de sesión válido. Registro normal y formulario de creadores comparten el mismo flujo.
- **Analizar video:** distingue una pausa del servicio, una descarga que sigue trabajando y un inicio cuyo estado necesita revisión. Ofrece catálogo e historial; el reintento vuelve a consultar el enlace. Los inicios inciertos no se reinician automáticamente.
- **Oportunidades:** comparar dos productos, con ventas reportadas, creadores y comisión por venta. Meta editable en MXN con ventas necesarias = techo(meta / comisión). Los datos desconocidos no generan cálculos. Respeta las tres filas visibles para invitados y las selecciones se validan contra el acceso vigente.

## Google: evidencia y límite de la corrección

En `auth_logs`, el 16 de octubre a las **18:41:53 de México** salió una redirección `/authorize` 302 sin callback posterior. A las **18:42:40** comenzó otro intento y a las **18:42:56** hubo `/callback` 302 y un evento de inicio de sesión `provider=google`, `login_method=oauth`. No aparecieron errores ni advertencias de Supabase en la ventana revisada (23:00–01:10 UTC).

El propietario confirmó que el error 400 ocurrió en un simulador o vista móvil de computadora, no en un iPhone físico. Los registros disponibles no identifican la causa dentro de Google; el éxito posterior no prueba que el fallo intermitente haya desaparecido. Se corrigieron fallos concretos de recuperación de TokXray, sin cambiar credenciales ni redirecciones del proveedor a ciegas. La validación en navegador normal se registra por separado; la simulación no equivale a Safari físico.

La propiedad de Search Console fue verificada por el propietario mediante HTML a las 18:40. El archivo sigue publicado. Esto no equivale a aprobación de la marca OAuth. La consola había indicado esperar 24 horas antes de repetir la revisión. Si vuelve a rechazar propiedad, la documentación actual de Google pide verificar una **propiedad de dominio mediante DNS**, desde la cuenta propietaria del proyecto. No se contrató un dominio personalizado de Supabase ni se alteró DNS en esta entrega.

Fuentes oficiales: [marca y acceso con Google en Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google), [verificación de dominio para OAuth](https://support.google.com/cloud/answer/13804266).

## Bloqueo real de enlaces nuevos

El enlace `https://www.tiktok.com/@julietaskin/video/7697123951268384021` fue rechazado a las 18:45:13 de México con HTTP 403, `platform-feature-disabled`. No tuvo `run_id`, por lo que no empezó a descargar ni llegó a Gemini.

Apify, cuenta Eduardo/Personal `queueing_pungi`, muestra **US$5.85 usados de US$5**, funciones detenidas y próximo período gratuito el 28 de octubre. La ejecución histórica `14bFl8UD5Fi53jEoa`, que figura en TokXray, aparece en esa cuenta y fue iniciada por API.

La pantalla de contratación quedó preparada en **Starter mensual, US$19**, consumo incluido US$19 y excedentes por uso. No hay tarjeta ni datos de facturación guardados. No se contrató el plan ni se introdujeron datos de pago. La reactivación requiere que el propietario complete ese paso; después se debe probar el enlace nuevo de extremo a extremo.

Se verificó en producción que el enlace anterior `https://www.tiktok.com/@julietaskin/video/7652957372519959828` devuelve el guion y el análisis ya almacenados. Eso comprueba la reutilización del catálogo, no una descarga nueva.

## Qué aporta DailyVirals y qué adaptamos

Revisión exclusivamente pública, sin comprar suscripción. Sitios observados: [catálogo](https://www.thedailyvirals.com/), [ranking por GMV](https://www.thedailyvirals.com/videos/conversions) y sección Product mediante navegación pública.

| Patrón visible | Utilidad para TokXray | Decisión |
| --- | --- | --- |
| Separar popularidad y ventas; elegir período | Evita elegir solo por vistas | Mantener filtros de ventas, unidades, vistas y período ya existentes |
| Producto, mejores videos y datos en el mismo recorrido | Reduce pasos entre detectar producto y estudiar una referencia | Mantener enlaces producto ↔ videos; priorizar mejores videos por ventas en la siguiente importación |
| Ventas, comisión y presencia de creadores | Ayuda a valorar una oportunidad | Comparador nuevo en Oportunidades con objetivo de comisión editable |
| Saturation: videos publicados en 7 días | Puede señalar competencia reciente | Requiere conteo de publicaciones y período verificables; no sustituirlo por nuestro conteo de creadores |
| Crecimiento por período | Permite detectar impulso | Requiere dos reportes comparables; no fabricar crecimiento con vistas acumuladas |
| Collections / Second Brain / Sandbox | Conserva ideas y reduce trabajo repetido | Favorecer los favoritos existentes; posible siguiente paso: colecciones por producto/idea |
| Hooks, Transcribe, AI Rewrite, A/B Compare y Readability | Conecta investigación con ejecución | La comparación de videos y estas herramientas están detrás del acceso pago; se vio su presentación, no su funcionamiento interno |
| Commission Boost | Incremento comercial de comisión mediante acuerdos | No ofrecerlo sin acuerdos reales con las marcas |

El paywall público mostraba US$55/mes y una referencia tachada de US$76. Es una observación puntual, no un precio permanente ni una prueba de rentabilidad. No se verificaron juegos funcionales: se observaron menús y herramientas, y el acceso restringido de A/B Compare.

El comparador implementado aporta interacción útil sin llamadas nuevas a IA. Una meta es un escenario del usuario, no una promesa. No debe mostrarse una tasa de conversión dividiendo ventas de un período entre vistas acumuladas de toda la vida del video.

## Validación

- 321 pruebas en 46 archivos aprobadas; TypeScript y compilación de producción aprobados. Aviso existente de paquetes grandes de Vite, sin error de compilación.
- Comparador probado con datos reales: meta de $1,000 MXN, comisiones de $159.70 y $24.90 → 7 y 41 ventas, respectivamente.
- Navegación móvil de 390 × 844 y escritorio comprobadas en Chrome. Esto no equivale a una prueba física de iPhone/Safari.
- Evidencias en `output/launch-fixes-2026-10-16/`.

## Pendientes concretos

1. Activar capacidad de Apify y comprobar el enlace nuevo que reportó el propietario.
2. Si el error 400 reaparece fuera del simulador, conservar la URL de error sin compartir tokens ni credenciales para aislar su origen. Una prueba física de iPhone/Safari sigue siendo complementaria.
3. Completar la revisión de marca de Google cuando permita reintentar.
4. Alimentar los mejores videos de los 20 creadores con reportes por ventas y períodos explícitos; no confundir ranking de lives con ranking de videos.
