import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Video, Package, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminImport = () => {
  const navigate = useNavigate();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [creatorFile, setCreatorFile] = useState<File | null>(null);
  const [videoStatus, setVideoStatus] = useState("");
  const [productStatus, setProductStatus] = useState("");
  const [creatorStatus, setCreatorStatus] = useState("");
  const [isUploadingVideos, setIsUploadingVideos] = useState(false);
  const [isUploadingProducts, setIsUploadingProducts] = useState(false);
  const [isUploadingCreators, setIsUploadingCreators] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkFounderRole();
  }, []);

  const checkFounderRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "founder")
        .maybeSingle();

      if (error || !data) {
        toast({
          title: "Access denied",
          description: "Only founders can access this page.",
          variant: "destructive",
        });
        navigate("/app");
        return;
      }

      setIsFounder(true);
    } catch (error) {
      console.error("Error checking founder role:", error);
      navigate("/app");
    } finally {
      setLoading(false);
    }
  };

  const handleImportVideos = async () => {
    if (!videoFile) return;

    setIsUploadingVideos(true);
    setVideoStatus("Uploading...");

    try {
      const formData = new FormData();
      formData.append("file", videoFile);

      const { data, error } = await supabase.functions.invoke("import-videos", {
        body: formData,
      });

      if (error) throw error;

      setVideoStatus(data.message || "Import complete");
      toast({
        title: "Videos imported",
        description: data.message,
      });
    } catch (error: any) {
      const errorMsg = error.message || "Unknown error";
      setVideoStatus(`Error: ${errorMsg}`);
      toast({
        title: "Import failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsUploadingVideos(false);
      setVideoFile(null);
    }
  };

  const handleImportProducts = async () => {
    if (!productFile) return;

    setIsUploadingProducts(true);
    setProductStatus("Uploading...");

    try {
      const formData = new FormData();
      formData.append("file", productFile);

      const { data, error } = await supabase.functions.invoke("import-products", {
        body: formData,
      });

      if (error) throw error;

      setProductStatus(data.message || "Import complete");
      toast({
        title: "Products imported",
        description: data.message,
      });
    } catch (error: any) {
      const errorMsg = error.message || "Unknown error";
      setProductStatus(`Error: ${errorMsg}`);
      toast({
        title: "Import failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsUploadingProducts(false);
      setProductFile(null);
    }
  };

  const handleImportCreators = async () => {
    if (!creatorFile) return;

    setIsUploadingCreators(true);
    setCreatorStatus("Uploading...");

    try {
      const formData = new FormData();
      formData.append("file", creatorFile);

      const { data, error } = await supabase.functions.invoke("import-creators", {
        body: formData,
      });

      if (error) throw error;

      setCreatorStatus(data.message || "Import complete");
      toast({
        title: "Creators imported",
        description: data.message,
      });
    } catch (error: any) {
      const errorMsg = error.message || "Unknown error";
      setCreatorStatus(`Error: ${errorMsg}`);
      toast({
        title: "Import failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsUploadingCreators(false);
      setCreatorFile(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Checking permissions...</p>
      </div>
    );
  }

  if (!isFounder) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">CSV Import Panel</h1>
          <Button variant="ghost" onClick={() => navigate("/app")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Videos Import */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Video className="h-5 w-5 mr-2" />
                Import videos (videos.csv)
              </CardTitle>
              <CardDescription>
                Upload CSV with video data. Existing videos (by video_url) will be skipped.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="video-file">CSV File</Label>
                <Input
                  id="video-file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files && setVideoFile(e.target.files[0])}
                />
              </div>

              <Button 
                onClick={handleImportVideos} 
                disabled={!videoFile || isUploadingVideos}
                className="w-full"
              >
                {isUploadingVideos ? "Importing..." : "Import"}
              </Button>

              <div className="space-y-2">
                <Label>Status</Label>
                <Textarea 
                  readOnly 
                  value={videoStatus} 
                  placeholder="Import logs will appear here..."
                  className="min-h-[100px] font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Products Import */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Import products (products.csv)
              </CardTitle>
              <CardDescription>
                Upload CSV with product data. Existing products (by tiktok_product_id) will be updated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product-file">CSV File</Label>
                <Input
                  id="product-file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files && setProductFile(e.target.files[0])}
                />
              </div>

              <Button 
                onClick={handleImportProducts} 
                disabled={!productFile || isUploadingProducts}
                className="w-full"
              >
                {isUploadingProducts ? "Importing..." : "Import"}
              </Button>

              <div className="space-y-2">
                <Label>Status</Label>
                <Textarea 
                  readOnly 
                  value={productStatus} 
                  placeholder="Import logs will appear here..."
                  className="min-h-[100px] font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Creators Import */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Import creators (creators.csv)
              </CardTitle>
              <CardDescription>
                Upload CSV with creator data. Existing creators (by creator_handle) will be updated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="creator-file">CSV File</Label>
                <Input
                  id="creator-file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files && setCreatorFile(e.target.files[0])}
                />
              </div>

              <Button 
                onClick={handleImportCreators} 
                disabled={!creatorFile || isUploadingCreators}
                className="w-full"
              >
                {isUploadingCreators ? "Importing..." : "Import"}
              </Button>

              <div className="space-y-2">
                <Label>Status</Label>
                <Textarea 
                  readOnly 
                  value={creatorStatus} 
                  placeholder="Import logs will appear here..."
                  className="min-h-[100px] font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminImport;
