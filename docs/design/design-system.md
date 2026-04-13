# Design System — Adbroll (Phase 2 PLAN)

**Phase:** 2 PLAN (`/design-consultation` deliverable)
**Branch:** `overhaul/gstack-landing-app`
**Scope:** extender el sistema de tokens existente (shadcn/ui + Tailwind HSL) con identidad de marca Adbroll (TikTok vibes, es-MX, mobile-first, creator-facing). Este doc es el contrato de tokens que `Phase 3 BUILD` consumirá en `src/styles/tokens.css` + `tailwind.config.ts`.

---

## Principios

1. **Extender, no reemplazar.** El sistema actual (HSL vars en `src/index.css` + shadcn/ui theme) funciona. No lo tiramos. Añadimos una capa de brand tokens encima.
2. **Mobile-first literal.** Tipografía y spacing están pensados para 390px de ancho (iPhone 14). Desktop hereda con `md:` + `lg:`.
3. **JetBrains Mono = dinero.** Cualquier cifra en MXN / USD / % se renderiza en mono para señal de credibilidad ("data", no "marketing"). Todo lo demás es Inter.
4. **TikTok-native pero no imitador.** Rosa `#FE2C55` y azul `#25F4EE` como acentos estratégicos — no como fondo completo. El resto es neutro oscuro / claro para que la data sobresalga.
5. **Motion discipline.** Animaciones sutiles (framer-motion permitido pero con budget), nada que retrase LCP. Prefer `will-change: transform` sobre layout animations.
6. **Dark-mode preservado.** El sistema actual ya soporta light + dark. Los nuevos tokens tienen ambas variantes.
7. **Lovable-safe.** Todo token custom va en `src/styles/tokens.css` (archivo nuevo importado desde `src/index.css`) o en `tailwind.config.ts`. **Nunca hardcoded** en componentes. Si Lovable regenera un componente, el token sobrevive.

---

## Capas del sistema

```
┌─────────────────────────────────────────────────────┐
│  Layer 4: Components (shadcn/ui + custom atoms)     │  ← Phase 3 build
├─────────────────────────────────────────────────────┤
│  Layer 3: Semantic tokens (primary, danger, etc.)   │  ← src/index.css (existente)
├─────────────────────────────────────────────────────┤
│  Layer 2: Brand tokens (adbroll-pink, mono, etc.)   │  ← src/styles/tokens.css (NUEVO)
├─────────────────────────────────────────────────────┤
│  Layer 1: Raw values (#FE2C55, 'JetBrains Mono')    │  ← tailwind.config.ts extend
└─────────────────────────────────────────────────────┘
```

Los componentes **solo** consumen Layer 3 o Layer 4. Jamás Layer 1 directamente.

---

## Layer 1 — Raw values (tailwind.config.ts extend)

```ts
// tailwind.config.ts (extend, no override)
theme: {
  extend: {
    colors: {
      // Existing shadcn HSL tokens remain untouched
      // New brand scale:
      brand: {
        pink:   { DEFAULT: "#FE2C55", 50: "#FFF1F4", 100: "#FFDCE3", 200: "#FFB3C1", 400: "#FF5577", 500: "#FE2C55", 600: "#E01344", 700: "#B3092F" },
        cyan:   { DEFAULT: "#25F4EE", 50: "#ECFEFD", 100: "#CDFBF9", 200: "#9AF7F2", 400: "#45F7F1", 500: "#25F4EE", 600: "#10D8D1", 700: "#0BA8A2" },
        ink:    { DEFAULT: "#0A0A0F", 900: "#0A0A0F", 800: "#14141D", 700: "#1C1C28" },
        mist:   { DEFAULT: "#F7F7FB", 50: "#FFFFFF", 100: "#F7F7FB", 200: "#EEEEF5" },
        money:  { DEFAULT: "#16A34A" },  // verde Tailwind emerald-600, MXN positivo
        alert:  { DEFAULT: "#F59E0B" },  // amber-500, MXN dropping
      },
    },
    fontFamily: {
      sans: ["Inter", "system-ui", "sans-serif"],
      mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      display: ["Inter", "system-ui", "sans-serif"],  // reusable alias for hero titles
    },
    fontSize: {
      // Mobile-first display scale (390px primary)
      "display-xl": ["48px", { lineHeight: "52px", letterSpacing: "-0.03em", fontWeight: "800" }],
      "display-lg": ["36px", { lineHeight: "40px", letterSpacing: "-0.025em", fontWeight: "800" }],
      "display-md": ["28px", { lineHeight: "32px", letterSpacing: "-0.02em", fontWeight: "700" }],
      "display-sm": ["22px", { lineHeight: "28px", letterSpacing: "-0.015em", fontWeight: "700" }],
      "money-xl":   ["40px", { lineHeight: "44px", letterSpacing: "-0.01em", fontWeight: "700" }],
      "money-lg":   ["28px", { lineHeight: "32px", fontWeight: "600" }],
      "money-md":   ["20px", { lineHeight: "24px", fontWeight: "600" }],
      "micro":      ["11px", { lineHeight: "14px", letterSpacing: "0.04em", fontWeight: "600", textTransform: "uppercase" }],
    },
    boxShadow: {
      "brand-glow-pink": "0 0 0 1px rgba(254,44,85,0.2), 0 10px 30px -5px rgba(254,44,85,0.35)",
      "brand-glow-cyan": "0 0 0 1px rgba(37,244,238,0.2), 0 10px 30px -5px rgba(37,244,238,0.35)",
      "card-tactile":    "0 1px 2px rgba(10,10,15,0.06), 0 4px 16px -4px rgba(10,10,15,0.1)",
      "card-tactile-lg": "0 2px 4px rgba(10,10,15,0.08), 0 12px 32px -8px rgba(10,10,15,0.18)",
    },
    borderRadius: {
      // shadcn already exposes --radius 0.75rem; we add explicit friends
      "card":   "14px",
      "button": "10px",
      "pill":   "999px",
    },
    animation: {
      // Existing float-slow/ticker-up/marquee-x preserved
      "count-up":       "count-up 0.6s ease-out",
      "fade-in-up":     "fade-in-up 0.5s ease-out both",
      "tap-bounce":     "tap-bounce 0.2s ease-out",
      "pulse-glow-pink":"pulse-glow-pink 2.4s ease-in-out infinite",
    },
    keyframes: {
      "count-up":       { "from": { opacity: "0", transform: "translateY(8px)" }, "to": { opacity: "1", transform: "translateY(0)" } },
      "fade-in-up":     { "from": { opacity: "0", transform: "translateY(16px)" }, "to": { opacity: "1", transform: "translateY(0)" } },
      "tap-bounce":     { "0%": { transform: "scale(1)" }, "50%": { transform: "scale(0.96)" }, "100%": { transform: "scale(1)" } },
      "pulse-glow-pink":{ "0%,100%": { boxShadow: "0 0 0 0 rgba(254,44,85,0.55)" }, "50%": { boxShadow: "0 0 0 12px rgba(254,44,85,0)" } },
    },
  },
}
```

---

## Layer 2 — Brand tokens (`src/styles/tokens.css`)

Archivo nuevo. Se importa desde `src/index.css` al final del `@layer base` con `@import "./styles/tokens.css";`.

```css
/* src/styles/tokens.css — brand tokens, Adbroll, Phase 2 PLAN */
@layer base {
  :root {
    /* Brand accents (HEX en vez de HSL para no chocar con shadcn vars) */
    --brand-pink: #FE2C55;
    --brand-pink-soft: #FFDCE3;
    --brand-cyan: #25F4EE;
    --brand-cyan-soft: #CDFBF9;
    --brand-ink: #0A0A0F;
    --brand-mist: #F7F7FB;
    --brand-money: #16A34A;
    --brand-alert: #F59E0B;

    /* Gradients usados en hero y CTA */
    --gradient-brand: linear-gradient(135deg, #FE2C55 0%, #FF5577 100%);
    --gradient-cyber: linear-gradient(135deg, #FE2C55 0%, #25F4EE 100%);
    --gradient-ink:   linear-gradient(180deg, #0A0A0F 0%, #1C1C28 100%);

    /* Tipografía */
    --font-sans: "Inter", system-ui, sans-serif;
    --font-mono: "JetBrains Mono", ui-monospace, monospace;

    /* Spacing semántico (mobile-first) */
    --page-pad-x: 16px;
    --section-pad-y: 48px;
    --card-gap: 12px;

    /* Touch targets (iOS HIG = 44px) */
    --touch-min: 44px;
  }

  @media (min-width: 768px) {
    :root {
      --page-pad-x: 32px;
      --section-pad-y: 80px;
    }
  }

  @media (min-width: 1280px) {
    :root {
      --page-pad-x: 64px;
      --section-pad-y: 120px;
    }
  }

  /* Dark mode overrides — los brand accents no cambian, el ink/mist sí */
  .dark {
    --brand-ink: #FFFFFF;
    --brand-mist: #0A0A0F;
  }
}
```

---

## Layer 3 — Semantic tokens (preservados)

Los semantic tokens actuales (`--primary`, `--secondary`, `--accent`, `--background`, `--foreground`, `--muted`, `--border`, `--destructive`, `--success`) **no se tocan**. Seguimos usando shadcn/ui como está configurado hoy.

**Nueva regla:** el `--primary` HSL actual (`221 83% 53%`, azul) **no se elimina**, pero en la landing redesign usamos `brand-pink` como CTA principal. ¿Por qué no cambiar `--primary`? Porque afectaría todos los botones primary de `/app`, `/admin`, etc., y rompería consistencia. En vez de eso, los componentes de landing usan la variante `variant="brand"` en el Button.

---

## Layer 4 — Componentes (Phase 3 BUILD)

### Button variants nuevos

```tsx
// src/components/ui/button.tsx — añadir variants
const buttonVariants = cva(
  "...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        // ...existing...
        brand:         "bg-brand-pink text-white shadow-brand-glow-pink hover:bg-brand-pink-600 active:animate-tap-bounce",
        "brand-outline": "border-2 border-brand-pink text-brand-pink bg-transparent hover:bg-brand-pink/10",
        cyber:         "bg-brand-cyan text-brand-ink shadow-brand-glow-cyan hover:bg-brand-cyan-600",
        ghost-dark:    "bg-transparent text-brand-mist hover:bg-white/10",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-button",
        md: "h-11 px-5 text-base rounded-button",  // 44px touch target
        lg: "h-13 px-6 text-lg rounded-button font-semibold",  // 52px hero CTA
        xl: "h-14 px-8 text-xl rounded-button font-semibold",  // 56px hero mega
      },
    },
  }
);
```

### Componentes nuevos / atoms

| Componente | Uso | Archivo destino |
|---|---|---|
| `BrandLogo` | wordmark "adbroll" + mark | `src/components/brand/Logo.tsx` |
| `MoneyNumber` | número MXN/USD con mono + animate count-up | `src/components/brand/MoneyNumber.tsx` |
| `Top20Card` | tarjeta individual del Top 20 (mobile-first, tactile) | `src/components/top20/Top20Card.tsx` |
| `GuionModal` | modal con tabs transcrito/ia_optimizado/ia_agresivo | `src/components/guion/GuionModal.tsx` |
| `CreatorSpotlight` | strip de 3 creadores con MXN del día (preservado del brief §4) | `src/components/creators/CreatorSpotlight.tsx` |
| `CalculatorROAS` | slider interactivo del hero (cuánto puedo ganar) | `src/components/landing/CalculatorROAS.tsx` |
| `TrustBar` | fila de 4 stats con mono | `src/components/landing/TrustBar.tsx` |
| `VariantResearchCard` | research survey dentro de `/app` (reemplaza waitlist) | `src/components/research/VariantResearchCard.tsx` |
| `StreakBadge` | racha de días abriendo la app | `src/components/dashboard/StreakBadge.tsx` |

Cada atom es ≤150 LOC, mobile-first, sin imports cruzados más allá de `@/components/ui/*` y `@/lib/utils`.

---

## Tipografía aplicada

| Nivel | Class | Cuándo |
|---|---|---|
| Hero H1 | `text-display-xl md:text-[64px] md:leading-[68px]` | Headline landing |
| Section H2 | `text-display-lg md:text-[44px] md:leading-[48px]` | Títulos de secciones |
| Card title | `text-display-sm` | Tarjetas Top 20 |
| Money hero | `font-mono text-money-xl text-brand-pink` | "$14,320 MXN" en hero |
| Money card | `font-mono text-money-md text-brand-money` | MXN en fila del Top 20 |
| Micro label | `text-micro text-brand-ink/60` | "TOP 20 · HOY" chips |
| Body | `text-base leading-relaxed` | Párrafos, FAQ |

**Regla duro:** jamás usar `font-mono` para copy que no sea un número, porcentaje o código. El mono es señal, no decoración.

---

## Color usage rules

- `brand-pink` → **CTAs primarios** (button variant=brand), estados "vendido mucho", el wordmark
- `brand-cyan` → **accent secundario**, badges "nuevo / subiendo", iconos de streak
- Gradient `--gradient-brand` → fondo de hero-cards o pull-quotes (no fondos de página)
- Gradient `--gradient-cyber` → solo para el CTA del pricing y el badge "Top 20" animado
- `brand-money` → cifras de MXN positivas, deltas al alza
- `brand-alert` → deltas negativos, urgencia ("solo hoy"), nunca errores
- `destructive` (existente) → errores técnicos, validación
- Fondo de landing: `bg-brand-mist dark:bg-brand-ink` — neutros, nunca brand-pink como base

---

## Motion budget

| Elemento | Animación | Duración | Gate |
|---|---|---|---|
| Hero headline entrance | `fade-in-up` | 500ms | on mount |
| Money counts (hero, stats bar) | `count-up` + animated number | 600ms | IntersectionObserver once |
| Top 20 rows | stagger `fade-in-up` cada 40ms | 500ms | IntersectionObserver once |
| Primary CTA idle | `pulse-glow-pink` | 2.4s loop | solo en hero, pausa en hover |
| Button tap | `tap-bounce` | 200ms | `active:` state |
| Modal open | slide-up + fade | 280ms | framer-motion `layout` |
| Tab switch (guion variants) | crossfade | 200ms | framer-motion |

**Prohibido:** animaciones de layout que afectan LCP del hero, parallax pesado, scroll-jacking, autoplay de video con audio.

---

## Icons

Usar `lucide-react` (ya en el stack). Tamaño default 20px, 24px en botones grande, 16px en chips.

Iconos canónicos:
- Top 20 → `Flame`
- Guión → `Sparkles`
- Copiar → `Copy` → con feedback `Check` al copiar
- Creator → `User2`
- Revenue → `TrendingUp`
- Streak → `Flame` (reusado)
- Research survey → `FlaskConical`

---

## Responsive breakpoints

Se usan los defaults de Tailwind (`sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536). Diseñamos en:

- **390px** (iPhone 14) — primary target
- **768px** (iPad portrait) — breakpoint medio
- **1280px** (laptop) — desktop

Nada se diseña pensando en pantallas >1536px primero. Si alguien lo abre en un monitor 4K, max-width del container es `1280px` y se centra.

---

## Accessibility floor

- Contraste AA mínimo (WCAG 2.1) — verificado con axe-core en `/qa`
- Touch targets ≥44px (`var(--touch-min)`)
- Focus visible siempre (no `outline: none` sin ring alternativo)
- Modal con trap focus + ESC para cerrar
- Botones con `aria-label` si solo son icono
- Iconos decorativos con `aria-hidden="true"`
- Respetar `prefers-reduced-motion` — pausa `pulse-glow-pink` y `count-up` si está activo

---

## Checklist Phase 3 BUILD (del design system)

- [ ] Crear `src/styles/tokens.css` con Layer 2
- [ ] Importar `tokens.css` desde `src/index.css` (no desde `main.tsx`)
- [ ] Extender `tailwind.config.ts` con Layer 1
- [ ] Añadir variants `brand`, `brand-outline`, `cyber`, `ghost-dark` al Button
- [ ] Añadir fonts: `<link>` a Inter + JetBrains Mono en `index.html` con `preconnect` a fonts.gstatic
- [ ] Crear atoms en orden: `BrandLogo` → `MoneyNumber` → `TrustBar` → `Top20Card` → `GuionModal` → `CalculatorROAS` → resto
- [ ] Smoke test post-Lovable-sync: verificar que `tokens.css` y `tailwind.config.ts` sobreviven un `git pull` desde Lovable

---

**Next:** `docs/design/landing-shotgun.md` — 4 variantes conceptuales de la landing con layout ASCII + copy keywords + racional de cuándo elegir cuál.
