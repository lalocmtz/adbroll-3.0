import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Filter } from "lucide-react";
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

const NICHES = [
  { value: "belleza", labelEs: "Belleza", labelEn: "Beauty" },
  { value: "fitness", labelEs: "Fitness", labelEn: "Fitness" },
  { value: "moda", labelEs: "Moda", labelEn: "Fashion" },
  { value: "tecnologia", labelEs: "Tecnología", labelEn: "Technology" },
  { value: "hogar", labelEs: "Hogar", labelEn: "Home" },
  { value: "otros", labelEs: "Otros", labelEn: "Others" },
];

const CONTENT_TYPES = [
  { value: "ugc", labelEs: "UGC", labelEn: "UGC" },
  { value: "review", labelEs: "Review", labelEn: "Review" },
  { value: "live", labelEs: "Live", labelEn: "Live" },
];

const COUNTRIES = [
  { value: "mx", labelEs: "México", labelEn: "Mexico" },
  { value: "us", labelEs: "Estados Unidos", labelEn: "United States" },
];

const CreatorDirectory = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [creators, setCreators] = useState<DirectoryCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterNiche, setFilterNiche] = useState<string>("all");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterContentType, setFilterContentType] = useState<string>("all");

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
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      creator.full_name.toLowerCase().includes(searchLower) ||
      creator.tiktok_username.toLowerCase().includes(searchLower);

    // Niche filter
    const matchesNiche =
      filterNiche === "all" || creator.niche.includes(filterNiche);

    // Country filter
    const matchesCountry =
      filterCountry === "all" || creator.country === filterCountry;

    // Content type filter
    const matchesContentType =
      filterContentType === "all" || creator.content_type.includes(filterContentType);

    return matchesSearch && matchesNiche && matchesCountry && matchesContentType;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setFilterNiche("all");
    setFilterCountry("all");
    setFilterContentType("all");
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    filterNiche !== "all" ||
    filterCountry !== "all" ||
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

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterNiche} onValueChange={setFilterNiche}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={language === "es" ? "Nicho" : "Niche"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === "es" ? "Todos los nichos" : "All niches"}</SelectItem>
              {NICHES.map((niche) => (
                <SelectItem key={niche.value} value={niche.value}>
                  {language === "es" ? niche.labelEs : niche.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCountry} onValueChange={setFilterCountry}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={language === "es" ? "País" : "Country"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === "es" ? "Todos los países" : "All countries"}</SelectItem>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {language === "es" ? country.labelEs : country.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterContentType} onValueChange={setFilterContentType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={language === "es" ? "Tipo de contenido" : "Content type"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === "es" ? "Todos los tipos" : "All types"}</SelectItem>
              {CONTENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {language === "es" ? type.labelEs : type.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              {language === "es" ? "Limpiar filtros" : "Clear filters"}
            </Button>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            {filteredCreators.length} {language === "es" ? "creadores encontrados" : "creators found"}
          </span>
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
