import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Users, X, Lock, Crown } from "lucide-react";
import { FilterPills } from "@/components/FilterPills";
import CreatorCard from "./CreatorCard";

interface DirectoryCreator {
  id: string;
  full_name: string;
  tiktok_username: string;
  avatar_url: string | null;
  email: string;
  whatsapp: string;
  country: string;
  niche: string[];
  content_type: string[];
  tiktok_url: string | null;
  verified: boolean;
  created_at: string;
}

const CreatorDirectory = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const { hasPaid, isLoggedIn, openPaywall } = useBlurGateContext();
  const [creators, setCreators] = useState<DirectoryCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterNiche, setFilterNiche] = useState<string>("all");
  const [filterContentType, setFilterContentType] = useState<string>("all");

  // Filter options for pills
  const NICHE_OPTIONS = [
    { value: "all", label: language === "es" ? "Todos" : "All" },
    { value: "belleza", label: language === "es" ? "Belleza" : "Beauty" },
    { value: "fitness", label: "Fitness" },
    { value: "moda", label: language === "es" ? "Moda" : "Fashion" },
    { value: "tecnologia", label: "Tech" },
    { value: "hogar", label: language === "es" ? "Hogar" : "Home" },
    { value: "otros", label: language === "es" ? "Otros" : "Others" },
  ];

  const CONTENT_OPTIONS = [
    { value: "all", label: language === "es" ? "Todos" : "All" },
    { value: "ugc", label: "UGC" },
    { value: "review", label: "Review" },
    { value: "live", label: "Live" },
  ];

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("creator_directory")
        .select("*")
        .eq("status", "publico")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCreators((data as DirectoryCreator[]) || []);
    } catch (error: any) {
      toast({
        title: language === "es" ? "Error al cargar creadores" : "Error loading creators",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter creators based on search and filters
  const filteredCreators = creators.filter((creator) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      creator.full_name.toLowerCase().includes(searchLower) ||
      creator.tiktok_username.toLowerCase().includes(searchLower);

    const matchesNiche =
      filterNiche === "all" || creator.niche.includes(filterNiche);

    const matchesContentType =
      filterContentType === "all" || creator.content_type.includes(filterContentType);

    return matchesSearch && matchesNiche && matchesContentType;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setFilterNiche("all");
    setFilterContentType("all");
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    filterNiche !== "all" ||
    filterContentType !== "all";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">
          {language === "es" ? "Cargando creadores..." : "Loading creators..."}
        </p>
      </div>
    );
  }

  // Show paywall if user doesn't have active subscription
  if (!hasPaid) {
    return (
      <div className="space-y-6">
        {/* Teaser: show blurred preview */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-10 pointer-events-none" />
          <div className="blur-sm opacity-60 pointer-events-none">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-4 h-48" />
              ))}
            </div>
          </div>
        </div>

        {/* Paywall Card */}
        <div className="bg-gradient-to-br from-primary/5 to-pink-500/5 rounded-xl border border-primary/20 p-8 text-center -mt-24 relative z-20">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">
            {language === "es" ? "Acceso al Directorio de Creadores" : "Access Creator Directory"}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {language === "es"
              ? "Suscríbete para ver perfiles completos de creadores verificados, contactarlos directamente y colaborar en campañas."
              : "Subscribe to see full profiles of verified creators, contact them directly, and collaborate on campaigns."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button 
              size="lg" 
              className="gap-2"
              onClick={() => openPaywall("creator_directory")}
            >
              <Crown className="h-4 w-4" />
              {language === "es" ? "Desbloquear por $25/mes" : "Unlock for $25/mo"}
            </Button>
            {!isLoggedIn && (
              <Button variant="outline" size="lg" onClick={() => window.location.href = "/login"}>
                {language === "es" ? "Ya tengo cuenta" : "I have an account"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === "es" ? "Buscar por nombre o usuario..." : "Search by name or username..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Niche Pills */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            {language === "es" ? "Nicho" : "Niche"}
          </p>
          <FilterPills
            options={NICHE_OPTIONS}
            value={filterNiche}
            onChange={setFilterNiche}
          />
        </div>

        {/* Content Type Pills */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            {language === "es" ? "Tipo de contenido" : "Content type"}
          </p>
          <FilterPills
            options={CONTENT_OPTIONS}
            value={filterContentType}
            onChange={setFilterContentType}
          />
        </div>

        {/* Results count and clear */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {filteredCreators.length} {language === "es" ? "creadores encontrados" : "creators found"}
            </span>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground h-8">
              <X className="h-3 w-3 mr-1" />
              {language === "es" ? "Limpiar" : "Clear"}
            </Button>
          )}
        </div>
      </div>

      {/* Creators Grid */}
      {filteredCreators.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {language === "es"
              ? "No hay creadores disponibles con estos filtros."
              : "No creators available with these filters."}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
              {language === "es" ? "Limpiar filtros" : "Clear filters"}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCreators.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CreatorDirectory;
