# Adbroll — Landing + App Redesign Brief

**Phase:** 1 THINK (gstack `/office-hours`, Startup mode)
**Branch:** `overhaul/gstack-landing-app`
**Baseline commit:** `66bee1e` (Phase 5 instrumentation shipped: Sentry + PostHog + Meta Pixel, 11/11 tests green)
**Date:** 2026-04-12
**Owner:** Eduardo (founder, sole operator, **founder-is-ICP**)
**Status:** Draft → adversarial review pending

---

## 1. Problem Statement

Rediseñar la landing pública (`/`) y las pantallas principales de la app autenticada (`/app`, `/products`, más 2 secundarias demoted a nav) para convertir tráfico frío de Meta Ads ($200 MXN/día) a trials pagos de Adbroll ($499 MXN / $25 USD al mes) y retener a los primeros usuarios el tiempo suficiente para ver el primer "aha moment" — copiar un guión del Top 20 y publicarlo en menos de 10 minutos.

El rediseño actual no es cosmético. Es una reescritura del contrato que la marca hace con el creador mexicano de TikTok Shop que está empezando: *"Dejá de adivinar qué grabar. Esto es lo que está vendiendo hoy. Acá está el guión. Grabá."*

**Not in scope:** variant generator ("pega un video, obtén 5 remixes"), analytics dashboard de cuenta propia, integraciones con TikTok Shop API, equipo de ventas. Estas son distracciones del wedge.

---

## 2. Demand Evidence (lo que sabemos)

**Señal más fuerte:** Eduardo es el ICP. Paul Graham lo llama "scratching your own itch" y es la señal más alta que YC busca en founders sin revenue validado. Eduardo reporta que él mismo:

- Copia scripts de creadores que sigue en TikTok
- Mira números de ventas para tomar decisiones de qué grabar
- Se motiva (aspiracional / dopamina) viendo cuánto ganan otros creadores
- Quiere variantes de guiones para no quemar el mismo ángulo dos veces
- Quiere pegar un video externo y obtener remixes de ese guión

**Señal secundaria:** Ha hablado con otros creadores que empiezan en TikTok Shop y manifiestan querer algo como Kalodata pero más barato y más accionable.

**Señal de mercado:** Existen incumbentes — Kalodata (caro, data-heavy, no mexicano), The Daily Virals, Social1.ai — que validan que el formato "videos que más venden + análisis" tiene demanda global. Ninguno está obsesionado con México + guión listo para copiar.

**Lo que no tenemos todavía:** cero paying users, cero trials completados, cero landing CTR verificado. El MVP está construido pero la validación de demanda con dinero real empieza *con este rediseño + la pauta Meta*.

---

## 3. Status Quo (lo que el usuario hace hoy sin Adbroll)

El competidor real de Adbroll **no es Kalodata**. Es el propio feed de TikTok del creador.

Hoy, un creador mexicano de TikTok Shop que quiere saber qué grabar:

1. Abre TikTok y hace scroll reactivo en su feed personal
2. Copia (mal) a los creadores que ya sigue, siempre llegando tarde al trend
3. Adivina qué producto promover basándose en vibes
4. Graba, publica, no vende, se desmotiva
5. Repite

Este ciclo es gratis, es cómodo, y es **exactamente lo que está frenando al creador de crecer**. Adbroll tiene que cumplir una promesa falsificable: **"El Top 20 de TikTok Shop México de hoy, con guión listo, en 30 segundos desde que abrís la app."** Si un creador no llega del login al guión copiado en ≤30s, el producto no está cumpliendo el status-quo-break.

---

## 4. Target User & Narrowest Wedge

**ICP (Ideal Customer Profile):**
- Creador mexicano de TikTok Shop, 0–10K seguidores, entre 0 y $20K MXN/mes en comisiones
- Tiene TikTok Shop activo pero inconsistente: publica 3–5 videos por semana, no todos venden
- Le duele no saber qué grabar. Le duele más ver que otros creadores venden más y no entender por qué
- Paga $499 MXN al mes sin pestañear si le ahorra 4 horas de investigación semanal y le da una pista de qué grabar mañana

**Narrowest Wedge — una sola promesa, repetida sin vergüenza:**

> **"Los 20 videos que más vendieron hoy en TikTok Shop México, con el guión listo para copiar."**

Todo lo demás — dashboards, filtros, oportunidades, herramientas — es ruido hasta que esta promesa esté validada con dinero.

---

## 5. Constraints

**Técnicas:**
- Stack fijo: Vite + React + TypeScript + Supabase + shadcn/ui + Tailwind + framer-motion
- Lovable bidirectional sync en proyecto `a76da93c-777c-4cf9-858a-c186df3c7b56` — cualquier cambio de archivo se refleja en Lovable tras `git push`. **Riesgo a mitigar en Phase 2:** los re-syncs de Lovable pueden sobrescribir componentes y stompear tokens personalizados. Mitigación: consolidar design tokens en un único `src/styles/tokens.css` + extender `tailwind.config.ts` con los tokens (no inline colors en componentes), y añadir un smoke test post-sync que verifica que `#FE2C55` / `#25F4EE` / `JetBrains Mono` sobreviven
- Infra de datos: Kalodata como fuente. Refresh diario. No hay ingestión en tiempo real
- Phase 5 instrumentación ya commiteada: Sentry + PostHog + Meta Pixel con eventos reservados para Phase 4b Opportunities (`OpportunityViewed`, `OpportunityExpanded`, etc.)

**De negocio:**
- Solo-founder. Cero equipo. Presupuesto de ingeniería real: **~20 horas/semana** disponibles de Eduardo + agentes
- Presupuesto Meta Ads: $200 MXN/día = ~$6K MXN/mes = margen para ~12 trials pagos al mes para empatar
- Meta de tres meses: 1,000 usuarios pagos. Requiere ~11 signups/día a partir del mes 2
- Idioma: es-MX non-negotiable. Precio en MXN primero, USD secundario

**De producto:**
- Mobile-first iPhone 14 (390px) — el creador de TikTok vive en su teléfono. Desktop es secundario
- Brand: `#FE2C55` rosa TikTok + `#25F4EE` azul TikTok + neutros
- Typography: Inter (UI) + JetBrains Mono (datos, números, "hacker credibility")
- Performance budget landing: Lighthouse Perf >85, SEO 100, A11y >95, LCP <2.5s, CLS <0.1
- Copy de landing: **emocional / aspiracional**, no lista de features

**De autonomía:**
- Eduardo autorizó ejecución autónoma completa para este ciclo. No pausamos para consensuar cada decisión de copy — entregamos y él corrige.

---

## 6. Premises (aceptadas por el founder)

1. **P1 — Founder-is-ICP es nuestra señal principal, con falsificador.** Hasta que haya 10 paying users externos, cada decisión de producto se valida contra "¿Eduardo lo usaría mañana en la mañana antes de grabar?" **Falsificador explícito (Day 14):** 3 creadores NO-Eduardo (0–10K seguidores, TikTok Shop MX activo) tienen que completar el loop "abrir app → elegir video del Top 20 → copiar un guión → decir qué van a grabar" en ≤10 minutos, sin ayuda, en su propio teléfono, sesión grabada. Si 0 de 3 lo logra, P1 queda invalidada y el producto necesita rediseño de onboarding antes de escalar Meta Ads. Eduardo es dev + creador, su pain threshold no es el de la mediana: el test externo es non-negotiable.
2. **P2 — El competidor real es el feed de TikTok del creador**, no Kalodata. La landing y la app tienen que ser 10x más útiles que scrollear.
3. **P3 — El wedge es Top 20 + guión listo.** Todo lo demás (oportunidades, tools, dashboards) se posterga o se demota a nav secundario hasta que el wedge tenga retención.
4. **P4 — La landing es emocional / aspiracional, no racional.** Dopamina de "mirá cuánto ganó este creador", no tabla de features.
5. **P5 — Mobile-first es literal.** Diseñamos en 390px. Desktop es el caso derivado. Cualquier interacción que no funcione con pulgar se rechaza.
6. **P6 — Guión listo ≠ un bloque de texto.** Ofrecemos 3 versiones: transcrito, IA-optimizado (seguro), IA-agresivo (viral-bait). El creador elige cuál copia.
7. **P7 — El variant generator ("pegá tu video, obtené 5 remixes") es scope creep, no lo construimos.** En vez de anunciarlo como "Coming next" (vapor que la comunidad mexicana de creadores de TikTok Shop huele de inmediato — hablan entre sí en WhatsApp), lo tratamos como **research survey dentro de la app**: *"¿Te interesaría una herramienta que analice tu propio video y te dé 5 remixes del guión?"* → sin fecha, sin label de "coming soon", sin FOMO copy. El email no se captura para waitlist; se captura para entrevista de 15 min con incentivo ($200 MXN). Eso genera datos reales, no expectativa rota.
8. **P8 — Precio se muestra primero en MXN** ($499), USD como tooltip/aclaración ($25). Psicología mexicana: pesos primero sin excepciones.

---

## 7. Approaches Considered

### Approach A — Wedge Obsession (RECOMMENDED)

**Qué es:** Rediseñamos únicamente las pantallas que tocan el wedge (`/`, `/app`, `/products`) y demotemos `/favorites`, `/creadores`, `/afiliados`, `/admin` a hamburger / nav secundario. La pantalla más importante del producto es `/products` (el Top 20) y la más importante del embudo es `/` (la landing). Todo lo demás se preserva funcional pero visualmente austero.

**Esfuerzo:** M (1–2 semanas calendario para 1 founder a tiempo parcial con agentes)
**Riesgo:** Bajo. Cambios están contenidos a 3 pantallas críticas
**Upside:** La pauta Meta arranca con una landing que sabe exactamente qué promete. Retención del trial se decide en `/products`, que recibe todo el cariño.

### Approach B — Full Redesign (NOT recommended)

**Qué es:** Rediseñamos las 8 pantallas con el mismo nivel de pulido.

**Esfuerzo:** XL (4–6 semanas)
**Riesgo:** Alto. Cada semana sin pauta corriendo es dinero quemado en oportunidad. El founder se distrae en cosmética de pantallas que 5 % de los usuarios verán.
**Upside:** Marca más coherente. Pero coherencia sin retención es vanidad.

### Approach C — Landing-only (NOT recommended)

**Qué es:** Solo tocamos `/`. La app se queda tal cual.

**Esfuerzo:** S (3–5 días)
**Riesgo:** Medio. Atraemos tráfico a una app que se siente vieja. El trial se cae al segundo click dentro de la app.
**Upside:** Velocidad. Pero velocidad sin retención es churn pagado.

---

## 8. Recommended Approach — A (Wedge Obsession)

**Razón en una línea:** Con founder-is-ICP, cero paying users validados y pauta Meta arrancando, la disciplina del wedge y el time-to-learn-from-market importa 10x más que la elegancia arquitectónica de pantallas que el usuario casi no visita.

### Pantallas en scope

| Pantalla | Ruta actual | Prioridad | Rol en el embudo |
|---|---|---|---|
| Landing pública | `/` | **P0** | Convertir tráfico frío Meta → registro |
| Top 20 del día | `/products` | **P0** | "Aha moment" — el creador ve los videos que venden y copia un guión |
| Dashboard de entrada | `/app` | **P1** | Reducir fricción post-login: un solo CTA claro → "Ver el Top 20 de hoy" |
| Creator spotlight (inline) | integrado en `/products` y `/app` | **P1** | Preservar el hook emocional "mirá cuánto ganó este creador" sin requerir visitar `/creadores` — tira de 3 creators con MXN del día, compartido entre ambas pantallas |
| Secundarias | `/favorites`, `/creadores` (pantalla completa), `/afiliados`, `/admin` | **P2** | Mantener funcional, estética sobria, demotar en nav secundario / hamburger |
| No-touch este ciclo | `/afiliados`, `/admin`, `/videos/...` | — | Preservar tal cual |

### Elementos core del rediseño

**Landing (`/`):**
- Hero emocional con ángulo dopamina: "Mirá cuánto ganó [creador real] ayer con este video de 27 segundos"
- Mock del Top 20 con números reales (aunque sean estáticos en Phase 2) y **JetBrains Mono** en los MXN para credibilidad
- Un solo CTA primario: "Ver el Top 20 de hoy — gratis 3 días"
- Proof social: logos de Kalodata como fuente, captura de Meta Ads real corriendo, testimonio del propio Eduardo
- Sección "Coming next" con el variant generator + captura de email (FOMO)
- FAQ corta (4 preguntas máx, la más importante: "¿Por qué no uso Kalodata?")
- Price reveal: $499 MXN grande, $25 USD chico
- Meta Pixel `Lead` en submit del email

**Top 20 (`/products`):**
- Lista mobile-first, scroll vertical, cada fila es una tarjeta tactile con pulgar
- Por tarjeta: thumbnail del video, producto, MXN vendidos ayer, CTA "Ver guión"
- Modal de guión con tabs: **Transcrito / IA optimizado / IA agresivo**
- Botón "copiar" con feedback háptico
- Estado vacío: jamás. Si no hay datos, mostrar el Top 20 de ayer con badge "actualizando".

**Dashboard (`/app`):**
- Un solo call-to-action: "Ver el Top 20 de hoy". Todo lo demás es micro-stat inferior
- Racha (streak): "Llevas 4 días mirando tu Top 20 antes de grabar". Dopamina.
- Sección "Último guión copiado" para fomentar volver
- Nav secundario colapsado en hamburger

**Design system (extiende lo existente):**
- Tokens: rosa `#FE2C55`, azul `#25F4EE`, neutros grises, verde para números positivos
- Fonts: Inter 400/600/700 + JetBrains Mono 500
- Radio: 12px para cards, 8px para botones
- Sombra: sutil, una sola capa, mobile-only cuando haya elevación
- Motion: framer-motion pero con cautela — nada que retrase la primera interacción

---

## 9. Open Questions

1. **Q1 — Copy del hero:** ¿cuánta agresividad dopamina tolera Eduardo? Un hero tipo "Este creador ganó $14,320 MXN con un video de 27s" ¿es genuino (tenemos el dato en Kalodata) o necesita disclaimer?
2. **Q2 — Video demo en el hero:** ¿autoplay muted del loop "login → Top 20 → copiar guión" o screenshot estático? Autoplay compite con LCP.
3. **Q3 — Guión IA agresivo:** ¿riesgo de marca o de cuenta de TikTok si genera copy ban-worthy? ¿Disclaimer + rate limit?

**Bloqueantes resueltos antes de entrar a Phase 2 (no son open questions, son decisiones requeridas):**

- **D1 — Modelo de trial:** **3 días gratis CON tarjeta.** Razón: Meta Pixel `StartTrial` solo dispara con compromiso de pago, el CAC se vuelve calculable, y filtra tráfico de curiosidad del serio. Fricción aceptable dado que es founder-is-ICP y el wedge es claro. (Reemplaza la indecisión previa sobre freemium.)
- **D2 — Variant generator:** no se anuncia como "Coming next" en ningún lado. Solo existe como research survey dentro de la app (ver P7 revisado).

---

## 10. Success Criteria (cómo sabemos que funcionó)

**Prerequisito de Phase 2:** definir el **Event Contract** completo en `docs/design/event-contract.md` antes de cualquier código. El commit `66bee1e` reservó `OpportunityViewed / OpportunityExpanded / OpportunityFormatViewed / OpportunityToolClicked` pero **no existen todavía** los eventos que este brief requiere. Los nuevos eventos a definir (nombre, props, trigger, destino):

| Evento | Trigger | Props mínimas | Destino |
|---|---|---|---|
| `landing.viewed` | mount de `/` | `referrer`, `utm_source`, `utm_campaign` | PostHog + Meta `PageView` |
| `landing.cta_clicked` | click en hero CTA | `location` (hero/mid/footer) | PostHog + Meta `Lead` |
| `trial.started` | signup completado con tarjeta o flujo elegido | `plan`, `mxn_amount` | PostHog + Meta `StartTrial` |
| `top20.loaded` | `/products` render con datos | `video_count`, `freshness_hours` | PostHog |
| `guion.modal_opened` | apertura modal de guión | `product_id`, `rank` | PostHog |
| `guion.variant_selected` | tab en modal | `variant` (transcrito/ia_optimizado/ia_agresivo) | PostHog |
| `guion.copied` | click copiar | `product_id`, `variant`, `time_to_copy_ms` | PostHog + Meta `Customize` |
| `variant_research.email_submitted` | submit del survey research | `consent_interview` | PostHog (NO captura waitlist) |

Sin este contrato escrito y wired antes de Phase 3, las métricas de abajo no se pueden medir y el brief es un cheque sin fondos.

**Métricas de landing (primeras 2 semanas post-ship):**
- Lighthouse Performance ≥85 mobile, Accessibility ≥95, SEO = 100
- CTR de hero CTA: **floor 3 %** (baseline realista para SaaS cold-Meta en LATAM), **stretch 8 %**
- Cost per trial ≤$100 MXN con pauta Meta corriendo
- LCP <2.5s mobile, CLS <0.1

**Métricas de app (primeras 2 semanas post-ship):**
- ≥60 % de trials llegan a `/products` en la primera sesión (medido por `top20.loaded`)
- ≥30 % de trials disparan `guion.copied` en las primeras 24h
- Tiempo desde login hasta primer `guion.copied` ≤30s (P50)
- D1 retention ≥40 %, D7 ≥20 %

**Métricas de negocio (mes 1):**
- Primer paying user NO-Eduardo convertido
- 10 paying users al final del mes 1
- ≤$600 MXN CAC (blended)

**Test de wedge real (reemplaza la métrica de vanidad del founder):**
- **3 creadores externos, sesión grabada, Day 14:** completan "abrir app → elegir video del Top 20 → copiar un guión → articular verbalmente qué van a grabar hoy" en ≤10 minutos, en su propio teléfono, sin ayuda. **Criterio de éxito: ≥2 de 3.** Si 0 ó 1 lo logra, P1 está invalidada y la decisión es rediseñar el onboarding antes de escalar Meta.

---

## 11. Distribution Plan

- Canal 1: **Meta Ads** ($200 MXN/día) con creativos que espejean el Top 20 real. Cada anuncio muestra un video que vendió ayer con el número de MXN arriba
- Canal 2: **El propio TikTok de Eduardo**, grabando 1 video/día donde Eduardo usa Adbroll en vivo y muestra cómo eligió el guión
- Canal 3: **SEO es-MX** de cola larga: "top videos tiktok shop México hoy", "cuánto ganan creadores tiktok shop México". La landing optimiza para esto
- Canal 4: **Waitlist del variant generator** como mecanismo de remarketing: quien deja email pero no paga recibe drip de los Top 20 de la semana

No hay canal de ventas outbound. No hay equipo de partnerships. Solo-founder con agentes.

---

## 12. The Assignment (lo que construimos ahora)

1. Este brief, committeado en `docs/design/landing-app-redesign-brief.md` ✅
2. **Phase 2 PLAN:** `/design-consultation` (design system extendiendo tokens existentes) → `/design-shotgun` (4 variantes de landing: A data-heavy, B demo-first, C proof-first, D urgencia/oferta) → `/design-html` (materializar en HTML estático la variante elegida) → `/autoplan` (descomponer en tasks de implementación)
3. **Phase 3 BUILD:** tokens → componentes base → `Landing.tsx` → `Dashboard.tsx` + `Products.tsx` → pantallas secundarias austeras
4. **Phase 4 REVIEW:** `/review` (código) + `/design-review` (browser binary gstack)
5. **Phase 5 TEST:** `/qa` — Lighthouse mobile, opengraph.xyz, tests unit y smoke existentes siguen verdes
6. **Phase 6 SHIP:** `/ship` — PR `overhaul/gstack-landing-app` → `master`, deploy a Lovable vía `git push`
7. **Phase 7 REFLECT:** `/retro` + `/learn` — qué aprendimos del founder-is-ICP y qué premisa se rompió

---

## 13. What I Noticed (founder signal synthesis)

Lo que llama la atención de las respuestas de Eduardo en el diagnóstico:

- **Señal YC clara:** "Yo soy el ICP" es la respuesta que Paul Graham y Garry Tan buscan. No es un founder buscando un mercado; es un usuario resolviendo su propia fricción. Ese tipo de founder suele entender el producto a una profundidad que los competidores no pueden simular con research.
- **Claridad del wedge bajo presión:** cuando forcé la pregunta "¿cuál es el wedge más estrecho?", la respuesta fue instantánea y específica ("Top 20 + guión listo"). Founders sin claridad del wedge tardan, dudan, negocian con el entrevistador. Eduardo no.
- **Instinto sobre copy:** Eduardo identificó sin que yo lo sugiriera que el landing debe ser emocional / aspiracional. Ese instinto sobre tono de marca es un diferencial real — muchos founders técnicos defaultean a feature lists y pierden el embudo frío.
- **Riesgo a vigilar:** el magnetismo del variant generator. Es el feature más "cool", el más compartible, y el que más se aleja del wedge validado. Lo aparcamos en P7 con disciplina — si el founder intenta moverlo a P0 en las próximas 2 semanas, lo tratamos como señal de scope creep y renegociamos.
- **Golden age:** Eduardo está en el momento más poderoso de un founder solo: producto construido, demand evidence propia, pauta lista para prenderse, cero deuda de clientes, cero equipo que manejar. Cada semana que pasa sin ship es oportunidad quemada. Velocidad > perfección en este ciclo.

---

## 14. Risk Register

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | CTR de landing <3 % después de 500 MXN gastados en Meta | Media | Alto ($) | Pausar pauta, cambiar hero copy a variante B (proof-first), re-test con 500 MXN. Ver §16. |
| R2 | CAC real >$600 MXN en mes 1 | Media | Alto (runway) | Ver §16 rollback. Primer check a 7 días de Meta corriendo, segundo a 14 días. |
| R3 | Founder-is-ICP invalidado por test de 3 creadores externos (Day 14) | Media | Crítico | Pausar escalado de pauta, rediseñar onboarding antes de gastar más. |
| R4 | Lovable re-sync stompea tokens custom | Alta | Medio | Tokens consolidados en `tokens.css` + `tailwind.config.ts`, smoke test post-sync. Ver §5 Técnicas. |
| R5 | Eduardo mueve P7 (variant generator) a P0 por magnetismo | Alta | Medio | Disciplina del wedge. Si pasa, se trata como señal de scope creep y se re-negocia el brief antes de codear. |
| R6 | Kalodata como fuente de datos falla o cambia ToS | Baja | Crítico | Plan B: fallback a scraping propio + disclaimer de "última actualización". No in-scope de este ciclo. |
| R7 | IA agresivo genera copy que ban-ea cuentas de TikTok | Baja | Alto (marca) | Disclaimer en el modal + rate limit + prompt-engineering defensivo. Decisión en Q3 de §9. |
| R8 | Cero paying users convertidos en mes 1 | Media | Crítico | Ver §16 rollback. Gate duro: ≤10 users al día 30. |

## 15. Anti-Goals (lo que explícitamente NO construimos en este ciclo)

- **NO construimos el variant generator.** (Research survey sí; feature no.) Es scope creep y rompe el wedge.
- **NO rediseñamos `/admin`, `/afiliados`, `/videos/product/:id`, `/videos/creator/:id`.** Se preservan funcionales, visualmente austeros, sin cariño adicional.
- **NO agregamos onboarding multi-step con tour guiado.** El onboarding es: abrís, ves el Top 20, copiás un guión. Tutorial = fricción.
- **NO hacemos A/B test de precio en Phase 3.** Precio fijo $499 MXN. Cambiarlo antes de tener 10 paying users es optimización prematura.
- **NO agregamos analytics dashboard del usuario sobre sus propios videos.** Es TikTok Analytics gratis, y distrae.
- **NO integramos con TikTok Shop API.** Fuera de alcance. Todo el data flow sigue siendo Kalodata.
- **NO construimos login social (Google/Apple) si no está ya en Supabase.** Email+password basta para el MVP.
- **NO vamos a desktop-first ni "responsive luego mobile".** Mobile-first literal, desktop como efecto secundario.
- **NO invertimos en animaciones pesadas framer-motion.** Motion sutil o nada — cada KB compite con LCP.

## 16. Rollback Criteria (cuándo paramos y re-scopeamos)

El rediseño se considera un fracaso operacional y dispara rollback / re-scope si **cualquiera de estos triggers** se cumple:

- **T1 — CTR landing <3 % después de $500 MXN de gasto Meta.** Acción: pausar pauta, cambiar a variante de copy B, re-test con otros $500 MXN. Si sigue <3 %, el problema no es la landing; es el wedge o el targeting.
- **T2 — CAC >$600 MXN en los primeros 14 días de Meta corriendo.** Acción: pausar pauta, revisar audiencia Meta, revisar creatividades. Segundo test con $1,000 MXN. Si sigue >$600, pausa total y re-plan.
- **T3 — D1 retention <20 %.** Acción: investigar drop-off en PostHog. Probablemente `/app` o `/products` no están entregando la promesa del hero. Re-scope de la pantalla.
- **T4 — Test de 3 creadores externos (Day 14): 0–1 completan el loop en ≤10 min.** Acción: P1 invalidada. Parar escalado de pauta. Rediseño de onboarding.
- **T5 — 0 paying users externos al día 30.** Acción: pausa total de Meta, postmortem en `/retro`, re-evaluación del wedge. Trigger más duro de todos.
- **T6 — Eduardo mismo deja de abrir Adbroll durante 3 días seguidos en el ciclo de Phase 6 post-ship.** Señal de que el producto no cumple ni la promesa al founder. Prioridad máxima: entender por qué.

Rollback operacional significa: (a) pausar pauta Meta, (b) no avanzar con features nuevos, (c) correr `/retro` y `/learn`, (d) re-escribir este brief en lugar de parcharlo.

---

## 17. Review History

- **v0** — 2026-04-12, draft inicial Eduardo + office-hours agent
- **v1** — 2026-04-12, adversarial review (reviewer agent), 11 findings, 3 critical + 5 major + 3 minor, verdict: approve with edits
- **v2** — 2026-04-12, ediciones incorporadas: P1 falsificador, P7 reframe, §10 event contract + metric floor, §14 risk register, §15 anti-goals, §16 rollback, §5 Lovable token mitigation, §9 decisiones bloqueantes, §4 creator spotlight inline preservado

---

**Next action:** Phase 2 PLAN — `/design-consultation` (design system extendiendo tokens + consolidando en `tokens.css`) → definir `docs/design/event-contract.md` (prerequisito P3) → `/design-shotgun` 4 variantes → `/design-html` materializar → `/autoplan` tasks.
