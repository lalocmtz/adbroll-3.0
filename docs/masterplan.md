## 🎯 Elevator Pitch

Una herramienta diaria, precisa y lista para usar: **adbroll** muestra a los creadores de TikTok Shop los 20 videos que más están vendiendo hoy, con sus métricas y guiones reescritos por IA para replicar el éxito rápidamente.

---

## 🧩 Problema & Misión

**Problema:** Los creadores no saben qué funciona hoy en TikTok Shop ni cómo adaptar creativos ganadores a su producto.

**Misión:** Darles acceso diario a los videos más rentables, con sus guiones transcritos y mejorados por IA, listos para reutilizar sin fricción.

---

## 🎯 Público objetivo

- Creadores de TikTok Shop que venden o están por lanzar.
- Equipos de UGC que buscan adaptar guiones probados a nuevos productos.
- Vendedores con poco tiempo que necesitan inspiración accionable.

---

## 🧰 Funciones principales

- 🔥 Feed diario con los 20 videos más rentables (datos reales de Kalodata).
- 🧠 Transcripción automática del guión con Whisper.
- ✨ Reescritura optimizada por GPT-4 para uso comercial.
- ✍️ Campo editable para guardar versión personalizada.
- 📂 Panel de fundador para subir nuevo archivo Kalodata.
- 🔐 Auth y plan mensual ($25) con acceso completo al dashboard.

---

## ⚙️ Tech Stack (con propósito)

- **Frontend:** Vite + React + TypeScript + Tailwind + shadcn/ui → Rápido, escalable y con estética premium.
- **Backend y BD:** Supabase → Realtime, auth y DB en uno, ideal para MVP.
- **IA integrada:** Whisper API + GPT-4 Turbo → Invisibles para el usuario, pero potentes.
- **Storage:** Lovable Cloud → Almacena transcripciones y guiones generados.
- **Pagos:** Stripe → Cobro sencillo con un solo plan.

---

## 🧮 Modelo de datos conceptual (ERD en palabras)

- `daily_feed`: una tabla que se resetea cada día con 20 videos.
  - Campos clave: `tiktok_url`, `ingresos_mxn`, `transcripcion_original`, `guion_ia`, `guion_personalizado`
- `users`: manejo de autenticación básica via Supabase Auth.
- `admins`: acceso exclusivo a la subida de archivo `.xlsx`

---

## 🖌️ Principios de UI

Basado en Krug:

- 🧠 “No me hagas pensar”: todo es visible, claro y sin scroll innecesario.
- 📦 Grid limpio estilo SaaS moderno (como MakeUGC).
- 📉 Microinteracciones suaves (hover, transiciones de 200–250ms).
- 🎯 El foco está en *acción rápida* y *claridad de datos*.

---

## 🔐 Seguridad & compliance

- Acceso restringido por roles (`admin`, `user`).
- Autenticación con Supabase (email/contraseña).
- Carga de archivos controlada, sin entrada libre de usuario.
- Stripe como pasarela confiable de pagos.

---

## 🚀 Roadmap por fases

### MVP (Semanas 1–4)

- Auth + landing pública
- Dashboard funcional con datos mock
- Panel de subida `.xlsx` para admins
- Feed diario ordenado por ingresos
- Transcripción y reescritura automática por IA

### V1 (Semana 5–8)

- Pagos por Stripe
- Guardado de guiones personalizados por usuario
- Mejora visual de tarjetas y modales

### V2 (Futuro)

- Subida de B-roll propio
- Generación automática de video MakeUGC-style
- Analytics del guión adaptado
- Sugerencias de mejora por IA

---

## 🧨 Riesgos y mitigaciones

| Riesgo                          | Mitigación                            |
| ------------------------------ | ------------------------------------- |
| Whisper falla al transcribir   | Retry automático + fallback manual    |
| IA genera guiones flojos       | Ajustar prompt hasta lograr claridad  |
| TikTok URLs rotas              | Validación + fallback visual          |
| Usuarios no entienden valor    | Landing que muestre antes/después     |

---

## 🌱 Ideas de expansión

- Panel de favoritos y guardados por usuario
- Exportar guiones como PDF o Notion
- API para agencias o creadores avanzados
- Comunidad privada para compartir adaptaciones

