# 📋 adbroll Implementation Tasks

**Source of Truth:** This document tracks all implementation tasks in execution order.

---

## ✅ COMPLETADO - Diciembre 2024

### APP-FIRST Model (Diciembre 7, 2024)
- [x] Redirect `/` to `/app` - No landing page
- [x] `useBlurGate` hook - Access levels: visitor/free/paid
- [x] `BlurGateContext` - Global blur state provider
- [x] `PaywallModal` - Reusable modal for feature gating
- [x] `PreviewBanner` - Top banner for free preview mode
- [x] `BlurOverlay` component - Blur wrapper for content
- [x] VideoCardOriginal - Metrics blur + paywall CTA
- [x] DashboardSidebar - Works for unauthenticated users
- [x] Removed SubscriptionGate blocking - App viewable by all

### 0. INGESTA - Sistema de Importación Kalodata
- [x] Edge functions usan XLSX (SheetJS) para archivos `.xlsx`
- [x] Column mapping dinámico para encabezados en español
- [x] Limpieza de datos: `$`, `%`, `,` → números
- [x] Orden forzado: Creadores → Productos → Videos
- [x] UPSERT inteligente por campos únicos
- [x] Componente `PendingLinks.tsx` para vinculación manual
- [x] Admin panel con progreso por fases (1/5 → 5/5)

### 1. CEREBRO - Backend ETL
- [x] Importaciones incrementales con UPSERT
- [x] Matching determinista + IA
- [x] Cola de descarga MP4
- [x] **Auto-Matcher V2** - Match prioritario: URL directo → Fuzzy matching (Levenshtein)
- [x] **rebuild_index** - Función para reconstruir todo sin subir archivos
- [x] Threshold de match configurable (score >= 0.55)
- [x] Todos los videos indexados (sin truncar en 100)

### 2. CORAZÓN - Algoritmo de Oportunidades
- [x] Vista `product_opportunities` con IO: `(commission * gmv_30d) / (creators_active + 1)`
- [x] Flag `is_hidden_gem`: comisión >15%, gmv >0, creadores <50
- [x] Página `/opportunities` - Gemas Ocultas ordenadas por IO
- [x] Campo `earning_per_sale` calculado: `price * commission`

### 3. TOOLS - Herramientas IA
- [x] **Extractor de Guiones** - AssemblyAI + análisis estructurado
- [x] **Generador de Hooks** - 10 hooks con IA (`generate-hooks`)
- [x] **Generador de Guiones** - Guión completo (`generate-full-script`)

### 4. AFILIADOS
- [x] Tabla `affiliates` con ref_code, earnings
- [x] Página dedicada `/affiliates` con estadísticas
- [x] Menú lateral con "gana dinero hoy"

### 4.1 SISTEMA DE REFERIDOS V2 (Diciembre 2024)
- [x] **Planes actualizados** - FREE (0), CREATOR ($29), STUDIO ($49)
- [x] **Profiles ampliado** - plan, currency, marketplace, language, referral_code_used
- [x] **affiliate_codes** - Códigos únicos por usuario con generación automática
- [x] **affiliate_referrals** - Tracking de referidos por código
- [x] **affiliate_discounts** - Descuento 50% primer mes si llegan por referido
- [x] **affiliate_payouts** - Estructura para comisiones (30% afiliado, 10% agencia)
- [x] **affiliate_agencies** - Estructura para agencias
- [x] **affiliate_agency_assignments** - Asignación creadores a agencias
- [x] **Register.tsx** - Campo código referido opcional + validación en tiempo real
- [x] **Settings.tsx** - Crear/ver código afiliado + aplicar código referido
- [x] **PricingCard.tsx** - Precios tachados con descuento + banner verde
- [x] **useReferralCode.ts** - Hook completo para gestión de códigos

### 5. SEGURIDAD
- [x] Vista con `security_invoker = true`
- [x] Funciones con `search_path = public`

### 6. ADMIN - Panel de Importación
- [x] **Reconstruir Índice** - Botón para rebuild sin subir archivos
- [x] Proceso Maestro (Descargar + Vincular)
- [x] Estadísticas de vinculación en tiempo real

### 7. DESIGN SYSTEM - Sistema de Diseño Global
- [x] **Tipografía Global** - Inter (sans) + JetBrains Mono (código)
- [x] **Sistema de Colores** - Paleta TikTok (rosa/azul) + semánticos
- [x] **Sistema de Botones** - Primario, Secundario, Destructivo, Link
- [x] **Sistema de Tarjetas** - Cards globales para video/producto/creador
- [x] **Sidebar Rediseñado** - Linear/TikTok inspired, 240px width, active states

### 8. JERARQUÍA VISUAL - UX Improvements (Diciembre 2024)
- [x] **DataSubtitle Minimalizado** - Reducido a texto sutil de 11px sin emoji
- [x] **Creadores Cards** - Padding aumentado (p-5), botones con gap-3, tooltips en títulos
- [x] **Productos Cards** - Padding y spacing mejorado, títulos con truncate + tooltip
- [x] **Oportunidades Simplificado** - Header "Oportunidades" con subtítulo descriptivo
- [x] **IO Badge Tooltip** - Hover explica fórmula del Índice de Oportunidad
- [x] **Plan Card Rediseñado** - Sidebar muestra "Plan actual: Starter" con botón "Ver planes"
- [x] **Títulos con Tooltip** - Truncado con cursor-help y title attribute

---

## ✅ FASE 1 - VISITOR MODE UX (Diciembre 2024)

### Gating Visual para Visitantes
- [x] Dashboard - Primeros 10 videos sin blur, resto bloqueado → /unlock
- [x] Productos - Solo 3 productos visibles, resto → /unlock
- [x] Creadores - Solo 3 creadores visibles, resto → /unlock  
- [x] Oportunidades - Solo 3 oportunidades visibles, resto → /unlock
- [x] VideoAnalysisModal - Script visible, tabs Análisis/Variantes bloqueados → /unlock
- [x] Filtros bloqueados para visitantes → /unlock
- [x] PreviewBanner removido del layout
- [x] Sidebar muestra items bloqueados con candado para visitantes
- [x] Botones "Desbloquear todo" e "Iniciar sesión" en sidebar para visitantes

---

## ✅ STRIPE INTEGRATION (Diciembre 2024)

### Backend
- [x] Secrets configurados: STRIPE_SECRET_KEY, STRIPE_PRICE_ID_PRO, STRIPE_COUPON_ID, STRIPE_WEBHOOK_SECRET
- [x] stripe_customer_id añadido a profiles
- [x] Edge function `create-checkout` - Crea sesión de Stripe Checkout
- [x] Edge function `stripe-webhook` - Maneja eventos de Stripe (checkout.session.completed, invoice.paid, invoice.payment_failed, subscription.deleted/updated)
- [x] Edge function `customer-portal` - Portal de gestión de suscripción
- [x] Lógica de comisión de afiliados (30% = $4.50 por pago)

### Frontend
- [x] PaywallModal - Conectado a Stripe Checkout
- [x] Pricing page - Botón conectado a Stripe Checkout
- [x] CheckoutSuccess page (/checkout/success)
- [x] CheckoutCancel page (/checkout/cancel)
- [x] Settings - PlanStatusCard con gestión de suscripción vía Stripe Portal

### Blur Gate Integration
- [x] useBlurGate verifica subscriptions.status = 'active'
- [x] Founders con rol 'founder' tienen acceso completo
- [x] Usuarios pagados: hasPaid = true, accessLevel = 'paid', sin blur
- [x] Usuarios free: accessLevel = 'free', blur parcial
- [x] Visitantes: accessLevel = 'visitor', blur completo

### Pricing Migration (Diciembre 2024)
- [x] Precio actualizado: $29 USD → $14.99 USD (~$300 MXN)
- [x] Descuento referido: $14.50 → $7.50 (50% off)
- [x] Comisión afiliados: $8.70 → $4.50 (30%)
- [x] Mercado simplificado: Solo TikTok Shop México (eliminado USA)

---

## ✅ CONVERSION FLOW v2 (Diciembre 2024)

### Nuevo Flujo de Conversión
- [x] Landing/Unlock - Un solo CTA "Empieza ahora" (eliminado "Ver cómo funciona")
- [x] EmailCaptureModal - Modal para capturar email antes de Stripe
- [x] Edge function `create-checkout-guest` - Checkout sin cuenta previa
- [x] stripe-webhook actualizado - Crea cuenta automáticamente post-pago
- [x] Flujo: CTA → Email → Stripe → Cuenta creada → Dashboard

---

## ✅ AUTO-TRANSCRIPTION SYSTEM (Diciembre 2024)

### Transcripción Automática en Import
- [x] Edge function `transcribe-videos-batch` - Procesa videos en lotes
- [x] AssemblyAI para transcripción de audio a texto
- [x] Lovable AI Gateway para análisis de scripts (hook/body/cta)
- [x] Admin panel actualizado - Nuevo paso 6/6 "Transcribiendo y analizando scripts"
- [x] Stats actualizados - Nuevo contador "Pendientes transcribir"
- [x] Flujo: Import → Download → Match → **Transcribe+Analyze** (automático)
- [x] Variantes IA se generan on-demand cuando el usuario las solicita

---

## ✅ MOBILE UX OPTIMIZATION (Diciembre 2024)

### FASE 1-4: Mobile App-Like Experience
- [x] VideoAnalysisModal - Full-screen mobile modal with fixed header
- [x] VideoAnalysisModal - Mobile metrics row (horizontal scrollable)
- [x] VideoAnalysisModal - Hide video player on mobile, show thumbnail only
- [x] VideoAnalysisModal - Mobile-optimized tabs (Script, Análisis, Variantes)
- [x] Dashboard - Dynamic headline with market ("TikTok Shop México/Estados Unidos")
- [x] Dashboard - Sticky CTA for visitors ("Desbloquear acceso completo — $29/mes")
- [x] Dashboard - Padding bottom for sticky CTA visibility
- [x] VideoCardOriginal - 4:5 aspect ratio on mobile
- [x] VideoCardOriginal - Compact CTA button "Ver guion →"

---

## ✅ SISTEMA DE CAMPAÑAS DIGITALES (Diciembre 2024)

### Concepto
Sistema "Campañas Abiertas" que conecta marcas digitales (apps, SaaS, servicios) con creadores de TikTok. Sin productos físicos - creadores producen UGC original para promocionar productos digitales.

### Base de Datos
- [x] **brand_profiles** - Perfil de marca (company_name, logo, website, industry, verified)
- [x] **campaigns** - Campañas (title, product_name, brief, rules, min/max_payment_mxn, requires_spark_code, video_duration)
- [x] **campaign_submissions** - Envíos de videos (status workflow, proposed/approved_price, spark_code, legal_consent)
- [x] **campaign_transactions** - Transacciones de pago (amount, platform_fee, stripe_payment_intent)
- [x] **user_roles** - Roles de usuario (creator/brand/founder)

### Estados de Submission
```
pending_review → rejected
pending_review → changes_requested → pending_review
pending_review → approved → pending_sparkcode → completed
```

### FASE 1: Base de Datos (Diciembre 2024)
- [x] Tablas creadas con RLS policies
- [x] Función `is_brand()` para verificación de rol
- [x] Enum `app_role` con valores: user, founder, brand

### FASE 2: Hooks y Utilidades (Diciembre 2024)
- [x] **useAccountType.ts** - Hook para determinar tipo de cuenta (creator/brand)
- [x] **useCampaigns.ts** - Hook para CRUD de campañas
- [x] **useSubmissions.ts** - Hook para gestión de envíos con acciones por rol

### FASE 3: Páginas del Creador (Diciembre 2024)
- [x] **/campaigns** - Grid de campañas abiertas con filtros
- [x] **/campaigns/:id** - Detalle de campaña con formulario de envío
- [x] **/my-submissions** - Mis envíos con tabs por estado

### FASE 4: Páginas de Marca (Diciembre 2024)
- [x] **/brand/dashboard** - Panel principal con métricas
- [x] **/brand/campaigns** - Gestión de campañas (crear, editar, pausar)
- [x] **/brand/campaigns/:id/submissions** - Revisar videos enviados
- [x] **/brand/upgrade** - Página de upgrade para marcas

### FASE 5: Navegación y UX (Diciembre 2024)
- [x] **DashboardSidebar reorganizado** - Secciones: EXPLORA, GANA DINERO, TU CENTRO, CUENTA, PANEL MARCA
- [x] **Sidebar adaptativo** - Muestra PANEL MARCA solo para usuarios con rol brand
- [x] **CTA "¿Eres una marca?"** - Visible para creadores logueados, lleva a /brand/register

### FASE 6: Registro de Marcas (Diciembre 2024)
- [x] **/brand/register** - Formulario de registro de marca
- [x] Creación automática de brand_profile + asignación rol brand
- [x] **Settings.tsx actualizado** - Muestra tipo de cuenta (Creador/Marca)
- [x] Navegación a panel de marca desde Settings

### FASE 7: Emails de Campañas (Diciembre 2024)
- [x] **campaignSubmissionReceived** - Para marcas cuando reciben un video
- [x] **submissionApproved** - Para creadores cuando se aprueba su video
- [x] **submissionRejected** - Para creadores cuando se rechaza
- [x] **sparkCodeRequested** - Para creadores cuando deben enviar SparkCode
- [x] **campaignPaymentComplete** - Para creadores cuando reciben pago
- [x] **changesRequested** - Para creadores cuando la marca pide cambios

### Flujo Completo
1. **Marca se registra**: /brand/register → brand_profile + rol brand
2. **Marca crea campaña**: /brand/campaigns → brief, budget, requisitos
3. **Creador ve campañas**: /campaigns → grid con filtros
4. **Creador aplica**: /campaigns/:id → sube video, propone precio
5. **Marca revisa**: /brand/campaigns/:id/submissions → aprobar/rechazar
6. **Si aprobado**: Creador recibe email, envía SparkCode
7. **Pago**: Transacción procesada, creador recibe confirmación

---

## ✅ AUDITORÍA Y OPTIMIZACIÓN (Diciembre 2024)

### Seguridad
- [x] **Subscriptions RLS** - Política existente protege datos correctamente
- [x] **Webhook price fix** - Actualizado de $29 a $14.99

### UX Renaming
- [x] **"Mis Envíos" → "Colaboraciones"** - Sidebar y página actualizados
- [x] **Iconos y textos** - Actualizados para reflejar concepto de colaboración

### Sistema de Captura de Emails
- [x] **Tabla email_captures** - Almacena leads antes de checkout
- [x] **EmailCaptureModal** - Guarda email en BD antes de Stripe
- [x] **stripe-webhook** - Marca email como convertido post-pago

### Analytics y Tracking
- [x] **src/lib/analytics.ts** - Utilidades para FB Pixel y GA
- [x] **index.html** - Scripts de Meta Pixel y Google Analytics (IDs por configurar)
- [x] **Eventos definidos** - PageView, ViewContent, InitiateCheckout, Purchase, Lead, SignUp

### Campañas Públicas
- [x] **Campaigns.tsx** - Todas las campañas visibles para todos
- [x] **CampaignDetail.tsx** - Paywall al intentar enviar video (no al ver)
- [x] **Sin blur** - Campañas 100% públicas, paywall solo al aplicar

### Simplificación Biblioteca
- [x] **Grid único** - Eliminado toggle grid/list (solo vista grid)
- [x] **Storage bar condicional** - Solo visible si uso > 25%
- [x] **Imports limpiados** - Removidos Grid3X3 y List icons no usados

---

## ✅ ANALYTICS Y EMAILS AUTOMATIZADOS (Diciembre 2024)

### Facebook Pixel + Google Analytics
- [x] Meta Pixel ID configurado: `1180309310977788`
- [x] Google Analytics ID configurado: `G-7P6H9LCTKV`
- [x] Server-side Meta Conversions API (`meta-conversions` edge function)
- [x] Dual tracking: Browser + Server-side para mayor precisión

### Sistema de Emails Automatizados
- [x] **Templates en send-email**: welcome, welcome_free, subscription_confirmed, subscription_cancelled, payment_failed, account_setup, affiliate_commission, abandoned_cart, free_user_reminder, renewal_reminder
- [x] **send-abandoned-cart-emails** - Edge function para emails 24h después de captura sin conversión
- [x] **send-scheduled-emails** - Edge function para recordatorios (renovación 3 días antes, free users 3 días después)
- [x] **Register.tsx** - Envía email `welcome_free` al registrarse
- [x] **stripe-webhook** - Envía email `subscription_confirmed` al pagar

### Para Ejecutar Automáticamente (CRON Jobs)
Para activar los emails automáticos, configurar en Supabase cron:
```sql
-- Abandonos (cada hora)
SELECT cron.schedule('abandoned-cart-emails', '0 * * * *', $$
  SELECT net.http_post(url:='https://gcntnilurlulejwwtpaa.supabase.co/functions/v1/send-abandoned-cart-emails', headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb);
$$);

-- Recordatorios (una vez al día)
SELECT cron.schedule('scheduled-emails', '0 9 * * *', $$
  SELECT net.http_post(url:='https://gcntnilurlulejwwtpaa.supabase.co/functions/v1/send-scheduled-emails', headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb);
$$);
```

---

## ❌ REMOVIDO - SISTEMA DE GENERACIÓN DE VIDEOS IA (Enero 2025)

### Decisión de Producto
El sistema de generación de videos IA fue removido para simplificar la plataforma y enfocarse en:
- Captación masiva de creadores de contenido
- Herramientas de análisis de scripts y variantes IA
- Programa de talento público para marcas

### Componentes Eliminados
- [x] `src/pages/MyGeneratedVideos.tsx` - Página de videos generados
- [x] `src/components/video-generation/VideoGeneratorTab.tsx` - Tab de generación en modal
- [x] `src/components/CreditPacksModal.tsx` - Modal de compra de créditos
- [x] `src/components/CreditsBadge.tsx` - Badge de créditos en sidebar
- [x] `src/hooks/useVideoCredits.ts` - Hook de créditos
- [x] `src/hooks/useLipsyncGeneration.ts` - Hook de lipsync
- [x] `src/hooks/useVideoGeneration.ts` - Hook de generación
- [x] Edge functions eliminadas: generate-lipsync-video, generate-ugc-image, generate-video-clone, video-generation-callback, lipsync-callback, check-video-status, create-checkout-credits, elevenlabs-tts

### Simplificación de Precios
- [x] Plan único: $14.99 USD/mes
- [x] Sin plan Premium ($29.99)
- [x] Sin sistema de créditos
- [x] Sin compra de packs adicionales
- [x] Unlock.tsx simplificado a un solo CTA
- [x] Pricing.tsx simplificado a un solo plan
- [x] stripe-webhook limpiado de lógica de créditos

---

## ✅ MARKET SWITCHER MX/USA (Enero 2025)

### Switch entre TikTok Shop México y USA
- [x] **MarketSwitcher.tsx** - Componente de switch con banderas MX/US
- [x] **MarketContext actualizado** - `marketCountry` para queries DB
- [x] **Dashboard.tsx** - Filtro `.eq("country", market)` en videos (lowercase 'mx'/'us')
- [x] **Products.tsx** - Filtro `.eq("market", market)` en productos
- [x] **Creators.tsx** - Filtro `.eq("country", market)` en creadores (lowercase 'mx'/'us')
- [x] **Opportunities.tsx** - Filtro `.eq("market", market)` en oportunidades
- [x] **product_opportunities view** - Actualizada para incluir campo market
- [x] **DashboardSidebar** - MarketSwitcher prominente en sidebar
- [x] **GlobalHeader** - MarketSwitcher compacto en header
- [x] **Auto-sync** - Cambiar mercado sincroniza idioma y moneda automáticamente
- [x] **BD: creators.country normalizado** - Convertido a lowercase ('mx'/'us') para consistencia
- [x] **BD: Índices únicos compuestos** - `(usuario_creador, country)` y `(creator_handle, country)` permiten creadores en múltiples mercados

### Flujo
- Usuario selecciona 🇲🇽 México → idioma ES, moneda MXN, datos market='mx'
- Usuario selecciona 🇺🇸 USA → idioma EN, moneda USD, datos market='us'

---

## ✅ GEO-DETECCIÓN AUTOMÁTICA POR IP (Enero 2025)

### Auto-configuración por Ubicación
- [x] **geoDetection.ts** - Utilidad para detectar país por IP (ipapi.co)
- [x] **MarketContext actualizado** - Geo-detección automática en primera visita
- [x] **LanguageContext actualizado** - Sincronización automática con market detectado
- [x] **MarketSwitcher actualizado** - Usa syncWithMarket para cambios manuales
- [x] **Fallback por idioma** - Si geo falla, usa navigator.language
- [x] **Cache en localStorage** - Solo detecta una vez, respeta preferencia manual

### Flujo
1. Usuario entra al sitio por primera vez
2. Sistema detecta país por IP (México → mx, USA → us)
3. Automáticamente: mercado, idioma y moneda se configuran
4. Si usuario cambia manualmente, se respeta su preferencia

---

## ✅ SISTEMA DE PRECIOS PRO/PREMIUM + CRÉDITOS (Enero 2025)

### Base de Datos
- [x] **profiles.plan_tier** - Campo para diferenciar 'free' | 'pro' | 'premium'
- [x] **video_credits actualizado** - credits_monthly, credits_purchased, last_monthly_reset
- [x] **credit_purchases tabla** - Tracking de compras de packs de créditos
- [x] **RLS policies** - Políticas para credit_purchases

### Stripe Integration
- [x] **STRIPE_PRICE_ID_PREMIUM** - $29.99/mes suscripción
- [x] **STRIPE_PRICE_ID_PACK_3** - $9.99 pack 3 videos
- [x] **STRIPE_PRICE_ID_PACK_10** - $24.99 pack 10 videos

### Edge Functions
- [x] **create-checkout** - Acepta plan 'pro' | 'premium'
- [x] **create-checkout-credits** - Nuevo endpoint para packs de créditos
- [x] **stripe-webhook** - Asigna plan_tier y créditos según tipo de compra

### Frontend - Pricing
- [x] **Pricing.tsx** - 2 columnas Pro ($14.99) vs Premium ($29.99)
- [x] **PaywallModal.tsx** - Muestra ambos planes
- [x] **CreditPacksModal.tsx** - Modal para comprar packs de créditos
- [x] **CreditsBadge.tsx** - Badge de créditos en sidebar

### Frontend - Landing Pages
- [x] **Landing.tsx** - Sección pricing con 2 columnas
- [x] **Unlock.tsx** - Sección pricing con 2 columnas

### Hooks
- [x] **useSubscription.tsx** - planTier, isPro, isPremium, canGenerateVideos
- [x] **useVideoCredits.ts** - monthlyCredits, purchasedCredits, availableCredits

### Pricing Final
| Plan | Precio | Incluye |
|------|--------|---------|
| Pro | $14.99/mes | Scripts, análisis, variantes IA |
| Premium | $29.99/mes | Todo Pro + 5 videos IA/mes |
| Pack 3 | $9.99 | 3 créditos de video |
| Pack 10 | $24.99 | 10 créditos de video |

---

## ✅ OPTIMIZACIÓN FLUJO DE CONVERSIÓN (Enero 2025)

### Nuevo Flujo Email-First
- [x] **SimpleEmailCaptureModal.tsx** - Modal minimalista que solo captura email
- [x] **BlurGateContext actualizado** - Usa SimpleEmailCaptureModal en lugar de PaywallModal
- [x] **Unlock.tsx reestructurado** - Precios arriba (#pricing), landing de beneficios abajo
- [x] **Premium destacado** - Badge "MÁS POPULAR", borde y sombra prominentes
- [x] **Auto-scroll a #pricing** - Si URL contiene #pricing, hace scroll automático
- [x] **Email pre-guardado** - Se guarda en localStorage para pre-llenar checkout

### Flujo Completo
```
1. Usuario hace clic en contenido bloqueado
2. Se abre SimpleEmailCaptureModal (solo pide email)
3. Email se guarda en email_captures + localStorage
4. Usuario es redirigido a /unlock#pricing
5. Ve los dos planes (Pro/Premium) prominentemente arriba
6. Al elegir plan, email se pasa a Stripe checkout
7. Después de pagar, cuenta se crea automáticamente
```

### Beneficios
- Mayor captura de emails como prospectos
- Usuario ve ambos planes antes de decidir
- Premium destacado aumenta conversiones
- Flujo más limpio y menos intimidante

---

## 🔄 PENDIENTE

### Sistema de Pagos para Marcas
- [ ] Stripe Connect para marcas (depósito de fondos)
- [ ] Procesamiento de transacciones campaign_transactions
- [ ] Liberación de pagos a creadores post-SparkCode

### Mejoras UX Campañas
- [ ] Notificaciones in-app para nuevos envíos
- [ ] Preview de video en modal de revisión
- [ ] Filtros avanzados en /campaigns (por industria, pago)

### Verificación de Marcas
- [ ] Proceso de verificación manual (badge verified)
- [ ] Requisitos para verificación

### Analytics Dashboard (Admin) - ✅ COMPLETADO Enero 2025
- [x] **FinancialDashboard.tsx** - MRR, desglose suscripciones Pro/Premium, gráfica 30 días
- [x] **TrafficAnalytics.tsx** - Visitantes únicos, page views, páginas top, gráfica diaria
- [x] **CreditAnalytics.tsx** - Créditos vendidos, usados, disponibles, desglose por pack
- [x] **ConversionFunnel.tsx mejorado** - Porcentajes de caída, métricas clave, insights actionables
- [x] **AnalyticsDashboard.tsx simplificado** - Removidos brandsCount y leads pendientes, MRR real
- [x] **Admin.tsx actualizado** - Layout reorganizado con secciones financieras, tráfico, créditos

---

## ✅ TALENTO - REESTRUCTURACIÓN (Enero 2025)

### Cambios Implementados
- [x] **Renombrado** - "Contrata Creadores" → "Talento" en toda la app
- [x] **Nueva ruta** - `/contrata-creadores` → `/talento` con redirect
- [x] **3 pestañas** - Campañas, Creadores, Soy Creador
- [x] **CampaignsTab.tsx** - Placeholder elegante "Próximamente: Campañas"
- [x] **Filtros modernos** - Pills horizontales en lugar de dropdowns
- [x] **Sin filtro país** - Removido del directorio de creadores
- [x] **Sidebar actualizado** - Icono Sparkles, label "Talento"
- [x] **CTA actualizado** - "Círculo Interno" apunta a `/talento?tab=aplicar`

### Talento 100% Público (Enero 2025)
- [x] **Campañas públicas** - Cualquier visitante puede ver campañas activas sin login
- [x] **brand_name como texto** - Campo texto libre para nombre de marca (sin requerir brand_profiles)
- [x] **brand_logo_url opcional** - URL de logo de marca en campaigns
- [x] **brand_id opcional** - Ya no es requerido en campaigns
- [x] **ApplyToCampaignModal mejorado** - Formulario completo para visitantes (nombre, email, TikTok, WhatsApp, nicho, tipo contenido)
- [x] **Auto-registro de creador** - Al aplicar, visitante se registra automáticamente en creator_directory
- [x] **RLS actualizado** - Inserciones públicas en campaign_applications
- [x] **CampaignManager.tsx** - Input de texto para marca en lugar de Select

---

## ✅ PIPELINE AUTOMÁTICO DE IMPORTACIÓN (Enero 2025)

### Flujo Unificado de 8 Fases
- [x] **handleProcessAll refactorizado** - Un solo clic ejecuta todo el pipeline
- [x] **Fase 1/8** - Importar Creadores (process-kalodata-creators)
- [x] **Fase 2/8** - Importar Productos (process-kalodata-products)
- [x] **Fase 3/8** - Importar Videos (process-kalodata)
- [x] **Fase 4/8** - Descargar MP4s (download-videos-batch loop)
- [x] **Fase 5/8** - Transcribir Scripts (transcribe-videos-batch loop)
- [x] **Fase 6/8** - Vincular Productos (auto-match-videos-products loop)
- [x] **Fase 7/8** - Descargar Fotos Creadores (download-creator-avatars)
- [x] **Fase 8/8** - Actualizar Rankings (refresh stats)
- [x] **Botón Pausar** - Disponible durante todo el proceso
- [x] **Resumen final** - Toast con conteo de éxitos y advertencias
- [x] **Tolerancia a fallos** - Cada fase salta automáticamente después de 3 errores consecutivos

### Resultado
Al subir archivos Kalodata, todos los rankings (Videos, Productos, Creadores, Oportunidades) se actualizan automáticamente sin necesidad de intervención manual adicional.

---

## ✅ PIPELINE PARALELO DE PROCESAMIENTO (Enero 2025)

### Procesamiento Concurrente
- [x] **useParallelPipeline.ts** - Hook para manejo de workers concurrentes
- [x] **ParallelProgressPanel.tsx** - UI con 4 barras de progreso independientes
- [x] **Workers simultáneos** - Downloads (5), Transcriptions (3), Matching (1 batch), Avatars (1)
- [x] **Promise.all** - Todas las fases corren en paralelo en cada ciclo
- [x] **Re-activación inteligente** - Transcripciones se activan cuando hay nuevos MP4s

### Beneficios
- Tiempo de procesamiento reducido ~60-70%
- Feedback visual granular por tipo de tarea
- Mejor aprovechamiento del tiempo de espera de AssemblyAI
- Avatares se descargan mientras otras cosas procesan

### Nuevo UI
- Botón "⚡ Procesar Paralelo" reemplaza el secuencial
- 4 barras de progreso: Descargas, Transcripciones, Vinculaciones, Fotos
- Indicador de ciclo actual y fases activas

---

**Última actualización:** Enero 2025