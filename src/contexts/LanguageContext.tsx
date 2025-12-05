import { createContext, useContext, useState, ReactNode } from "react";

type Language = "es" | "en";
type Currency = "MXN" | "USD";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  t: (key: string) => string;
  formatMoney: (amount: number | null | undefined) => string;
}

// Exchange rate MXN to USD (configurable)
const MXN_TO_USD_RATE = 0.058;

const translations = {
  es: {
    // Navigation
    dashboard: "Dashboard",
    videos: "Videos",
    products: "Productos",
    opportunities: "Oportunidades",
    favorites: "Favoritos",
    creators: "Creadores",
    affiliates: "Afiliados",
    admin: "Admin",
    tools: "Herramientas",
    
    // Common labels
    revenue: "Ingresos",
    sales: "Ventas",
    views: "Vistas",
    followers: "Seguidores",
    product: "Producto",
    category: "Categoría",
    price: "Precio",
    commission: "Comisión",
    rating: "Calificación",
    duration: "Duración",
    date: "Fecha",
    
    // Filters
    filters: "Filtros",
    sortBy: "Ordenar por",
    allCategories: "Todas las categorías",
    moreRevenue: "Más ingresos",
    moreSales: "Más ventas",
    moreViews: "Más vistas",
    moreRecent: "Más recientes",
    moreFollowers: "Más seguidores",
    moreLives: "Más lives",
    moreCommission: "Mayor comisión",
    moreCreators: "Más creadores activos",
    bestRating: "Mejor calificación",
    minCommission: "Comisión mín.",
    minRating: "Rating mín.",
    
    // Video related
    viewScript: "Ver guión AI",
    analyzeScript: "Analizar guion y replicar",
    script: "Script",
    analysis: "Análisis",
    aiVariants: "Variantes IA",
    copyScript: "Copiar guion completo",
    generateVariants: "Generar variantes IA",
    viewOnTiktok: "Ver en TikTok",
    openInTiktok: "Abrir en TikTok",
    
    // Product related
    viewProduct: "Ver producto",
    viewProductVideos: "Ver videos de este producto",
    viewInTiktokShop: "Ver en TikTok Shop",
    revenue30d: "Ingresos 30D",
    sales30d: "Ventas 30D",
    estimatedCommission: "Comisión Est.",
    
    // Creator related
    viewCreatorVideos: "Ver videos",
    viewCreatorProducts: "Productos",
    viewProfile: "Ver perfil",
    gmvTotal: "GMV Total",
    lives: "Lives",
    gmvLives: "GMV Lives",
    gmvVideos: "GMV Videos",
    
    // Favorites
    myFavorites: "Mis Favoritos",
    noFavorites: "No tienes favoritos guardados aún",
    savedItems: "elemento(s) guardado(s)",
    noSavedVideos: "No tienes videos guardados",
    noSavedProducts: "No tienes productos guardados",
    noSavedCreators: "No tienes creadores guardados",
    removeFromFavorites: "Quitar de favoritos",
    addToFavorites: "Agregar a favoritos",
    removedFromFavorites: "Eliminado de favoritos",
    savedToFavorites: "Guardado en favoritos",
    scripts: "Guiones",
    
    // Actions
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    copy: "Copiar",
    copied: "Copiado",
    close: "Cerrar",
    viewAll: "Ver todos",
    seeAll: "Ver todos los videos",
    
    // Status
    loading: "Cargando...",
    loadingVideos: "Cargando videos...",
    loadingProducts: "Cargando productos...",
    loadingCreators: "Cargando creadores...",
    loadingFavorites: "Cargando favoritos...",
    noDataAvailable: "No hay datos disponibles",
    noVideosAvailable: "No hay videos disponibles",
    noProductsAvailable: "No hay productos disponibles",
    noCreatorsAvailable: "No hay creadores disponibles",
    
    // Page titles
    top100Videos: "Top 100 Videos de TikTok Shop México",
    tiktokShopProducts: "Productos TikTok Shop",
    top50Creators: "Creadores Top 50 TikTok Shop",
    productsSubtitle: "Los productos más rentables para promocionar como creador",
    creatorsSubtitle: "Los creadores con mejor rendimiento en los últimos 30 días",
    dataBasedOn30Days: "Datos basados en los últimos 30 días",
    dataUpdated: "Datos actualizados · Últimos 30 días",
    
    // Footer
    aboutAdbroll: "Sobre Adbroll",
    faq: "Preguntas Frecuentes",
    privacyPolicy: "Políticas de Privacidad",
    termsConditions: "Términos y Condiciones",
    contact: "Contacto",
    allRightsReserved: "Todos los derechos reservados",
    
    // Auth
    login: "Iniciar sesión",
    logout: "Cerrar sesión",
    myAccount: "Mi cuenta",
    profile: "Perfil",
    settings: "Configuración",
    language: "Idioma",
    currency: "Moneda",
    
    // Misc
    showing: "Mostrando",
    of: "de",
    productsCount: "productos",
    videosCount: "videos",
    creatorsCount: "creadores",
    noProductAssigned: "Sin producto asignado",
  },
  en: {
    // Navigation
    dashboard: "Dashboard",
    videos: "Videos",
    products: "Products",
    opportunities: "Opportunities",
    favorites: "Favorites",
    creators: "Creators",
    affiliates: "Affiliates",
    admin: "Admin",
    tools: "Tools",
    
    // Common labels
    revenue: "Revenue",
    sales: "Sales",
    views: "Views",
    followers: "Followers",
    product: "Product",
    category: "Category",
    price: "Price",
    commission: "Commission",
    rating: "Rating",
    duration: "Duration",
    date: "Date",
    
    // Filters
    filters: "Filters",
    sortBy: "Sort by",
    allCategories: "All categories",
    moreRevenue: "Most revenue",
    moreSales: "Most sales",
    moreViews: "Most views",
    moreRecent: "Most recent",
    moreFollowers: "Most followers",
    moreLives: "Most lives",
    moreCommission: "Highest commission",
    moreCreators: "Most active creators",
    bestRating: "Best rating",
    minCommission: "Min commission",
    minRating: "Min rating",
    
    // Video related
    viewScript: "View AI Script",
    analyzeScript: "Analyze script and replicate",
    script: "Script",
    analysis: "Analysis",
    aiVariants: "AI Variants",
    copyScript: "Copy full script",
    generateVariants: "Generate AI variants",
    viewOnTiktok: "View on TikTok",
    openInTiktok: "Open in TikTok",
    
    // Product related
    viewProduct: "View Product",
    viewProductVideos: "View videos for this product",
    viewInTiktokShop: "View in TikTok Shop",
    revenue30d: "Revenue 30D",
    sales30d: "Sales 30D",
    estimatedCommission: "Est. Commission",
    
    // Creator related
    viewCreatorVideos: "View videos",
    viewCreatorProducts: "Products",
    viewProfile: "View profile",
    gmvTotal: "Total GMV",
    lives: "Lives",
    gmvLives: "GMV Lives",
    gmvVideos: "GMV Videos",
    
    // Favorites
    myFavorites: "My Favorites",
    noFavorites: "You have no saved favorites yet",
    savedItems: "item(s) saved",
    noSavedVideos: "You have no saved videos",
    noSavedProducts: "You have no saved products",
    noSavedCreators: "You have no saved creators",
    removeFromFavorites: "Remove from favorites",
    addToFavorites: "Add to favorites",
    removedFromFavorites: "Removed from favorites",
    savedToFavorites: "Saved to favorites",
    scripts: "Scripts",
    
    // Actions
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    copy: "Copy",
    copied: "Copied",
    close: "Close",
    viewAll: "View all",
    seeAll: "See all videos",
    
    // Status
    loading: "Loading...",
    loadingVideos: "Loading videos...",
    loadingProducts: "Loading products...",
    loadingCreators: "Loading creators...",
    loadingFavorites: "Loading favorites...",
    noDataAvailable: "No data available",
    noVideosAvailable: "No videos available",
    noProductsAvailable: "No products available",
    noCreatorsAvailable: "No creators available",
    
    // Page titles
    top100Videos: "Top 100 TikTok Shop Mexico Videos",
    tiktokShopProducts: "TikTok Shop Products",
    top50Creators: "Top 50 TikTok Shop Creators",
    productsSubtitle: "The most profitable products to promote as a creator",
    creatorsSubtitle: "Top performing creators in the last 30 days",
    dataBasedOn30Days: "Data based on the last 30 days",
    dataUpdated: "Data updated · Last 30 days",
    
    // Footer
    aboutAdbroll: "About Adbroll",
    faq: "FAQ",
    privacyPolicy: "Privacy Policy",
    termsConditions: "Terms & Conditions",
    contact: "Contact",
    allRightsReserved: "All rights reserved",
    
    // Auth
    login: "Log in",
    logout: "Log out",
    myAccount: "My account",
    profile: "Profile",
    settings: "Settings",
    language: "Language",
    currency: "Currency",
    
    // Misc
    showing: "Showing",
    of: "of",
    productsCount: "products",
    videosCount: "videos",
    creatorsCount: "creators",
    noProductAssigned: "No product assigned",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("es");
  const [currency, setCurrency] = useState<Currency>("MXN");

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.es] || key;
  };

  const formatMoney = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return "—";
    
    let value = amount;
    let currencyCode = currency;
    
    // Convert to USD if selected
    if (currency === "USD") {
      value = amount * MXN_TO_USD_RATE;
    }
    
    // Format with abbreviations for large numbers
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M ${currencyCode}`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K ${currencyCode}`;
    }
    
    return new Intl.NumberFormat(language === "es" ? "es-MX" : "en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, currency, setCurrency, t, formatMoney }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
