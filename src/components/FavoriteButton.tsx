import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface FavoriteButtonProps {
  itemId: string;
  itemType: "video" | "product";
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
}

const FavoriteButton = ({ itemId, itemType, variant = "outline", size = "sm" }: FavoriteButtonProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkFavoriteStatus();
  }, [itemId, itemType]);

  const checkFavoriteStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("item_type", itemType)
      .eq("item_id", itemId)
      .maybeSingle();

    setIsFavorite(!!data);
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para guardar favoritos",
      });
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("item_type", itemType)
          .eq("item_id", itemId);

        if (error) throw error;

        setIsFavorite(false);
        toast({
          title: "Eliminado de favoritos",
        });
      } else {
        // Add to favorites
        const { error } = await supabase
          .from("favorites")
          .insert({
            user_id: user.id,
            item_type: itemType,
            item_id: itemId,
          });

        if (error) throw error;

        setIsFavorite(true);
        toast({
          title: "Guardado en favoritos",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleFavorite}
      disabled={loading}
      className={isFavorite ? "text-red-500 hover:text-red-600" : ""}
    >
      <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
      {isFavorite ? "Guardado" : "Guardar"}
    </Button>
  );
};

export default FavoriteButton;
