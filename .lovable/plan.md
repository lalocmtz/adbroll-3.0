

## Unlock Conversion Refactor — Visual-Only Redesign

### Current State (594 lines)
The page has 8 sections competing for attention: header, pricing, how-it-works (with video + FeatureSteps), comparison grid, features deep dive (2 mockups), testimonials, FAQ (5 items), final CTA, and footer. The video is buried inside "how it works" below pricing.

### New Layout (single file: `src/pages/Unlock.tsx`)

**Order: Header → Hero → Demo Video → Pricing → Trust Line → Footer**

Remove entirely:
- `testimonials` array + `TestimonialsColumn` import
- Comparison section (Sin/Con Adbroll)
- Features Deep Dive (mockupScriptAnalysis, mockupOpportunities)
- `FeatureSteps` component + step images
- FAQ Accordion
- Final CTA section
- Dead imports: `Accordion*`, `FeatureSteps`, `TestimonialsColumn`, `Badge` (if unused), step/mockup images

Preserve untouched (zero semantic changes):
- All `useState`, `useEffect`, `useSearchParams`, `localStorage` logic
- `handleSubscribe`, `processCheckout`, `handleEmailCaptured`, `handleLogin`, `handleClose`
- `trackInitiateCheckout` call
- `SimpleEmailCaptureModal` mount + props
- `refCode` handling
- `#pricing` scroll behavior

### New Section Structure

1. **Header** — Keep as-is (fixed, logo centered, X close, login button)

2. **Hero** (new, above fold) — Centered, minimal:
   - Headline: "Descubre qué videos están vendiendo HOY en TikTok Shop"
   - Subtitle: one line — "Scripts virales, análisis IA y oportunidades. Todo por $25/mes."
   - 3 bullets max (benefit-led, icon + text)
   - Primary CTA → `handleSubscribe` (same button logic)
   - Small login link below

3. **Demo Video** — Same `<video>` element, promoted to its own full-width centered section with generous spacing, `max-w-3xl`, premium shadow

4. **Pricing/Checkout Block** (`id="pricing"`) — Same Card with plan details + `handleSubscribe` button. No changes to content or logic. Shown after email capture (same `hasProspectEmail` conditional). When no email yet, show the loading placeholder as current.

5. **Trust Line** — Single `<p>`: "Cancela cuando quieras · Sin compromisos · Pago seguro con Stripe"

6. **Footer** — Keep as-is (logo, legal links)

7. **Modal** — `SimpleEmailCaptureModal` unchanged

### Implementation Details
- Single file edit: `src/pages/Unlock.tsx`
- Remove ~250 lines of marketing sections
- Final file ~300 lines
- No new components, no new files, no backend changes
- Clean up unused imports (testimonials data, FeatureSteps, Accordion, mockup/step images)
- Mobile-first spacing preserved with existing `md:` breakpoint pattern

