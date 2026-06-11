import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FolderPlus, 
  Upload, 
  Search, 
  ArrowLeft,
  Clock,
  HardDrive
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLibrary, LibraryFile, LibraryFolder } from "@/hooks/useLibrary";
import LibraryFolderCard from "@/components/library/LibraryFolderCard";
import LibraryFileCard from "@/components/library/LibraryFileCard";
import LibraryUploader from "@/components/library/LibraryUploader";
import LibraryFilePreviewer from "@/components/library/LibraryFilePreviewer";
import FolderCreateModal from "@/components/library/FolderCreateModal";
import PaywallModal from "@/components/PaywallModal";

const Library = () => {
  const { language } = useLanguage();
  const { isLoggedIn } = useBlurGateContext();
  const navigate = useNavigate();

  const {
    folders,
    files,
    loading,
    uploading,
    totalStorageUsed,
    storageLimit,
    fetchFiles,
    createFolder,
    updateFolder,
    deleteFolder,
    uploadFiles,
    moveFile,
    renameFile,
    deleteFile,
    fetchRecentFiles,
  } = useLibrary();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<LibraryFolder | null>(null);
  const [recentFiles, setRecentFiles] = useState<LibraryFile[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<LibraryFile | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  // Redirect visitors
  useEffect(() => {
    if (!isLoggedIn) {
      setShowPaywall(true);
    }
  }, [isLoggedIn]);

  // Fetch files when folder changes
  useEffect(() => {
    fetchFiles(currentFolderId);
    if (currentFolderId) {
      const folder = folders.find((f) => f.id === currentFolderId);
      setCurrentFolder(folder || null);
    } else {
      setCurrentFolder(null);
    }
  }, [currentFolderId, folders, fetchFiles]);

  // Fetch recent files on mount
  useEffect(() => {
    const loadRecent = async () => {
      const recent = await fetchRecentFiles(10);
      setRecentFiles(recent);
    };
    if (isLoggedIn) {
      loadRecent();
    }
  }, [fetchRecentFiles, isLoggedIn]);

  const handleUpload = async (fileList: FileList | File[]) => {
    await uploadFiles(fileList, currentFolderId || undefined);
    await fetchFiles(currentFolderId);
    setShowUploader(false);
  };

  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  const handleBackClick = () => {
    setCurrentFolderId(null);
  };

  const formatStorageSize = (bytes: number) => {
    if (bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const storagePercentage = (totalStorageUsed / storageLimit) * 100;

  // Filter files by search
  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isLoggedIn) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">
              {language === "es" ? "Inicia sesión para acceder" : "Sign in to access"}
            </h2>
            <p className="text-muted-foreground mb-4">
              {language === "es" 
                ? "Mi Biblioteca está disponible para usuarios registrados" 
                : "My Library is available for registered users"}
            </p>
            <Button onClick={() => navigate("/login")}>
              {language === "es" ? "Iniciar sesión" : "Sign in"}
            </Button>
          </div>
        </div>
        <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} />
      </>
    );
  }

  return (
    <div className="pt-2 pb-24 md:pb-6 px-3 md:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          {currentFolderId && (
            <Button variant="ghost" size="icon" onClick={handleBackClick}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-bold">
              {currentFolder?.name || (language === "es" ? "Mi Biblioteca" : "My Library")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {language === "es" 
                ? "Guarda todo lo que necesitas para crear videos más rápido" 
                : "Save everything you need to create videos faster"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFolderModal(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            {language === "es" ? "Nueva carpeta" : "New folder"}
          </Button>
          <Button size="sm" onClick={() => setShowUploader(!showUploader)}>
            <Upload className="h-4 w-4 mr-2" />
            {language === "es" ? "Subir" : "Upload"}
          </Button>
        </div>
      </div>

      {/* Storage Bar - only show if usage > 25% */}
      {storagePercentage > 25 && (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
          <HardDrive className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">
                {language === "es" ? "Almacenamiento" : "Storage"}
              </span>
              <span className="font-medium">
                {formatStorageSize(totalStorageUsed)} / {formatStorageSize(storageLimit)}
              </span>
            </div>
            <Progress value={storagePercentage} className="h-1.5" />
          </div>
        </div>
      )}

      {/* Uploader */}
      {showUploader && (
        <LibraryUploader
          onUpload={handleUpload}
          uploading={uploading}
          className="animate-in fade-in slide-in-from-top-2"
        />
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={language === "es" ? "Buscar archivos..." : "Search files..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Recent Files (only on root) */}
      {!currentFolderId && recentFiles.length > 0 && !searchQuery && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground">
              {language === "es" ? "Usados recientemente" : "Recently used"}
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {recentFiles.slice(0, 6).map((file) => (
              <div key={file.id} className="shrink-0 w-36">
                <LibraryFileCard
                  file={file}
                  folders={folders}
                  onClick={() => setPreviewFile(file)}
                  onRename={renameFile}
                  onDelete={deleteFile}
                  onMove={moveFile}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Folders (only on root) */}
          {!currentFolderId && filteredFolders.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                {language === "es" ? "Carpetas" : "Folders"}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredFolders.map((folder) => (
                  <LibraryFolderCard
                    key={folder.id}
                    folder={folder}
                    onClick={() => handleFolderClick(folder.id)}
                    onRename={(id, name) => updateFolder(id, { name })}
                    onDelete={deleteFolder}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          <div>
            {!currentFolderId && filteredFiles.length > 0 && (
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                {language === "es" ? "Archivos" : "Files"}
              </h2>
            )}

            {filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">
                  {currentFolderId 
                    ? (language === "es" ? "Carpeta vacía" : "Empty folder")
                    : (language === "es" ? "Sin archivos aún" : "No files yet")}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {language === "es" 
                    ? "Arrastra archivos aquí o haz clic en Subir" 
                    : "Drag files here or click Upload"}
                </p>
                <Button onClick={() => setShowUploader(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  {language === "es" ? "Subir archivos" : "Upload files"}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredFiles.map((file) => (
                  <LibraryFileCard
                    key={file.id}
                    file={file}
                    folders={folders}
                    onClick={() => setPreviewFile(file)}
                    onRename={renameFile}
                    onDelete={deleteFile}
                    onMove={moveFile}
                    viewMode="grid"
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      <FolderCreateModal
        open={showFolderModal}
        onOpenChange={setShowFolderModal}
        onCreate={createFolder}
      />

      <LibraryFilePreviewer
        file={previewFile}
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
      />

      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} />
    </div>
  );
};

export default Library;
