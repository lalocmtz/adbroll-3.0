# Autoplan — Phase 3 BUILD task breakdown

**Phase:** 2 PLAN (`/autoplan` deliverable)
**Branch:** `overhaul/gstack-landing-app`
**Target:** ejecutar Phase 3 en ~20 horas de founder-time (con agentes). Tareas atómicas, testeables, y commiteables en solitario.
**Inputs consumidos:** [landing-app-redesign-brief.md](./landing-app-redesign-brief.md), [event-contract.md](./event-contract.md), [design-system.md](./design-system.md), [landing-shotgun.md](./landing-shotgun.md), [landing-prototype.html](./landing-prototype.html).
**Output esperado:** PR a `master` con la landing redesignada + `/app` + `/products` + instrumentación de eventos nuevos + 11/11 tests verdes y Lighthouse ≥85 mobile.

---

## Principios de la ejecución

1. **Commit atómico por task.** Ningún commit toca más de una preocupación. Esto facilita rollback y /review.
2. **Tests corren después de cada commit.** Si un commit rompe tests, se arregla en el siguiente commit antes de avanzar.
3. **Mobile-first literal.** Chrome DevTools emulando iPhone 14 (390×844) es el viewport canónico para todas las tareas de UI.
4. **No hardcoded colors.** Jamás `#FE2C55` en JSX. Siempre `bg-brand-pink` o la clase de Tailwind derivada.
5. **Sin i18n nuevo.** La landing queda en ES-hardcoded (como ya está). La migración a i18n queda fuera de alcance del ciclo.
6. **Data real si es posible, mock si no.** Para el hero story (Ana/Susana) usar al propio Eduardo como testimonio etiquetado "fundador" hasta obtener permisos externos.

---

## Tracks paralelos

Las tareas están agrupadas en 3 tracks. Los tracks se pueden ejecutar en paralelo si se usan múltiples agentes; dentro de un track, las tareas son secuenciales.

- **Track 1 — Foundation** (tokens, fuentes, atoms, event contract)
- **Track 2 — Landing pública `/`** (Landing.tsx + secciones nuevas)
- **Track 3 — App authenticada `/app` + `/products`** (Dashboard + Products + Guion modal)

```
Track 1 ──┬─ T1.1 ─ T1.2 ─ T1.3 ─ T1.4 ─ T1.5 ─ T1.6
          │
Track 2 ──┼─ (depende de T1.3) ─ T2.1 ─ T2.2 ─ T2.3 ─ T2.4 ─ T2.5 ─ T2.6 ─ T2.7
          │
Track 3 ──┴─ (depende de T1.3) ─ T3.1 ─ T3.2 ─ T3.3 ─ T3.4 ─ T3.5
```

---

## Track 1 — Foundation

### T1.1 — Fuentes web en `index.html`
**Esfuerzo:** 15 min
**Archivos:** `index.html`
**Qué:**
- Añadir `<link rel="preconnect" href="https://fonts.googleapis.com">` y `https://fonts.gstatic.com` (crossorigin)
- Añadir `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">`
**Verificación:** abrir `/`, inspector, ver que `Inter` y `JetBrains Mono` cargan en Network tab.
**Commit:** `feat(fonts): add Inter + JetBrains Mono via Google Fonts preconnect`

### T1.2 — Brand tokens en `src/styles/tokens.css`
**Esfuerzo:** 30 min
**Archivos:** crear `src/styles/tokens.css`, editar `src/index.css`
**Qué:**
- Crear el archivo `tokens.css` con **Layer 2** del design-system.md verbatim
- Importar desde `src/index.css` con `@import "./styles/tokens.css";` al final de `@layer base`
**Verificación:** `document.documentElement.style.getPropertyValue('--brand-pink')` devuelve `#FE2C55` en la consola
**Commit:** `feat(tokens): add brand tokens layer 2 (pink, cyan, ink, mist, mono)`

### T1.3 — Extender `tailwind.config.ts`
**Esfuerzo:** 45 min
**Archivos:** `tailwind.config.ts`
**Qué:** añadir bloque `theme.extend` con colors `brand.*`, `fontFamily.mono`, fontSize scale (`display-*`, `money-*`, `micro`), boxShadow custom, borderRadius `card/button/pill`, keyframes y animations del design-system.md §"Layer 1"
**Verificación:** `bun vite build` sin errores; `bg-brand-pink`, `font-mono`, `text-display-xl` aparecen en autocompletado
**Commit:** `feat(tailwind): extend config with brand colors, mono, display scale, tactile shadows`

### T1.4 — Button variants nuevos en `button.tsx`
**Esfuerzo:** 30 min
**Archivos:** `src/components/ui/button.tsx`
**Qué:** añadir variants `brand`, `brand-outline`, `cyber`, `ghost-dark` al `buttonVariants` cva. Añadir sizes `xl` (h-14).
**Verificación:** `<Button variant="brand" size="xl">Test</Button>` renderiza con `bg-brand-pink shadow-brand-glow-pink`
**Commit:** `feat(ui): add brand/cyber button variants with glow shadows`

### T1.5 — Event catalog extendido en `analytics.ts`
**Esfuerzo:** 40 min
**Archivos:** `src/lib/analytics.ts`, `tests/analytics.test.ts`
**Qué:**
- Añadir todas las claves nuevas al objeto `Events` (ver event-contract.md §"Cambios concretos")
- Añadir el timing helper `mark()` + `measureSince()`
- Añadir test que cubra 2 de los nuevos eventos (`TrialStarted`, `GuionCopied`) — mantener el patrón existente
**Verificación:** `bun test tests/analytics.test.ts` verde (ahora 7 tests en vez de 5)
**Commit:** `feat(analytics): extend event catalog for gstack landing + reserve partner_link_clicked`

### T1.6 — Atoms base: `MoneyNumber`, `BrandLogo`, `TrustBar`
**Esfuerzo:** 90 min
**Archivos:** `src/components/brand/MoneyNumber.tsx`, `src/components/brand/BrandLogo.tsx`, `src/components/landing/TrustBar.tsx`
**Qué:**
- `MoneyNumber` — prop `value: number`, `currency: "MXN" | "USD"`, `size: "xl"|"lg"|"md"`, `animate?: boolean`. Render con `font-mono text-money-*` + optional count-up animation via `useEffect + requestAnimationFrame` (sin framer-motion para no inflar bundle)
- `BrandLogo` — wordmark "adbroll" con el cuadrito gradient pink→cyan. Prop `size`
- `TrustBar` — recibe `stats: { num: string; label: string }[]`, grid 2x2 mobile / 4x1 desktop
**Verificación:** `/app` y `/products` no rompen visualmente cuando se agregan imports fantasma. Los atoms son importables desde `@/components/*`
**Commit:** `feat(atoms): MoneyNumber with count-up, BrandLogo, TrustBar`

---

## Track 2 — Landing pública `/`

**Unlock:** requiere T1.3 (Tailwind extend) como mínimo. Puede arrancar en paralelo con T1.4–T1.6 siempre que no importe atoms hasta T1.6 listo.

### T2.1 — Route tracker emite `landing.viewed` con UTMs
**Esfuerzo:** 30 min
**Archivos:** `src/App.tsx` (RouteTracker), `src/lib/analytics.ts` (helper)
**Qué:**
- Extraer `utm_source`, `utm_medium`, `utm_campaign`, `referrer`, `ref_code` de la URL y `document.referrer`
- Emitir `track(Events.LandingViewed, {...})` al mount de `/`
- Emitir `track(Events.PartnerLinkClicked, { ref_code, landing_path, utm_source })` si hay `ref_code` **una sola vez por sesión** (sessionStorage flag)
- Guardar `adbroll_ref` cookie 90 días si hay `ref_code`
**Verificación:** visitar `/?ref=TEST123&utm_source=meta` → ver 2 eventos en PostHog dev + cookie seteada
**Commit:** `feat(tracking): landing viewed + partner link clicked with cookie persistence`

### T2.2 — `Landing.tsx` — hero redesignado (narrativo + chip urgencia)
**Esfuerzo:** 90 min
**Archivos:** `src/pages/Landing.tsx`
**Qué:**
- Reemplazar el hero actual (líneas 100–321) con la estructura de `landing-prototype.html` §hero
- H1 narrativo "Ana se levantó a las 6am y vio que Susana ganó $14,320 MXN…" — usar `MoneyNumber` para el monto
- Chip urgencia `UrgencyChip` componente local con animación `pulse-soft`
- Hero video card con thumbnail placeholder (usar el video real del founder cuando lo suba — mientras tanto, gradient card + caption)
- CTAs primarios con `variant="brand" size="xl"` + `track(Events.LandingCtaClicked, { location: "hero", label: "..." })`
- Live counter "12 / 100" como componente `HeroCounter` — por ahora estático, se hidrata en Fase 7 CPP
**Verificación:** Chrome DevTools 390×844; hero ocupa 1 viewport; CTA tappable con pulgar
**Commit:** `feat(landing): narrative hero with urgency chip + variant E synthesis`

### T2.3 — `Landing.tsx` — creator spotlight strip
**Esfuerzo:** 40 min
**Archivos:** `src/pages/Landing.tsx`, `src/components/creators/CreatorSpotlight.tsx`
**Qué:**
- Crear `CreatorSpotlight` que recibe `creators: { handle: string; mxn: number }[]` — grid 3-col mobile, 6-col desktop
- Colocar strip inmediatamente debajo del hero con `bg-brand-ink text-white`
- Data mock inicial: @ana.skincare $14,320, @luis.gym $9,840, @itze.cocina $7,210 (mismos del prototype)
**Verificación:** visual parity con el prototype
**Commit:** `feat(landing): creator spotlight strip preserves aspirational loop`

### T2.4 — `Landing.tsx` — Top 20 mock mid-section
**Esfuerzo:** 60 min
**Archivos:** `src/pages/Landing.tsx`, `src/components/top20/Top20Card.tsx`
**Qué:**
- Crear `Top20Card` — props `{ rank, thumbnail, product, mxn, delta, creator }`
- Renderizar 5 filas en la landing con data mock + blur-overlay CTA "Desbloquear los 15 restantes →"
- CTA del overlay dispara `track(Events.LandingCtaClicked, { location: "mid", label: "unlock_top20" })`
- Usar `IntersectionObserver` para emitir `landing.pricing_viewed` equivalente para esta sección (opcional, nice-to-have)
**Verificación:** 390px, las 5 filas son tappables con pulgar sin zoom
**Commit:** `feat(landing): top20 mock with blur-unlock cta`

### T2.5 — `Landing.tsx` — guión demo + trust + pricing + FAQ + final CTA
**Esfuerzo:** 90 min
**Archivos:** `src/pages/Landing.tsx`, `src/components/guion/GuionPreview.tsx`
**Qué:**
- `GuionPreview` — versión light-weight del GuionModal (sin modal, inline) para la landing. 3 tabs, texto demo, botón "Copiar" que no hace nada en landing pero dispara `track(Events.LandingCtaClicked, { location: "guion_demo", label: "copy_demo" })`
- Trust stats migradas al nuevo `TrustBar` con los 4 stats mismos
- Pricing card con `gradient-ink` bg, price main con MoneyNumber, 5 benefits, CTA `btn-brand xl`
- FAQ con 4 items (de dónde vienen los datos, cancelación, qué incluye el trial, funciona si empiezo). `details/summary` nativo o el accordion shadcn existente
- Final CTA full-width con `gradient-brand` background
**Verificación:** scroll hasta footer sin gaps, LCP mide <2.5s en DevTools throttled "Slow 4G"
**Commit:** `feat(landing): guion preview, trust bar, pricing, faq, final cta sections`

### T2.6 — `Landing.tsx` — limpieza e i18n holding
**Esfuerzo:** 30 min
**Archivos:** `src/pages/Landing.tsx`, `tests/landing.smoke.test.tsx`
**Qué:**
- Eliminar las secciones viejas que ya no se usan (pain→solution, features grid, 3-step how it works, old testimonios)
- Actualizar el smoke test para reflejar los nuevos textos ("Ana se levantó a las 6am", "Yo también quiero", "Desbloquear los 15")
- Mantener el mock de `@/contexts/LanguageContext` y el `@/integrations/supabase/client` intacto
**Verificación:** `bun test tests/landing.smoke.test.tsx` — 6/6 tests actualizados + verdes
**Commit:** `refactor(landing): remove legacy sections + update smoke tests for variant E`

### T2.7 — SEO metadata + OG image
**Esfuerzo:** 30 min
**Archivos:** `index.html`, `public/og-image.png` (si no existe, generar con placeholder)
**Qué:**
- Title: "adbroll — Los 20 videos que más venden hoy en TikTok Shop México"
- Description: "3 días gratis. El Top 20 del TikTok Shop mexicano con el guión listo para copiar en menos de 60 segundos. Datos verificados de Kalodata."
- og:image: reuse existing or create a 1200×630 PNG with the hero story screenshot + gradient overlay
- JSON-LD script con `WebSite` + `Offer` + `FAQPage`
**Verificación:** validar con `https://opengraph.xyz/?url=https://adbroll.com` post-deploy
**Commit:** `feat(seo): landing meta tags + og image + json-ld for webpage + offer + faqpage`

---

## Track 3 — App authenticada

**Unlock:** requiere T1.3 + T1.4 + T1.6 (atoms).

### T3.1 — `GuionModal` — el "aha moment" component
**Esfuerzo:** 120 min
**Archivos:** `src/components/guion/GuionModal.tsx`, `src/components/guion/GuionModal.test.tsx` (nuevo)
**Qué:**
- Modal con shadcn `Dialog` como contenedor
- 3 tabs: Transcrito / IA optimizado / IA agresivo
- Cuerpo con el texto del guión (prop `scripts: { transcrito: string; ia_optimizado: string; ia_agresivo: string }`)
- Botón "Copiar guión" que llama `navigator.clipboard.writeText()` → feedback toast "Copiado ✓"
- Eventos disparados:
  - `guion.modal_opened` al abrir, con `mark("guion")` para medir time-to-copy
  - `guion.variant_selected` al cambiar tab
  - `guion.copied` al click con `measureSince("guion")` como `time_to_copy_ms`
- Focus trap + ESC close (shadcn Dialog ya lo hace)
- Unit test: abrir modal, cambiar tab, copiar → verifica que los 3 eventos se disparan con props correctas (usa el mock de `window.fbq` del test de analytics)
**Verificación:** tests verdes (+3 tests nuevos → total 14); tap en mobile 390px abre modal fullscreen
**Commit:** `feat(guion): modal with 3 variants + clipboard + full analytics instrumentation`

### T3.2 — `Products.tsx` — redesign mobile-first con Top20Card
**Esfuerzo:** 90 min
**Archivos:** `src/pages/Products.tsx`
**Qué:**
- Reemplazar el grid actual con una lista vertical de `Top20Card` (reusado de T2.4)
- Título "Top 20 · {fecha de hoy}" con `top20-freshness` indicator en verde
- Botón "Ver guión" en cada card abre `GuionModal`
- Emitir `top20.loaded` al mount con `{ video_count, freshness_hours }`
- Emitir `top20.row_clicked` al click en una fila (antes de abrir el modal)
- Preserve existing data fetching via `supabase.from('products').select(...)` — no tocar la layer de datos
**Verificación:** en 390px, scroll vertical fluido, tap abre modal, modal dispara 3 eventos
**Commit:** `feat(products): mobile-first top20 list with guion modal integration`

### T3.3 — `Dashboard.tsx` — single-cta entrance con streak
**Esfuerzo:** 60 min
**Archivos:** `src/pages/Dashboard.tsx`, `src/components/dashboard/StreakBadge.tsx`
**Qué:**
- Reemplazar el grid grande por un layout más vertical con **una sola CTA dominante:** "Ver el Top 20 de hoy →"
- `StreakBadge` — componente que recibe `days: number` y muestra "Llevas X días abriendo tu Top 20 antes de grabar" con ícono Flame
- Sección secundaria: "Último guión copiado" (si hay, query a una tabla `user_actions` o localStorage por ahora)
- Reusar `CreatorSpotlight` strip del Track 2 al pie del dashboard
- Demotear el `DashboardNav` sidebar actual a hamburger en mobile, conservar en desktop
- Dispatch `dashboard.viewed` al mount con `{ streak_days, last_seen_delta_hours }`
**Verificación:** 390px, el CTA primario es lo más prominente, secondary nav no roba atención
**Commit:** `feat(dashboard): single-cta entrance with streak badge + creator spotlight`

### T3.4 — `VariantResearchCard` en `/app` (reemplaza el waitlist)
**Esfuerzo:** 45 min
**Archivos:** `src/components/research/VariantResearchCard.tsx`, `src/pages/Dashboard.tsx`
**Qué:**
- Card persuasivo: "¿Te interesaría una herramienta que analice tu propio video y te dé 5 remixes del guión?"
- Input de email + checkbox "Sí, quiero una entrevista de 15 min a cambio de $200 MXN"
- Submit → Supabase `research_interest` tabla (crear migration si no existe, columnas `email`, `consent_interview`, `created_at`, `user_id` nullable)
- Dispatch `variant_research.viewed` al mount (una vez por sesión via sessionStorage flag), `variant_research.email_submitted` al submit con `{ consent_interview }`, `variant_research.dismissed` al cerrar
- Dismissible: botón "X" en el corner, guarda flag en localStorage para no mostrarlo de nuevo ese día
**Verificación:** submit guarda row en Supabase, PH events visibles
**Commit:** `feat(research): variant generator research survey card (P7 reframe)`

### T3.5 — Secondary routes austere pass
**Esfuerzo:** 45 min
**Archivos:** `src/pages/Favorites.tsx`, `src/pages/Creators.tsx`, `src/pages/Affiliates.tsx`, `src/pages/Admin.tsx`
**Qué:**
- **NO rediseñar.** Solo aplicar el nuevo design system: reemplazar `bg-blue-*` hardcodeados por `bg-brand-pink` donde corresponda, fonts por Inter default, shadows por `shadow-card`
- Verificar que el header de cada página usa `BrandLogo` en vez del logo viejo
- Preservar toda la lógica existente — funcional, no cosmética
**Verificación:** las 4 páginas abren sin errores, el style es coherente con la landing
**Commit:** `refactor(secondary): apply new design system to favorites/creators/affiliates/admin without functional changes`

---

## Budget estimado por track

| Track | Tareas | Tiempo total | Con buffer 20% |
|---|---|---|---|
| Track 1 (Foundation) | T1.1–T1.6 | 3h 50min | 4h 36min |
| Track 2 (Landing) | T2.1–T2.7 | 6h 30min | 7h 48min |
| Track 3 (App) | T3.1–T3.5 | 6h 0min | 7h 12min |
| **Total** | **18 tareas** | **16h 20min** | **19h 36min** |

20 horas/semana de constraint — cabe en una semana si las tareas se ejecutan en serie. Si se usan 2 agentes en paralelo (Track 2 y Track 3 simultáneos después de T1.3), el crítico path es ~12 horas reales.

---

## Checkpoints durante Phase 3

Después de cada track completo, correr:

```bash
cd /Users/eduardo/adbroll
bun run lint
bun tsc --noEmit
bun test
bun run build
```

Si alguna falla, NO avanzar al siguiente track. Arreglar en el track actual con un commit `fix(...)`.

Al final de Phase 3 (antes de Phase 4 REVIEW):

```bash
# smoke visual
bun run dev
# abrir Chrome DevTools, iPhone 14 emulation, visitar:
#  - /
#  - /login → register → /app
#  - /products
#  - /app con query ?ref=TEST123 (verificar PH event + cookie)
```

---

## Qué NO hacemos en Phase 3

- Fase 7 CPP (solo reservamos `partner_link_clicked` ahora, el resto queda en `docs/roadmap/fase-7-creator-partner-program.md`)
- Nuevas migraciones SQL (excepto la mini-tabla `research_interest` de T3.4)
- i18n (landing queda hardcoded en ES)
- Dark mode cosmético (los tokens ya soportan dark pero no rediseñamos visualmente)
- Email captures fuera del research survey
- Nuevos edge functions
- Refactor del sistema de auth o Stripe (intocables en este ciclo)

---

## Handoff a Phase 4 REVIEW

Cuando Phase 3 cierra, `/review` tiene que verificar:

1. Ningún `#FE2C55` hardcoded en JSX (grep)
2. Todos los eventos del event-contract.md §"Cambios concretos" están en `src/lib/analytics.ts`
3. `tsc --noEmit` limpio
4. Vitest 11+ tests pasan (baseline 11, nuevos 3 del GuionModal, nuevos 2 del Landing → ~16)
5. Lighthouse mobile: Perf ≥85, SEO 100, A11y ≥95 (corre en Phase 5)
6. El prototipo HTML y la landing real divergen ≤10% visualmente en 390px

Si algo falla, `/review` abre issues en el todo list de Phase 3 y no se sube a Phase 5 hasta resolver.

---

**Next action after Phase 2 commit:** arrancar Track 1 con T1.1 (fuentes en index.html).
