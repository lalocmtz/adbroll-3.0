import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface FavoriteButtonProps {
  itemId: string;
  itemType: "video" | "product";
  videoUrl?: string; // For videos, we use URL instead of ID
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
}

const FavoriteButton = ({ itemId, itemType, videoUrl, variant = "outline", size = "sm" }: FavoriteButtonProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkFavoriteStatus();
  }, [itemId, itemType, videoUrl]);

  const checkFavoriteStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (itemType === "video" && videoUrl) {
      const { data } = await supabase
        .from("favorites_videos")
        .select("id")
        .eq("user_id", user.id)
        .eq("video_url", videoUrl)
        .maybeSingle();

      if (data) {
        setIsFavorite(true);
        setFavoriteId(data.id);
      }
    } else if (itemType === "product") {
      const { data } = await supabase
        .from("favorites_products")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", itemId)
        .maybeSingle();

      if (data) {
        setIsFavorite(true);
        setFavoriteId(data.id);
      }
    }
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
      if (isFavorite && favoriteId) {
        // Remove from favorites
        if (itemType === "video") {
          const { error } = await supabase
            .from("favorites_videos")
            .delete()
            .eq("id", favoriteId);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("favorites_products")
            .delete()
            .eq("id", favoriteId);

          if (error) throw error;
        }

        setIsFavorite(false);
        setFavoriteId(null);
        toast({
          title: "✓ Eliminado de favoritos",
        });
      } else {
        // Add to favorites
        if (itemType === "video" && videoUrl) {
          // Fetch the full video data
          const { data: videoData, error: fetchError } = await supabase
            .from("daily_feed")
            .select("*")
            .eq("tiktok_url", videoUrl)
            .single();

          if (fetchError) throw fetchError;

          const { data, error } = await supabase
            .from("favorites_videos")
            .insert({
              user_id: user.id,
              video_url: videoUrl,
              video_data: videoData,
            })
            .select()
            .single();

          if (error) throw error;
          setFavoriteId(data.id);
        } else if (itemType === "product") {
          // Fetch the full product data
          const { data: productData, error: fetchError } = await supabase
            .from("products")
            .select("*")
            .eq("id", itemId)
            .single();

          if (fetchError) throw fetchError;

          const { data, error } = await supabase
            .from("favorites_products")
            .insert({
              user_id: user.id,
              product_id: itemId,
              product_data: productData,
            })
            .select()
            .single();

          if (error) throw error;
          setFavoriteId(data.id);
        }

        setIsFavorite(true);
        toast({
          title: "✓ Guardado en favoritos",
        });
      }
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
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
