

## Plan: Cambiar precio de suscripcion a $25 USD/mes

### Lo que TU necesitas hacer en Stripe (antes de que yo cambie el codigo)

**Paso 1: Identifica cual cuenta de Stripe estas usando**

Tu proyecto tiene configurado un secret llamado `STRIPE_SECRET_KEY`. La cuenta correcta es la que tiene esa clave. Para verificar:
- Entra a https://dashboard.stripe.com
- Si tienes dos cuentas, revisa cual tiene productos/clientes existentes de Adbroll
- Esa es la cuenta correcta

**Paso 2: Crea un nuevo Price en Stripe**

1. Ve a **Productos** en tu dashboard de Stripe
2. Busca tu producto existente "Adbroll Pro" (o crealo si no existe)
3. Agrega un nuevo **Price**: $25.00 USD, recurrente, mensual
4. Copia el **Price ID** (empieza con `price_...`)
5. Damelo para que yo lo configure como el nuevo `STRIPE_PRICE_ID_PRO`

**Paso 3 (opcional): Desactiva el price anterior de $14.99**
- En Stripe, archiva el price viejo para que no se use mas

### Lo que yo voy a cambiar en el codigo (11 archivos)

Una vez que me des el nuevo Price ID, hare estos cambios:

**Backend (Edge Functions):**

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Cambiar `14.99` a `25` en lineas 166, 263, 285, 300 |
| `supabase/functions/create-checkout/index.ts` | Cambiar comentario y metadata de `14.99` a `25` |
| `supabase/functions/create-checkout-guest/index.ts` | Sin cambios de precio (usa Price ID dinamico) |

**Frontend (UI):**

| Archivo | Cambio |
|---------|--------|
| `src/components/PaywallModal.tsx` | `$14.99` -> `$25`, eliminar plan Premium de 2 columnas, dejar solo 1 plan |
| `src/components/PricingCard.tsx` | `price = 14.99` -> `price = 25` |
| `src/components/PricingModal.tsx` | `proPrice = 14.99` -> `proPrice = 25`, eliminar Premium |
| `src/components/PreviewBanner.tsx` | `$14.99/mes` -> `$25/mes` |
| `src/pages/Landing.tsx` | `$14.99` -> `$25` en precio y FAQ |
| `src/pages/Unlock.tsx` | `$14.99` -> `$25` en multiples lugares |
| `src/pages/Settings.tsx` | `$14.99` -> `$25` |
| `src/components/creators/CreatorDirectory.tsx` | `$14.99/mes` -> `$25/mes` |
| `src/components/creators/CampaignsTab.tsx` | `$14.99/mes` -> `$25/mes` |

**Emails:**

| Archivo | Cambio |
|---------|--------|
| `src/lib/email.ts` | Default price `$14.99 USD` -> `$25 USD` |
| `src/components/admin/EmailLeadsList.tsx` | `$14.99` -> `$25` en template de seguimiento |
| `src/components/admin/ApiUsageMonitor.tsx` | Actualizar nota de Stripe fee |

**Comision de afiliados:**
- Actualmente es 30% de $14.99 = $4.50/referido/mes
- Con $25 sera 30% de $25 = **$7.50/referido/mes** (sin cambios de codigo, se calcula automaticamente)

### Resumen de pasos

1. **Tu**: Entra a Stripe, crea un Price de $25/mes, dame el Price ID
2. **Yo**: Actualizo el secret `STRIPE_PRICE_ID_PRO` con el nuevo ID
3. **Yo**: Cambio todas las referencias de $14.99 a $25 en codigo y edge functions
4. Los suscriptores existentes seguiran pagando $14.99 hasta que cancelen (Stripe respeta el price original)

