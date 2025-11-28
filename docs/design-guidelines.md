## 🎨 Emotional Thesis

**adbroll se siente como una herramienta pensada por y para creadores serios: clara, útil y sin ruido.**  
Visualmente, es un SaaS limpio con alma de estudio creativo—como si Notion y MakeUGC se hubieran enfocado en ventas reales.

---

## ✍️ Typography

- **Base family:** `Inter`, sans-serif limpia, legible y moderna
- **Hierarchy:**
  - `H1`: 32px, bold → títulos principales
  - `H2`: 24px, semibold → secciones secundarias
  - `H3`: 18px, medium → subtítulos y labels
  - `Body`: 14–16px, regular → lectura fluida
  - `Mono`: `IBM Plex Mono` o `JetBrains Mono` para transcripciones y guiones IA

- **Line-height:** mínimo 1.5×
- **Contraste:** AA+ mínimo en todos los tamaños y pesos

---

## 🎨 Color System

| Uso                 | Color            | HEX       | RGB              |
|---------------------|------------------|-----------|------------------|
| Fondo principal     | Blanco           | `#FFFFFF` | `rgb(255,255,255)` |
| Texto principal     | Gris oscuro      | `#0F172A` | `rgb(15,23,42)`     |
| Botones primarios   | Azul vibrante    | `#3B82F6` | `rgb(59,130,246)`   |
| Métricas positivas  | Verde ingresos   | `#10B981` | `rgb(16,185,129)`   |
| Métricas negativas  | Rojo costos      | `#EF4444` | `rgb(239,68,68)`    |

- **Accesibilidad:** contraste ≥ 4.5:1 en todos los modos
- **Modo claro por defecto**, dark mode opcional en V2

---

## 📐 Spacing & Layout

- **Sistema:** Grid de 8pt (margen, padding, inter-bloques)
- **Responsive:**
  - 4 columnas en desktop
  - 2 columnas en tablet
  - 1 columna en móvil
- **Vertical rhythm:** 24pt entre secciones principales
- **Tarjetas:** borde suave (8px radius), sombra sutil, espaciado interno 16–24pt

---

## ✨ Motion & Interaction

- **Duración estándar:** 200–250ms
- **Easing:** `ease-out` para entradas suaves
- **Microinteracciones clave:**
  - Hover en tarjetas: levanta + sombra ligera
  - Hover en botón IA: resplandor leve azul
  - Modal: entrada con spring hacia arriba (sube con intención)
- **Empty states:** calmos, útiles, sin sarcasmo

---

## 🗣️ Voice & Tone

**Tono:** Claro, directo, profesional. Inspirador, sin exagerar.

- Onboarding: “Descubre qué vende hoy. Inspírate. Adapta. Vende.”
- Éxito: “Guión guardado. ¡Listo para grabar!”
- Error: “No pudimos procesar este video. Intenta con otro enlace.”

**Emociones clave:** confianza, claridad, acción inmediata

---

## ♻️ System Consistency

- UI inspirada en **shadcn/ui** y **Linear**: limpia, rápida, con patrones consistentes
- Reutilizar el mismo card layout para futuros módulos (B-roll uploader, etc.)
- Tipografía y tonos mantenidos en toda la app (landing, dashboard, modal)

---

## ♿ Accesibilidad

- Uso correcto de `h1–h4`, landmarks y roles ARIA
- Navegación 100% por teclado
- Indicadores de foco visibles
- Alt-text en videos embebidos

---

## 🧠 Emotional Audit Checklist

- ¿Se siente como una app hecha por y para creadores reales? ✅
- ¿Las animaciones comunican sin distraer? ✅
- ¿Los mensajes guían sin juzgar? ✅

---

## ✅ Technical QA Checklist

- [x] Escala tipográfica coherente y en ritmo
- [x] Contraste AA+ en todos los textos
- [x] Estados interactivos distinguibles (hover, focus)
- [x] Animaciones dentro de 150–300ms (excepto entrada modal)

---

## 🧬 Adaptive System Memory

¿Usaste esta misma estética en otro proyecto?  
→ Podemos mantener la paleta, tipo mono y layouts reutilizables para crear continuidad entre apps.

---

## 📸 Design Snapshot

### 🎨 Paleta de colores

```text
#FFFFFF  → fondo
#0F172A  → texto
#3B82F6  → botones
#10B981  → ingresos
#EF4444  → costos
🔠 Escala tipográfica
Elemento	Tamaño	Peso
H1	32px	Bold
H2	24px	Semibold
H3	18px	Medium
Body	14–16px	Regular
Mono	14px	Regular

📐 Spacing & Layout
8pt grid

16–24pt padding en tarjetas

24pt separación entre bloques

Breakpoints: 4 / 2 / 1 columnas (desktop / tablet / móvil)

🧾 Design Integrity Review
El diseño de adbroll equilibra claridad de datos con energía creativa. Las decisiones visuales (como el uso de fuente mono para guiones y colores vibrantes en métricas) comunican confianza sin complejidad.

Sugerencia de mejora: en V1, podrías incluir un modo oscuro con el mismo enfoque visual para mejorar sesiones nocturnas de escritura.
