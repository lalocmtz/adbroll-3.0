# 📋 adbroll Implementation Tasks

**Source of Truth:** This document tracks all implementation tasks in execution order.

---

## ✅ COMPLETADO - Diciembre 2024

### 1. CEREBRO - Backend ETL
- [x] Importaciones incrementales con UPSERT
- [x] Matching determinista + IA
- [x] Cola de descarga MP4

### 2. CORAZÓN - Algoritmo de Oportunidades
- [x] Vista `product_opportunities` con IO: `(commission * gmv_30d) / (creators_active + 1)`
- [x] Flag `is_hidden_gem`: comisión >15%, gmv >0, creadores <50
- [x] Página `/opportunities` - Gemas Ocultas ordenadas por IO

### 3. TOOLS - Herramientas IA
- [x] **Extractor de Guiones** - AssemblyAI + análisis estructurado
- [x] **Generador de Hooks** - 10 hooks con IA (`generate-hooks`)
- [x] **Generador de Guiones** - Guión completo (`generate-full-script`)

### 4. AFILIADOS
- [x] Tabla `affiliates` con ref_code, earnings
- [x] UI en Settings - Código, enlace, estadísticas

### 5. SEGURIDAD
- [x] Vista con `security_invoker = true`
- [x] Funciones con `search_path = public`

---

## 🔄 PENDIENTE

- [ ] VideoAnalysisModal - Columna de negocio con producto vinculado
- [ ] Stripe webhook para comisión de afiliados
- [ ] Deep links a TikTok Shop

---

**Última actualización:** Diciembre 2024
