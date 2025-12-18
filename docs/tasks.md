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

## 🔄 PENDIENTE

- [x] VideoAnalysisModal - Columna de negocio con producto vinculado ✅
- [x] VideoAnalysisModal - Panel de controles Variantes IA (FASE 2) ✅
- [x] VideoAnalysisModal - Integración IA real para variantes (FASE 3) ✅
- [x] VideoAnalysisModal - Rediseño premium completo (FASE 4) ✅
- [x] VideoAnalysisModal - Guardar variantes a favoritos ✅
- [x] Página /pricing con 3 planes (FREE, CREATOR, STUDIO) ✅
- [x] Detección automática código referido en /pricing ✅
- [x] FAQ en página de precios ✅
- [x] Stripe webhook para comisión de afiliados ✅
- [x] Deep links a TikTok Shop ✅

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

**Última actualización:** Diciembre 2024
