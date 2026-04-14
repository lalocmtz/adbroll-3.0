// Centralized copy (single source of truth) for the Adbroll onboarding journey.
// Keep this file in sync with the product narrative — every emotional beat
// (hero → paywall → signup → upgrade) should reference strings from here.

export const copy = {
  hero: {
    emoji: "🤖",
    titleEs: "Lo que VENDE HOY en TikTok Shop México",
    titleEn: "What's SELLING TODAY on TikTok Shop Mexico",
    subtitleEs: "Analizado en tiempo real por IA",
    subtitleEn: "Analyzed in real time by AI",
    videosAnalyzedEs: "50,000+ videos analizados",
    videosAnalyzedEn: "50,000+ videos analyzed",
    videoCountSuffixEs: "videos que probaron ser rentables",
    videoCountSuffixEn: "videos proven to be profitable",
    aiBadgeEs: "Detectado por IA",
    aiBadgeEn: "AI Detected",
  },
  modal: {
    emoji: "🚀",
    titleEs: "Estás a punto de desbloquear tu siguiente nivel en TikTok Shop",
    titleEn: "You're about to unlock your next level in TikTok Shop",
    descriptionEs:
      "Accede a análisis IA que otros creadores NO tienen. Descubre qué videos van a vender ANTES de grabarlos.",
    descriptionEn:
      "Access AI analysis other creators DON'T have. Discover which videos will sell BEFORE you film them.",
    ctaEs: "Continuar",
    ctaEn: "Continue",
    trustEs: "Sin costos ocultos. Cancela cuando quieras.",
    trustEn: "No hidden costs. Cancel anytime.",
  },
  sidebar: {
    locked: {
      campaignsEs:
        "Desbloquea en plan Pro — Conecta con 500+ marcas verificadas y recibe campañas pagadas",
      campaignsEn:
        "Unlock on Pro plan — Connect with 500+ verified brands and receive paid campaigns",
      opportunitiesEs:
        "Desbloquea en plan Pro — Productos con alta demanda y poca competencia",
      opportunitiesEn:
        "Unlock on Pro plan — Products with high demand and low competition",
      favoritesEs: "Guarda tus videos favoritos en plan Pro",
      favoritesEn: "Save your favorite videos on Pro plan",
      affiliatesEs: "Panel de afiliados disponible en plan Pro",
      affiliatesEn: "Affiliates panel available on Pro plan",
    },
  },
  affiliates: {
    titleEs: "Programa de Afiliados de Adbroll",
    titleEn: "Adbroll Affiliates Program",
    subtitleEs: "Las marcas vienen a TI (no al revés)",
    subtitleEn: "Brands come to YOU (not the other way around)",
    proBadgeEs: "Solo para Plan Pro",
    proBadgeEn: "Pro Plan Only",
    benefitsEs: [
      "Marcas verificadas que solo trabajan con top creadores",
      "Comisión hasta 30% por cada venta (sin límite)",
      "Campañas pagadas + productos gratis antes del lanzamiento",
      "Dashboard exclusivo con métricas en tiempo real",
    ],
    benefitsEn: [
      "Verified brands that only work with top creators",
      "Up to 30% commission on every sale (no cap)",
      "Paid campaigns + free products before launch",
      "Exclusive dashboard with real-time metrics",
    ],
  },
  opportunities: {
    titleEs: "Oportunidades que SOLO tú puedes capitalizar",
    titleEn: "Opportunities only YOU can capitalize on",
    whyHereLabelEs: "Por qué está aquí",
    whyHereLabelEn: "Why it's here",
    yourOpportunityLabelEs: "Tu oportunidad",
    yourOpportunityLabelEn: "Your opportunity",
    ioScoreLabelEs: "IO Score",
    ioScoreLabelEn: "IO Score",
  },
  signup: {
    titleEs: "Tu análisis IA personalizado te espera",
    titleEn: "Your personalized AI analysis awaits",
    subtitleEs: "Crea tu cuenta en 30 segundos",
    subtitleEn: "Create your account in 30 seconds",
    microcopyEs: "Mismo email, diferente nivel",
    microcopyEn: "Same email, different level",
  },
} as const;

export type Copy = typeof copy;
