import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { Users, UserPlus, Megaphone } from "lucide-react";
import CreatorDirectory from "@/components/creators/CreatorDirectory";
import CreatorApplicationForm from "@/components/creators/CreatorApplicationForm";
import CampaignsTab from "@/components/creators/CampaignsTab";

const Talent = () => {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("campanas");

  // Check if tab parameter is set in URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "aplicar") {
      setActiveTab("aplicar");
    } else if (tab === "creadores") {
      setActiveTab("creadores");
    }
  }, [searchParams]);

  return (
    <div className="pt-2 pb-24 md:pb-6 px-3 md:px-6">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-lg md:text-xl font-bold text-foreground">
          {language === "es" ? "Talento" : "Talent"}
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          {language === "es" 
            ? "Campañas activas, directorio de creadores y postulaciones"
            : "Active campaigns, creator directory and applications"}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-6">
          <TabsTrigger value="campanas" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">
              {language === "es" ? "Campañas" : "Campaigns"}
            </span>
            <span className="sm:hidden">
              {language === "es" ? "Campañas" : "Campaigns"}
            </span>
          </TabsTrigger>
          <TabsTrigger value="creadores" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">
              {language === "es" ? "Creadores" : "Creators"}
            </span>
            <span className="sm:hidden">
              {language === "es" ? "Creadores" : "Creators"}
            </span>
          </TabsTrigger>
          <TabsTrigger value="aplicar" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">
              {language === "es" ? "Soy Creador" : "I'm a Creator"}
            </span>
            <span className="sm:hidden">
              {language === "es" ? "Aplicar" : "Apply"}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campanas" className="mt-0">
          <CampaignsTab />
        </TabsContent>

        <TabsContent value="creadores" className="mt-0">
          <CreatorDirectory />
        </TabsContent>

        <TabsContent value="aplicar" className="mt-0">
          <CreatorApplicationForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Talent;
