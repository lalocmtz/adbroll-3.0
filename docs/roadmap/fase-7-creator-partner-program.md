# Fase 7 — Creator Partner Program (CPP)

**Status:** Spec congelado. Arranca después de mergear `overhaul/gstack-landing-app` + 2 semanas de data real con pauta Meta corriendo.
**Branch objetivo:** `overhaul/fase-7-creator-partner-program`
**Prerequisito duro:** Fase 6 gstack shipeada + `docs/design/event-contract.md` con los `partner_*` events ya wired.
**Razón del orden:** Un Creator Partner Program sin landing que convierta es pagarle a creadores para mandar tráfico a un embudo roto. Además, el CPP depende de atribución Stripe → PostHog → métricas de MRR por canal, y esa plomería se monta una sola vez.

---

## Contexto que ya existe en el repo

- Tablas: `affiliates`, `referrals`, `affiliate_codes`, `affiliate_payouts`, `affiliate_discounts`, `affiliate_agencies`, `withdrawal_history`
- Stripe Connect Express accounts (MX) integrado
- Edge functions: `affiliate-create-connect`, `affiliate-dashboard-link`, `affiliate-process-payouts` (weekly), `affiliate-update-code`
- Página `/afiliados` con earnings, referrals list, Stripe Connect onboarding
- 50% descuento primer mes para referidos desde `Register.tsx`
- Hooks: `useAffiliate`, `useReferralCode`

---

## Modelo económico (congelado)

- Suscripción base: **$499 MXN / $25 USD mes**
- Creador refiere usuario → usuario paga con su código → creador gana **20% recurrente** mes tras mes mientras el usuario siga activo
- Pago base: **$5 USD/mes** por cada suscriptor activo referido
- 100 referidos activos = $500 USD/mes recurrente
- Payouts **semanales automáticos**, mínimo $50 USD acumulados
- Spark Code amplification: el creador sube su TikTok con Spark Code, Eduardo lo amplifica con Meta Ads — el creador gana más reach y más conversiones sin pagar nada, Eduardo gana creatives validados + data
- **Clawback de 30 días:** si el referido cancela antes de 30 días, el partner no cobra esa comisión (protege cash flow, evita abuso)
- **Tiers escalados** (ver tabla abajo) — recompensa volumen real, castiga al que hace 1 video y desaparece

### Tabla de tiers

| Tier      | Referidos activos | Comisión | Bono por creative amplificado | Extras                                    |
|-----------|-------------------|----------|-------------------------------|-------------------------------------------|
| Partner   | 0+                | 20%      | —                             | Payouts semanales                         |
| Plata     | 5+                | 25%      | +$10/creative                 | Todo lo anterior                          |
| Oro       | 20+               | 30%      | +$25/creative                 | Soporte prioritario, acceso beta          |
| Platino   | 50+               | 35%      | +$50/creative                 | Todo + partnerships directos con Eduardo  |

### Lo que explícitamente NO incluye este modelo

- Pago desde día 1 sin clawback (abuso-prone)
- Niveles piramidales tipo MLM (nivel 2, 3, etc. — rojo legal)
- Cash bonuses arbitrarios por registro (caro y atrae spam)
- Comisiones sobre ventas de tools/add-ons futuros (se agrega después si existen)

---

## Requisitos del sprint (12 bloques)

### 1. Migración SQL

**a) Extender `affiliates`:**

```sql
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS
  tier text NOT NULL DEFAULT 'bronze'
    CHECK (tier IN ('bronze','silver','gold','platinum')),
  lifetime_earnings_usd numeric(12,2) NOT NULL DEFAULT 0,
  mrr_generated_usd numeric(12,2) NOT NULL DEFAULT 0,
  active_referrals_paid integer NOT NULL DEFAULT 0,
  joined_partner_program_at timestamptz,
  bio text,
  tiktok_handle text,
  instagram_handle text,
  payout_frequency text DEFAULT 'weekly'
    CHECK (payout_frequency IN ('weekly','monthly'));
```

**b) Crear `commission_events` (registro inmutable):**

```sql
CREATE TABLE commission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES affiliates(id),
  referral_id uuid NOT NULL REFERENCES referrals(id),
  referred_user_id uuid NOT NULL REFERENCES auth.users(id),
  event_type text NOT NULL
    CHECK (event_type IN ('initial_payment','recurring_payment','refund','clawback')),
  subscription_id text NOT NULL,
  invoice_id text UNIQUE,  -- dedupe por stripe invoice
  gross_amount_usd numeric(12,2) NOT NULL,
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.20,
  commission_amount_usd numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','paid','reversed','clawback_pending')),
  approved_at timestamptz,
  paid_at timestamptz,
  stripe_payout_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_events_affiliate ON commission_events(affiliate_id);
CREATE INDEX idx_commission_events_subscription ON commission_events(subscription_id);
CREATE INDEX idx_commission_events_status ON commission_events(status);
CREATE INDEX idx_commission_events_approved_at ON commission_events(approved_at)
  WHERE status = 'approved';
```

**c) Crear `creator_creatives` (Spark Codes):**

```sql
CREATE TABLE creator_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES affiliates(id),
  tiktok_url text NOT NULL,
  spark_code text,
  spark_code_expiry timestamptz,
  caption text,
  hook_used text,
  views integer DEFAULT 0,
  conversions integer DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  approval_status text DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected','amplifying')),
  amplification_notes text,
  bonus_paid_usd numeric(12,2) DEFAULT 0,
  amplification_started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_creatives_affiliate ON creator_creatives(affiliate_id);
CREATE INDEX idx_creatives_status ON creator_creatives(approval_status);
```

**d) Crear `tier_config` (configurable sin deploy):**

```sql
CREATE TABLE tier_config (
  tier text PRIMARY KEY,
  min_active_referrals integer NOT NULL,
  commission_rate numeric(5,4) NOT NULL,
  creative_amplify_bonus_usd numeric(12,2) DEFAULT 0,
  priority_support boolean DEFAULT false,
  access_to_beta boolean DEFAULT false,
  custom_code_allowed boolean DEFAULT false,
  badge_label text NOT NULL,
  badge_color text NOT NULL
);

INSERT INTO tier_config VALUES
  ('bronze',   0,   0.20, 0,   false, false, true,  'Partner',         '#CD7F32'),
  ('silver',   5,   0.25, 10,  false, false, true,  'Partner Plata',   '#C0C0C0'),
  ('gold',     20,  0.30, 25,  true,  true,  true,  'Partner Oro',     '#FFD700'),
  ('platinum', 50,  0.35, 50,  true,  true,  true,  'Partner Platino', '#E5E4E2');
```

**e) Trigger auto-ascenso de tier:**

```sql
CREATE OR REPLACE FUNCTION update_affiliate_tier()
RETURNS trigger AS $$
BEGIN
  UPDATE affiliates
  SET tier = (
    SELECT tier FROM tier_config
    WHERE min_active_referrals <= NEW.active_referrals_paid
    ORDER BY min_active_referrals DESC
    LIMIT 1
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_tier
  AFTER UPDATE OF active_referrals_paid ON affiliates
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_tier();
```

### 2. Stripe webhook — comisiones recurrentes

Modificar `supabase/functions/stripe-webhook/index.ts` sin romper flujo actual de checkout:

- `invoice.payment_succeeded` → si subscription.metadata tiene `referrer_affiliate_id`, crear `commission_event`:
  - `event_type = 'initial_payment'` si es primera invoice de esa subscription
  - `event_type = 'recurring_payment'` para las subsecuentes
  - `commission_rate` = lookup por `affiliate.tier` en `tier_config`
  - `status = 'pending'` (aprueba a los 30 días via cron)
  - `invoice_id` UNIQUE para dedupe si Stripe reenvía webhook
- `charge.refunded` → crear `commission_event` con `event_type='refund'`, amount negativo. Si la comisión original ya estaba `paid`, status `clawback_pending` y resta de `usd_available`
- `customer.subscription.deleted` → `referral.status='cancelled'`, decrementar `affiliate.active_referrals_paid`
- `customer.subscription.updated` con reactivación → restaurar `referrals.status='active'`
- Usar `event.id` como dedupe key del webhook mismo

### 3. Edge function nueva — `commission-approver` (cron diario)

```
supabase/functions/commission-approver/index.ts
```

- Cron diario (Supabase Scheduled Functions o pg_cron)
- Busca `commission_events WHERE status='pending' AND created_at < NOW() - INTERVAL '30 days'`
- Si subscription sigue activa en Stripe → `status='approved'` + suma a `affiliate.usd_available`
- Si subscription fue cancelada dentro de los 30 días → `status='reversed'` (clawback automático, no paga)
- Log de cada decisión para auditoría

### 4. Ajustar `affiliate-process-payouts` existente

- Cambiar lógica de "usd_available ≥ $50" a considerar solo `commission_events` con `status='approved'`
- Al pagar exitosamente: marcar events incluidos con `status='paid'` + `paid_at=now()` + `stripe_payout_id`
- Email al creador: "Te pagamos $X esta semana por Y referidos activos"

### 5. Landing pública `/partners`

Ruta pública (sin auth), SEO-first:

**Hero:**
- H1: "Gana $5 USD/mes por cada creador de TikTok Shop que traigas"
- Sub: "Comisión recurrente de por vida. Pagos semanales vía Stripe. Hasta 35% si escalas a Partner Platino."
- CTA: "Únete al programa →" (logueado → `/afiliados/onboarding`, no logueado → `/register?source=partners`)
- Calculadora interactiva: slider "¿Cuántos creadores puedes traer al mes?" → MRR proyectado, LTV, tier alcanzado

**Secciones:**
- Cómo funciona en 3 pasos (código único → compartes → ganas)
- Tabla de tiers visual (ver arriba)
- Herramientas: panel analytics, kit descargable, Spark Code amplification, leaderboard
- FAQ (cuándo pagan, qué pasa con churn, si ya soy usuario, cómo funciona Spark Code, tamaño mínimo audiencia)

**SEO:**
- Meta tags completos es-MX
- JSON-LD: `WebPage` + `Offer` + `FAQPage`
- og:image dedicado
- Slug: `/partners` con redirect desde `/programa-creadores`
- Sitemap incluye `/partners`

### 6. Rediseño `/afiliados` — tabs expandidas

Mantener lo existente, añadir:

- **Tab "Panorama":** MRR actual, proyección 6 meses, tier actual + progreso visual, earnings mes vs anterior
- **Tab "Mis creatives" (NUEVO):** formulario submit (URL TikTok, Spark Code, expiry, hook dropdown, caption) + lista con status visual (pendiente / aprobado / amplificando / rechazado) + earnings por creative
- **Tab "Leaderboard" (NUEVO):** top 20 del mes, tu posición destacada, premios mensuales visibles
- **Tab "Materiales":** kit logos zip, 10 hooks probados, 5 guiones-tipo, screenshots, link directo a `/partners`
- **Tab "Historial de pagos":** existente, mejorar UX timeline

### 7. Tracking ref_code

- Visita `/?ref=CODIGO` → `localStorage.adbroll_ref_code` (ya existe) + cookie 90 días (más robusto)
- PostHog event `partner_link_clicked { ref_code, landing_path, utm_source }`
- Signup con código → `referrals` row `status='pending'` + 50% descuento primer mes + Stripe subscription metadata `referrer_affiliate_id = affiliate.id`
- Primera invoice paga → webhook crea `commission_event initial_payment` + `referral.status='active'` + `active_referrals_paid += 1` + trigger tier + email "¡Tu primera conversión!"

### 8. Notificaciones transaccionales

Reutilizar `supabase/functions/send-email/index.ts` (NO crear nueva). Templates nuevos:

- `partner_new_conversion`: "Tu referido @usuario pagó su primer mes"
- `partner_recurring`: "Ganaste $X esta semana con Y referidos activos"
- `partner_tier_up`: "¡Ascendiste a Partner Plata! Ahora ganas 25%"
- `partner_churn`: "@usuario canceló. No afectó tu balance porque está dentro de los 30 días de clawback" (transparencia)
- `partner_creative_approved`: "Aprobamos tu Spark Code. Lo estamos amplificando"
- `partner_payout`: "Te transferimos $X USD esta semana"

### 9. Admin panel `src/pages/admin/PartnerProgram.tsx`

- Lista de partners con filtros (tier, MRR activo, last activity)
- Lista de creatives pendientes, aprobar de 1 click
- Form aprobación creative: `Aprobado | Amplificando | Rechazar` + notas internas + bono asignado
- Analytics: CAC via partners vs via ads, LTV comparativo, conversión por tier
- Botón "ejecutar payout ahora" (trigger manual del cron)

### 10. PostHog events del CPP (incluidos en event-contract desde Fase 6)

```
partner_program_viewed
partner_calculator_used
partner_signup_clicked
partner_stripe_connect_started
partner_stripe_connect_completed
partner_code_copied
partner_link_shared
partner_creative_submitted
partner_dashboard_viewed
partner_materials_downloaded
partner_link_clicked
```

**Crítico:** estos eventos se definen en el event-contract de Fase 6 para que el webhook de Stripe y el frontend ya reconozcan el namespace. Evita retocar el contrato en Fase 7.

### 11. Gating y seguridad

- RLS estricto en `commission_events`: afiliado solo ve los suyos
- RLS en `creator_creatives`: afiliado solo los suyos, admin todos
- RLS en `affiliates`: puede editar perfil pero NO cambiar tier manualmente (solo trigger)
- Validación server-side: un affiliate NO puede cambiar su commission_rate directamente
- Rate limit: max 10 creatives/día por afiliado
- Anti-fraude básico: self-referral detection por same IP / same device fingerprint (bloquea)

### 12. Commits atómicos sugeridos

1. `feat(db): add tier system, commission events, creator creatives schema`
2. `feat(webhook): hook recurring commissions on stripe invoice.payment_succeeded`
3. `feat(edge): commission-approver cron with 30-day approval + clawback`
4. `feat(partners): public recruitment landing /partners with SEO + calculator`
5. `feat(affiliates): expand dashboard with creatives, leaderboard, materials tabs`
6. `feat(admin): partner program management panel for founder`
7. `feat(emails): transactional notifications for partner lifecycle`
8. `feat(tracking): posthog events for partner funnel`

---

## Restricciones duras

- **NO romper** el flujo actual de `/afiliados`. Extender, no reemplazar.
- Montos en **USD** hasta el payout; Stripe Connect convierte a MXN en el wire
- Webhook **NUNCA** debe duplicar commission_events. `invoice_id` UNIQUE.
- Todos los montos de dinero en **`numeric(12,2)`**, NUNCA float.
- Reutilizar funciones existentes (`send-email`, etc.), no crear nuevas.
- Test manual antes de merge: simular click → suscripción → primera factura → approval a 30 días → payout
- Coherencia visual: usar design system de Fase 6 gstack

---

## Entregable final

- PR `overhaul/fase-7-creator-partner-program` → `master`
- Migración SQL aplicada con backup previo
- Video Loom de 3 min: tour de `/partners` + signup con código + admin ve referral + submit Spark Code + admin aprueba → amplificando + dashboard partner con tier + leaderboard + materiales
- Screenshots mobile + desktop de `/partners` y `/afiliados` rediseñada
- Lighthouse `/partners`: Performance ≥85, SEO 100
