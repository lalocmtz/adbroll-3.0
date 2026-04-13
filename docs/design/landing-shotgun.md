# Landing Shotgun — 4 variantes conceptuales

**Phase:** 2 PLAN (`/design-shotgun` deliverable)
**Branch:** `overhaul/gstack-landing-app`
**Objetivo:** producir 4 conceptos distintos de la landing `/` antes de elegir uno para materializar en HTML. Cada variante tiene una thesis única, un criterio de éxito diferente, y un riesgo distinto. El propósito no es "cuál es mejor" — es "cuál matchea mejor el momento del founder, la audiencia de la pauta Meta, y la promesa del brief".

**Contexto duro (del brief v2):**
- ICP: creador mexicano TikTok Shop 0–10K seguidores, $0–$20K MXN/mes comisiones
- Competidor real: feed de TikTok del creador (reactivo, gratis, cómodo)
- Wedge: "Los 20 videos que más vendieron hoy en TikTok Shop México, con guión listo para copiar"
- Tono: emocional / aspiracional, no feature list
- Precio: $499 MXN / $25 USD — $499 grande, $25 chiquito
- Trial: 3 días gratis **con tarjeta**
- Promesa falsificable: del login al guión copiado en ≤30s
- Variant generator: **NO waitlist** — research survey con $200 MXN incentivo
- Mobile-first 390px literal

---

## Variante A — "Data Heavy" (Kalodata-killer)

### Thesis
El creador mexicano que paga lo hace porque quiere data accionable, no inspiración. La landing debería verse como un terminal de Bloomberg pero para TikTok Shop: mucho número, mucho gráfico, mucho mono-type. La credibilidad viene de la densidad de información.

### Cuándo elegir A
- Cuando el CPC de Meta Ads sube y necesitamos filtrar audiencia **seria** (que quiere pagar $499 por data, no por curiosidad)
- Cuando el founder quiere diferenciarse frontalmente de Kalodata con "lo mismo pero MX-first + más barato"
- Cuando el ICP objetivo son creadores que **ya ganan algo** y quieren optimizar

### Layout (mobile 390px)

```
┌────────────────────────────────┐
│ [logo]             [Iniciar]   │  header
├────────────────────────────────┤
│                                │
│  TOP 20 · 12 ABR 2026         │  micro label (mono)
│                                │
│  $847K MXN                     │  money-xl (mono, brand-pink)
│  vendidos ayer por el top 20   │  display-md, negro
│                                │
│  [Ver el Top 20 de hoy →]      │  button brand xl, pulse-glow
│  3 días gratis · cancela cuando│  micro, mist
│                                │
├────────────────────────────────┤
│ LIVE · actualizado hace 2h     │  micro label, dot verde
│                                │
│ ┌──────────────────────────┐   │  Top20Card #1
│ │ [thumb] Serum Vit C 30ml │   │
│ │  $142,340 MXN · +18% ↑   │   │  mono + money color
│ │  Ana R. · 14.2K views    │   │
│ └──────────────────────────┘   │
│ ┌──────────────────────────┐   │  Top20Card #2
│ │ [thumb] Resistencia Kit  │   │
│ │  $98,120 MXN · +9% ↑     │   │
│ │  Luis T. · 22K views     │   │
│ └──────────────────────────┘   │
│ ┌──────────────────────────┐   │  #3...#5
│ │ ...                      │   │
│ └──────────────────────────┘   │
│ [+15 más →]                    │  ghost link
├────────────────────────────────┤
│ 4 STATS MONO                   │
│ 20 videos/día · 100% Kalodata  │
│ 2.8x ROAS · <2h freshness      │
├────────────────────────────────┤
│ "Así se ve el guión listo"     │  display-md
│ [MOCKUP MODAL GUION]           │  ilustración con 3 tabs
│  ▸ Transcrito                  │
│  ▸ IA optimizado ← [Copiar]    │
│  ▸ IA agresivo                 │
├────────────────────────────────┤
│ PRICING                        │
│                                │
│  $499 MXN                      │  money-xl
│  /mes · $25 USD                │  mist + mono
│                                │
│  ✓ Top 20 diario               │
│  ✓ Guión en 3 versiones        │
│  ✓ Sin anuncios                │
│  ✓ Cancela cuando quieras      │
│                                │
│  [Empezar 3 días gratis →]     │  button brand xl
├────────────────────────────────┤
│ FAQ (4 items)                  │
├────────────────────────────────┤
│ FOOTER                         │
└────────────────────────────────┘
```

### Copy claves
- H1: **"El Top 20 de TikTok Shop México — hoy, con el guión listo."**
- Sub: "Ayer, los 20 videos más vendidos del TikTok Shop mexicano movieron **$847,230 MXN**. Hoy te los entregamos antes de que grabe tu competencia."
- Ventajas: mono + check, 4 bullets
- Botón: "Ver el Top 20 de hoy →"

### Racional
- **Pro:** filtra curiosos (paywall visual), dispara credibilidad en 3 segundos, hereda el aprendizaje del stack Kalodata
- **Con:** frío emocionalmente, puede leer como "demasiado serio" para el creador que scrollea TikTok y quiere dopamina
- **Riesgo:** CTR alto de clickers pero bajo de trials si el copy no conecta emocionalmente
- **Success criteria:** CTR ≥8% (stretch), cost per trial ≤$150 MXN. Si cost-per-trial >$300, pivotar a B.

---

## Variante B — "Demo First" (Show, don't tell)

### Thesis
El creador no quiere leer una landing — quiere **ver el producto funcionar**. La landing es 80% demo interactiva del Top 20 real con el modal de guión pre-cargado, y 20% el resto. La promesa se demuestra, no se describe. Conversión viene del "ya probé, ahora quiero más".

### Cuándo elegir B
- Cuando el producto **visualmente ya está bien** y es más convincente verlo que leer sobre él
- Cuando la audiencia de Meta Ads es muy joven (18–25) y la attention span es <3s
- Cuando el founder quiere iterar copy rápido (el demo no cambia, solo el texto alrededor)

### Layout (mobile 390px)

```
┌────────────────────────────────┐
│ [logo]             [Iniciar]   │
├────────────────────────────────┤
│ Esto es lo que vendió ayer     │  display-md (2 líneas)
│                                │
│ [MOCK INTERACTIVO DEL TOP 20]  │  full-width, 55vh
│  • 20 cards scrollables        │
│  • Tap en una = abre modal     │
│    con los 3 guiones REALES    │
│  • Botón "Copiar" funcional    │
│    (copia al clipboard + toast)│
│  • Auto-scroll cada 3s si idle │
│                                │
├────────────────────────────────┤
│                                │
│  ¿Te gustó lo que viste?       │  display-sm
│                                │
│  [Crear cuenta gratis →]       │  button brand xl
│  Meta Pixel: Lead + trackCustom│
│                                │
├────────────────────────────────┤
│ "¿Cómo lo hacemos?" (3 pasos)  │  pequeño, no invade
│ 1. Kalodata nos da los datos   │
│ 2. IA transcribe cada video    │
│ 3. Tú copias el guión listo    │
├────────────────────────────────┤
│ Social proof: 3 testimonios    │
│ cortos con thumbnail + MXN     │
├────────────────────────────────┤
│ Pricing expandible (closed)    │  accordion compacto
│ Ver precio: $499 MXN/mes →     │
├────────────────────────────────┤
│ FAQ (3 items)                  │
├────────────────────────────────┤
│ FOOTER                         │
└────────────────────────────────┘
```

### Copy claves
- H1: **"Esto es lo que vendió ayer."** (minúsculo, casual, directo)
- Sub: (ninguno — la demo habla)
- Mid CTA: "¿Te gustó lo que viste? Crea tu cuenta gratis."
- Pricing collapsed: CTA secundario para no empujar conversión sin ganarla

### Racional
- **Pro:** máxima autenticidad. La promesa es demostrable antes de pedir nada. LCP alto si el mock pesa, pero la primera impresión es imbatible.
- **Con:** necesita que el mock tenga **data real** — si son números fake, la credibilidad colapsa. También es frágil en SEO (poco texto indexable).
- **Riesgo:** mock interactivo en hero compite con LCP (<2.5s). Hay que lazy-load inteligente y serve skeleton primero.
- **Success criteria:** tiempo en página ≥60s, CTR del mid CTA ≥12%, cost per trial ≤$120 MXN.

---

## Variante C — "Proof First" (Testimonios + aspiracional)

### Thesis
El creador que recién empieza compra si ve a **alguien como él** ya ganando con Adbroll. La landing es 60% proof social (creadores reales con sus ingresos), 30% promesa, 10% pricing. Apela al "si ellos pueden, yo también".

### Cuándo elegir C
- Cuando tengamos **3+ creadores reales** (o con permiso para usar su caso) con números creíbles
- Cuando el founder quiere apalancarse del propio producto como generador de proof (los usuarios del Top 20 son los testimonios)
- Cuando queremos atacar **audiencia fría que no conoce la marca** y necesita confianza antes de darnos su tarjeta

### Layout (mobile 390px)

```
┌────────────────────────────────┐
│ [logo]             [Iniciar]   │
├────────────────────────────────┤
│                                │
│ Ana se levantó a las 6am       │  display-lg (emocional)
│ y vio que Susana ganó          │
│ $14,320 MXN ayer con           │
│ este video.                    │
│                                │
│ [THUMB DEL VIDEO DE SUSANA]    │  hero visual (9:16)
│  $14,320 MXN · 27 segundos     │  caption mono
│                                │
│ Ana copió el guión.            │  display-sm
│ Hoy grabó su versión.          │
│                                │
│ [Yo también quiero →]          │  button brand xl
│ 3 días gratis · $499 MXN/mes   │  micro
├────────────────────────────────┤
│ CREATOR SPOTLIGHT strip        │  3 creadores reales
│ ┌─────┐ ┌─────┐ ┌─────┐       │
│ │Ana  │ │Luis │ │Itze │       │
│ │$14K │ │ $9K │ │ $7K │       │  mono, money color
│ └─────┘ └─────┘ └─────┘       │
│ "ganaron ayer con Adbroll"     │  micro
├────────────────────────────────┤
│ 3 pasos visuales con iconos    │
│ (Flame, Sparkles, Copy)        │
├────────────────────────────────┤
│ Mini mock del Top 20 (5 rows)  │
│ [Ver el Top 20 completo →]     │  ghost CTA
├────────────────────────────────┤
│ FAQ (4 items)                  │
├────────────────────────────────┤
│ Final CTA gradient card        │
│ "Tu primer guión en <2 min"    │
│ [Empezar gratis →]             │
├────────────────────────────────┤
│ FOOTER                         │
└────────────────────────────────┘
```

### Copy claves
- H1 (narrativo, no tagline): **"Ana se levantó a las 6am y vio que Susana ganó $14,320 MXN ayer con este video."**
- Follow-up micro-story: "Ana copió el guión. Hoy grabó su versión."
- CTA: "Yo también quiero →"

### Racional
- **Pro:** mejor que A y B para audiencia fría. La narrativa engancha, la data respalda, el CTA es directo ("yo también quiero"). Founder-is-ICP se respeta porque Eduardo puede ser su propio testimonio si no hay externos todavía.
- **Con:** depende de **tener data real** de Susana/Ana (o del propio founder). Si los nombres y números son ficticios, es un tiro al pie legal + ético. Hay que validar con creadores.
- **Riesgo:** requiere mantenimiento — cada semana deberías rotar el creador del hero para que no se gaste. Proceso adicional.
- **Success criteria:** tiempo en página ≥45s, CTR hero ≥10%, cost per trial ≤$100 MXN.

---

## Variante D — "Urgencia / Oferta" (conversion hack)

### Thesis
Los primeros 100 usuarios son los más caros. Usamos **urgencia real** (pauta arrancando, early-bird lockin) para forzar conversión en la primera visita. No es cosmético — el descuento 50% primer mes ya existe en `Register.tsx`; lo volvemos el eje del hero.

### Cuándo elegir D
- En las primeras 2–4 semanas de pauta, mientras el objetivo es **validar wedge + bajar CAC**, no branding
- Cuando necesitamos que cada visitante o convierte o se va (sin undecided que leen y vuelven)
- Cuando el founder está ok con un hero más "marketer" y menos "product" para las primeras 100 cuentas

### Layout (mobile 390px)

```
┌────────────────────────────────┐
│ [logo]             [Iniciar]   │
├────────────────────────────────┤
│ 🔥 50% OFF primer mes          │  chip brand-pink animado
│    solo para los primeros 100  │
│                                │
│ Ve los 20 videos que           │  display-lg
│ vendieron más en TikTok Shop   │
│ México ayer.                   │
│                                │
│ Con el guión listo para        │  display-sm, mist
│ copiar en menos de 60 segundos.│
│                                │
│  $249 MXN  $̶4̶9̶9̶                │  money-xl + strike
│  primer mes · luego $499/mes   │  micro mono
│                                │
│ [Reservar mi lugar →]          │  button brand xl pulse
│ 87 / 100 disponibles           │  live counter mono
│ (actualiza cada 30s via PH)    │
├────────────────────────────────┤
│ MOCK TOP 20 (3 rows + blur)    │
│ [Desbloquear los 17 restantes] │  soft CTA
├────────────────────────────────┤
│ 4 bullets                      │
│ ✓ Top 20 diario                │
│ ✓ Guión en 3 versiones         │
│ ✓ Datos de Kalodata            │
│ ✓ Cancela cuando quieras       │
├────────────────────────────────┤
│ Testimonio corto (1 solo)      │
├────────────────────────────────┤
│ FAQ (3 items)                  │
├────────────────────────────────┤
│ Final CTA: countdown hasta     │
│ que la oferta se cierra        │
│ (48h rolling desde visita)     │
├────────────────────────────────┤
│ FOOTER                         │
└────────────────────────────────┘
```

### Copy claves
- Chip: "🔥 50% OFF primer mes · solo para los primeros 100"
- H1: "Ve los 20 videos que vendieron más en TikTok Shop México ayer"
- Price callout: "$249 MXN ~~$499~~ primer mes"
- CTA: "Reservar mi lugar →" (no "Crear cuenta" — cambia el framing a scarcity)
- Live counter: "87 / 100 disponibles" (honesto, no fake — PostHog count real de users registrados)

### Racional
- **Pro:** más alta tasa de conversión por visitante, más fácil atribuir a Meta. Directo al grano. El descuento ya existe.
- **Con:** agresivo. Puede lastimar brand si se prolonga más de 4 semanas. Si la audiencia lee "spam marketer", rebota duro.
- **Riesgo:** **burnout de brand** si se deja corriendo indefinido. La urgencia honest-only: si hay 87/100 real, lo mostramos; si es fake, rompe todo.
- **Success criteria:** conversión visit→trial ≥5% (alto), cost per trial ≤$80 MXN. Se retira después de los primeros 100 trials o 30 días, whichever first.

---

## Comparativa lateral

| | A Data Heavy | B Demo First | C Proof First | D Urgencia |
|---|---|---|---|---|
| **Thesis** | Credibilidad via densidad | Show don't tell | Si ellos pueden, yo también | Scarcity + descuento |
| **Hero visual** | Top 20 mock estático | Top 20 interactivo | Thumb video del creador | Mock con blur + counter |
| **H1 emocional** | Medio | Bajo (minimalista) | **Alto** | Alto (urgency-driven) |
| **LCP risk** | Bajo | **Alto** | Medio (imagen hero) | Medio |
| **SEO indexable** | **Alto** | Bajo (poco texto) | Medio (narrativa) | Medio |
| **Dependencia data real** | Media | **Alta** | **Crítica** (testimonios) | Baja |
| **Trabajo de copy** | Medio | Bajo | Alto (narrativa) | Medio |
| **Trabajo de eng** | Medio | **Alto** (mock func) | Medio | Medio |
| **Riesgo brand** | Bajo | Bajo | Medio (si falso) | **Alto** (si se prolonga) |
| **CTR estimado** | 6–9% | 8–12% | 9–13% | **10–15%** |
| **Cost per trial estimado** | $150 | $120 | $100 | $80 |
| **Best fit momento** | Post-validation | Mid-launch | Launch | **Pre-launch/early pauta** |

---

## Recomendación de combo

El brief dice "tono emocional/aspiracional, no racional". Eso descarta **A** como ganador principal. El brief también dice "founder-is-ICP, cero paying users" — lo cual hace **C** peligroso porque no tenemos testimonios reales todavía (usaríamos el propio Eduardo, que es válido pero único data point). **D** es demasiado agresivo para ser el default largo plazo.

**Mi recomendación: construir C con bones de D.**

- **Hero narrativo de C** (Ana / Susana — usando a Eduardo si no hay otros testimonios verificables). Emocional, aspiracional, con permiso del titular del video.
- **Chip urgencia de D** (50% primer mes, primeros 100) **sin countdown fake** — solo el contador real de trials creados via PostHog.
- **Mock del Top 20 de A** como sección mid (5 rows, link "ver los 15 restantes")
- **Pricing compacto tipo B** (pricing collapsed hasta que el user scroll, para no asustar antes de ganarlo)

Esto es la **"Variante E" sintetizada** — y es la que materializamos en `landing-prototype.html` como deliverable de `/design-html`.

### Qué se valida con cada parte

- Hero C narrativo → engagement emocional (tiempo en página)
- Chip D de urgencia → empuje de conversión en primera visita
- Mock A como mid → credibilidad data-driven sin frialdad
- Pricing B collapsed → reduce el "pricing shock" prematuro

### Rollback plan

Si en los primeros 500 MXN de pauta el CTR está <3% (T1 del risk register), pivotar a variante **D pura** durante 500 MXN más. Si sigue <3%, el problema no es la landing — es el wedge o el targeting — y se dispara `/retro`.

---

## Decisión pendiente de founder (no bloqueante)

Estas 3 quedan como inputs a Phase 3 para que Eduardo responda mientras se construye:

1. ¿Tenemos permiso de usar un creador real (nombre, thumb, MXN ganados) en el hero de C, o usamos al propio Eduardo como single testimonio?
2. ¿Qué número es el "live counter" de la chip de urgencia inicialmente — 0/100 (arranque honesto) o partimos de 12/100 (social proof baseline)?
3. ¿El hero lleva **video autoplay muted** del creador, **screenshot animado**, o **ilustración estática** — decisión de LCP?

Defaults si Eduardo no responde antes del build: (1) Eduardo como único testimonio, etiquetado como "fundador", (2) empezar en 0/100 honesto, (3) ilustración estática + hover/tap para reveal animado.

---

**Next:** materializar la Variante E sintetizada en `landing-prototype.html` estático, reviewable en browser, con todos los tokens definidos.
