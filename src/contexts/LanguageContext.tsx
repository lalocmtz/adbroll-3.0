import { createContext, useContext, useState, ReactNode } from "react";

type Language = "es" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  es: {
    dashboard: "Dashboard",
    products: "Productos",
    opportunities: "Oportunidades",
    favorites: "Favoritos",
    creators: "Creadores",
    affiliates: "Afiliados",
    admin: "Admin",
    videos: "Videos",
    revenue: "Ingresos",
    sales: "Ventas",
    views: "Vistas",
    followers: "Seguidores",
    product: "Producto",
    category: "Categoría",
    price: "Precio",
    commission: "Comisión",
    viewScript: "Ver guión AI",
    viewProduct: "Ver producto",
    addProduct: "Agregar Producto",
    editProduct: "Editar Producto",
    deleteProduct: "Eliminar Producto",
    productName: "Nombre del Producto",
    productImage: "Imagen del Producto",
    productLink: "Link del Producto",
    save: "Guardar",
    cancel: "Cancelar",
    manualManagement: "Gestión Manual",
  },
  en: {
    dashboard: "Dashboard",
    products: "Products",
    opportunities: "Opportunities",
    favorites: "Favorites",
    creators: "Creators",
    affiliates: "Affiliates",
    admin: "Admin",
    videos: "Videos",
    revenue: "Revenue",
    sales: "Sales",
    views: "Views",
    followers: "Followers",
    product: "Product",
    category: "Category",
    price: "Price",
    commission: "Commission",
    viewScript: "View AI Script",
    viewProduct: "View Product",
    addProduct: "Add Product",
    editProduct: "Edit Product",
    deleteProduct: "Delete Product",
    productName: "Product Name",
    productImage: "Product Image",
    productLink: "Product Link",
    save: "Save",
    cancel: "Cancel",
    manualManagement: "Manual Management",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("es");

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.es] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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