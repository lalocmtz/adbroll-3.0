# Event Contract — Analytics Taxonomy

**Phase:** 2 PLAN (prerequisito duro antes de Phase 3 BUILD)
**Branch:** `overhaul/gstack-landing-app`
**Source of truth:** este documento. Cualquier nuevo evento debe añadirse aquí **antes** de escribirse en código.
**Instrumentation baseline (commit `66bee1e`):** PostHog + Meta Pixel + Sentry. `src/lib/analytics.ts` exporta `track()`, `trackStandard()`, `trackPageView()`, `identify()`, `reset()`.

---

## Principios

1. **Un solo namespace, punto como separador:** `namespace.verb_object`. Ej: `landing.cta_clicked`, `guion.copied`.
2. **Past tense siempre:** `viewed`, `clicked`, `submitted` — nunca `view`, `click`.
3. **Props snake_case,** valores primitivos (string, number, boolean, ISO date string). No objetos anidados.
4. **Meta Pixel standard events** (Lead, StartTrial, Subscribe, CompleteRegistration) se disparan en paralelo con el evento PostHog custom, via `trackStandard()`. Un mismo momento puede disparar ambos; es correcto.
5. **Dedupe:** cada evento debe ser idempotente desde el cliente. Si un usuario hace click dos veces en el CTA, son dos eventos distintos — eso es señal, no ruido.
6. **No PII en props.** Nada de email, nombre, teléfono. Sí `user_id` anónimo de PostHog (no email), sí `ref_code` si corresponde.
7. **Backward compatible:** los eventos ya reservados en `66bee1e` (`landing.cta_clicked`, `landing.hero_video_selected`, `landing.faq_opened`, `opportunity.*`, `admin.upload_*`, `auth.*`, `dashboard.*`) **NO se renombran**. Se extienden.

---

## Tabla maestra

Leyenda de **Destino:** `PH` = PostHog capture, `Meta` = Meta Pixel standard o custom, `Sentry` = breadcrumb automático (via `track()` wrapper).

### Landing pública `/`

| Evento | Trigger | Props mínimas | Destino |
|---|---|---|---|
| `landing.viewed` | mount de `/` (RouteTracker) | `utm_source`, `utm_medium`, `utm_campaign`, `referrer`, `ref_code` (si hay) | PH + Meta `PageView` |
| `landing.cta_clicked` ✅ | click en cualquier CTA primario | `location` (`hero`/`mid`/`footer`/`pricing`), `label` | PH + Meta `Lead` |
| `landing.hero_video_selected` ✅ | click en tarjeta del mock Top 20 | `product_name`, `rank` | PH |
| `landing.calculator_used` | usuario mueve el slider ROAS/MRR | `input_value`, `output_value` | PH |
| `landing.faq_opened` ✅ | expand de FAQ item | `question_index` | PH |
| `landing.pricing_viewed` | hero pricing section 50 %+ visible (IntersectionObserver) | — | PH |
| `landing.footer_viewed` | footer 50 %+ visible | — | PH |

### Auth / registro

| Evento | Trigger | Props mínimas | Destino |
|---|---|---|---|
| `auth.register_submitted` ✅ | submit del form de registro | `ref_code` (si hay), `source` (`organic`/`partners`/`ad`) | PH |
| `auth.register_succeeded` ✅ | Supabase devuelve session | `has_ref_code`, `source` | PH + Meta `CompleteRegistration` |
| `auth.login_submitted` ✅ | submit login | — | PH |
| `auth.login_succeeded` ✅ | Supabase devuelve session | — | PH |
| `auth.logout` ✅ | logout explícito | — | PH |
| `trial.started` | primera subscripción creada en Stripe (desde webhook → client re-hydrate) | `plan`, `mxn_amount`, `stripe_subscription_id` | PH + Meta `StartTrial` |
| `subscription.activated` | primera invoice pagada (webhook) | `plan`, `mxn_amount` | PH + Meta `Subscribe` |

### Dashboard `/app` + Top 20 `/products`

| Evento | Trigger | Props mínimas | Destino |
|---|---|---|---|
| `dashboard.viewed` ✅ | mount `/app` | `streak_days` (si hay), `last_seen_delta_hours` | PH |
| `dashboard.video_opened` ✅ | click en VideoCard dentro dashboard | `video_id`, `product_id` | PH |
| `dashboard.script_opened` ✅ | click "Ver guión" desde dashboard | `product_id` | PH |
| `top20.loaded` | `/products` render con datos | `video_count`, `freshness_hours` | PH |
| `top20.row_clicked` | click en fila del Top 20 | `product_id`, `rank` | PH |
| `guion.modal_opened` | apertura del modal de guión en `/products` | `product_id`, `rank` | PH |
| `guion.variant_selected` | tab selected en modal | `variant` (`transcrito`/`ia_optimizado`/`ia_agresivo`) | PH |
| `guion.copied` | click botón copiar | `product_id`, `variant`, `time_to_copy_ms` (desde modal_opened) | PH + Meta `Customize` |

### Oportunidades (Phase 4b reservado — no tocar en este ciclo)

| Evento | Trigger | Status |
|---|---|---|
| `opportunity.viewed` ✅ | reservado Phase 4b | — |
| `opportunity.expanded` ✅ | reservado Phase 4b | — |
| `opportunity.format_viewed` ✅ | reservado Phase 4b | — |
| `opportunity.tool_clicked` ✅ | reservado Phase 4b | — |

### Variant generator research survey (P7 del brief)

| Evento | Trigger | Props mínimas | Destino |
|---|---|---|---|
| `variant_research.viewed` | render del survey card en `/app` | `surface` (`dashboard`/`landing`) | PH |
| `variant_research.email_submitted` | submit del email + consent | `consent_interview` (boolean) | PH |
| `variant_research.dismissed` | user cierra el card | — | PH |

### Admin (preservado)

| Evento | Trigger | Status |
|---|---|---|
| `admin.upload_started` ✅ | Phase anterior | — |
| `admin.upload_succeeded` ✅ | Phase anterior | — |
| `admin.upload_failed` ✅ | Phase anterior | — |

### Creator Partner Program (Fase 7 — reservados ahora)

Reservados en este contrato para que Fase 7 no tenga que re-tocar el archivo ni el Stripe webhook. Phase 3 de gstack **solo implementa** `partner_link_clicked` (porque afecta al tracking del ref_code en `/` y `/register`). El resto queda declarado pero sin handler hasta Fase 7.

| Evento | Trigger | Props mínimas | Destino | Phase |
|---|---|---|---|---|
| `partner_link_clicked` | visita con `?ref=CODIGO` | `ref_code`, `landing_path`, `utm_source` | PH | **3** (ahora) |
| `partner_program_viewed` | mount `/partners` | `source` | PH | 7 |
| `partner_calculator_used` | slider `/partners` | `input_referrals`, `projected_mrr_usd`, `tier_reached` | PH | 7 |
| `partner_signup_clicked` | CTA `/partners` | `location` (`hero`/`table`/`faq`) | PH | 7 |
| `partner_stripe_connect_started` | redirect a Stripe Connect onboarding | — | PH | 7 |
| `partner_stripe_connect_completed` | return de Stripe Connect con success | — | PH | 7 |
| `partner_code_copied` | click copiar ref_code en `/afiliados` | — | PH | 7 |
| `partner_link_shared` | click share button en `/afiliados` | `destination` (`whatsapp`/`tiktok`/`copy`) | PH | 7 |
| `partner_creative_submitted` | submit spark code en `/afiliados` | `has_spark_code` | PH | 7 |
| `partner_dashboard_viewed` | mount `/afiliados` | `tier`, `active_referrals_paid` | PH | 7 |
| `partner_materials_downloaded` | download desde tab Materiales | `material_id` | PH | 7 |
| `partner_conversion_created` | commission_event `initial_payment` creado (server-side via webhook → realtime → PH identify) | `commission_amount_usd`, `tier` | PH | 7 |

---

## Matriz de Success Criteria → Evento

Cross-ref con §10 del `landing-app-redesign-brief.md`:

| Métrica del brief | Evento(s) que la alimenta(n) |
|---|---|
| CTR hero CTA (≥3% floor / ≥8% stretch) | `landing.viewed` / `landing.cta_clicked` (location=`hero`) |
| Cost per trial ≤$100 MXN | `trial.started` + Meta Ads spend (dashboard Meta) |
| LCP <2.5s, CLS <0.1 | No evento: Lighthouse CI |
| ≥60 % trials llegan a `/products` | `trial.started` → `top20.loaded` |
| ≥30 % trials disparan `guion.copied` en 24h | `trial.started` → `guion.copied` within 24h |
| Tiempo login → primer `guion.copied` ≤30s P50 | `auth.login_succeeded` → `guion.copied` |
| D1 retention ≥40 %, D7 ≥20 % | `dashboard.viewed` o `top20.loaded` en días siguientes al trial |
| 2/3 creadores externos completan loop Day 14 | Manual (sesión grabada + eventos PH como backup) |

Sin esta tabla, la métrica es un deseo. Con esta tabla, la métrica es un query.

---

## Reglas de implementación

### Cliente (`src/lib/analytics.ts`)

- Extender el objeto `Events` con las nuevas claves **tal como aparecen en la tabla** (snake_case con punto). No inventar alias.
- Cada evento pasa por `track(Events.X, props)` — nunca llamar a `posthog.capture` directamente en componentes.
- Los eventos con Meta standard (`Lead`, `StartTrial`, `Subscribe`, `CompleteRegistration`, `Customize`) llaman a `trackStandard()` **adicionalmente**, no en vez de.
- Wrapper helper para timing (`timeSince(eventName)`): registra un timestamp al disparar un evento origen y lo resta cuando dispara el destino, devuelve `time_to_*_ms` como prop. Útil para `guion.copied time_to_copy_ms` y para el P50 login→guion.

### Server (`supabase/functions/stripe-webhook/index.ts`)

Los eventos `trial.started`, `subscription.activated`, y (Fase 7) `partner_conversion_created` se disparan server-side. Usar PostHog server SDK o escribir a una tabla `analytics_events` y correr un sync a PostHog.

### Cookie vs localStorage de ref_code

- `?ref=CODIGO` en landing → guardar en **cookie** de 90 días (`adbroll_ref`) AND `localStorage.adbroll_ref_code` (ya existe). Cookie es necesaria porque Safari intelligent tracking prevention borra localStorage después de 7 días de no-uso.
- Dispara `partner_link_clicked` una sola vez por sesión (flag en sessionStorage).

### Dedupe estricto

- Eventos con efectos financieros (`subscription.activated`, `partner_conversion_created`) se deduplican server-side por `stripe_event_id`. No confiar en cliente.

---

## Cambios concretos a `src/lib/analytics.ts` para Phase 3

Nuevas claves a agregar al objeto `Events` (además de las 15 ya reservadas):

```typescript
// Landing (nuevas además de cta_clicked/hero_video_selected/faq_opened)
LandingViewed: "landing.viewed",
LandingCalculatorUsed: "landing.calculator_used",
LandingPricingViewed: "landing.pricing_viewed",
LandingFooterViewed: "landing.footer_viewed",

// Trial / subscription
TrialStarted: "trial.started",
SubscriptionActivated: "subscription.activated",

// Top 20 + guion
Top20Loaded: "top20.loaded",
Top20RowClicked: "top20.row_clicked",
GuionModalOpened: "guion.modal_opened",
GuionVariantSelected: "guion.variant_selected",
GuionCopied: "guion.copied",

// Variant research
VariantResearchViewed: "variant_research.viewed",
VariantResearchEmailSubmitted: "variant_research.email_submitted",
VariantResearchDismissed: "variant_research.dismissed",

// Partner (solo uno para Phase 3, resto documentado)
PartnerLinkClicked: "partner_link_clicked",
```

Nuevo helper:

```typescript
// Timing helper — almacena marcas de tiempo para calcular time_to_*_ms
const marks = new Map<string, number>();
export const mark = (key: string) => marks.set(key, performance.now());
export const measureSince = (key: string): number | undefined => {
  const t = marks.get(key);
  return t !== undefined ? Math.round(performance.now() - t) : undefined;
};
```

---

**Next action:** escribir `docs/design/design-system.md` extendiendo los tokens existentes (`--primary 221 83% 53%`, radius `0.75rem`, fuentes por default) con los tokens de marca TikTok (`#FE2C55`, `#25F4EE`) y JetBrains Mono para números.
