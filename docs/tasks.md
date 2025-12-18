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

---

**Última actualización:** Diciembre 2024