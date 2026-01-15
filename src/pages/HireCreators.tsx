import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { Users, UserPlus } from "lucide-react";
import CreatorDirectory from "@/components/creators/CreatorDirectory";
import CreatorApplicationForm from "@/components/creators/CreatorApplicationForm";

const HireCreators = () => {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("explorar");

  // Check if tab parameter is set in URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "aplicar") {
      setActiveTab("aplicar");
    }
  }, [searchParams]);

  return (
    <div className="pt-2 pb-24 md:pb-6 px-3 md:px-6">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-lg md:text-xl font-bold text-foreground">
          {language === "es" ? "Contrata Creadores" : "Hire Creators"}
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          {language === "es" 
            ? "Encuentra creadores verificados para tu marca o postúlate como creador"
            : "Find verified creators for your brand or apply as a creator"}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-6">
          <TabsTrigger value="explorar" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">
              {language === "es" ? "Explorar Creadores" : "Explore Creators"}
            </span>
            <span className="sm:hidden">
              {language === "es" ? "Explorar" : "Explore"}
            </span>
          </TabsTrigger>
          <TabsTrigger value="aplicar" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">
              {language === "es" ? "Soy Creador - Postúlate" : "I'm a Creator - Apply"}
            </span>
            <span className="sm:hidden">
              {language === "es" ? "Postúlate" : "Apply"}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="explorar" className="mt-0">
          <CreatorDirectory />
        </TabsContent>

        <TabsContent value="aplicar" className="mt-0">
          <CreatorApplicationForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HireCreators;
