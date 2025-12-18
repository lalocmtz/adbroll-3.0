import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface LibraryFolder {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  parent_folder_id: string | null;
  created_at: string;
  updated_at: string;
  file_count?: number;
}

export interface LibraryFile {
  id: string;
  user_id: string;
  folder_id: string | null;
  name: string;
  file_type: string;
  mime_type: string | null;
  file_url: string;
  thumbnail_url: string | null;
  file_size: number;
  duration_seconds: number | null;
  tags: string[];
  metadata: unknown;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LibraryProject {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
  files?: LibraryFile[];
}

const STORAGE_LIMITS = {
  free: 100 * 1024 * 1024, // 100MB
  pro: 5 * 1024 * 1024 * 1024, // 5GB
};

// Generate thumbnail from video file
const generateVideoThumbnail = (file: File): Promise<{ blob: Blob; duration: number } | null> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = () => {
      // Seek to 1 second or 10% of duration, whichever is smaller
      video.currentTime = Math.min(1, video.duration * 0.1);
    };
    
    video.onseeked = () => {
      // Set canvas size (max 320px width for thumbnail)
      const scale = Math.min(1, 320 / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(video.src);
          if (blob) {
            resolve({ blob, duration: Math.round(video.duration) });
          } else {
            resolve(null);
          }
        }, "image/jpeg", 0.8);
      } else {
        URL.revokeObjectURL(video.src);
        resolve(null);
      }
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(null);
    };
    
    // Timeout after 10 seconds
    setTimeout(() => {
      URL.revokeObjectURL(video.src);
      resolve(null);
    }, 10000);
    
    video.src = URL.createObjectURL(file);
  });
};

export const useLibrary = () => {
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [projects, setProjects] = useState<LibraryProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [totalStorageUsed, setTotalStorageUsed] = useState(0);

  // Fetch all folders with file count
  const fetchFolders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("library_folders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching folders:", error);
      return;
    }

    // Get file counts for each folder
    const foldersWithCounts = await Promise.all(
      (data || []).map(async (folder) => {
        const { count } = await supabase
          .from("library_files")
          .select("*", { count: "exact", head: true })
          .eq("folder_id", folder.id);
        return { ...folder, file_count: count || 0 };
      })
    );

    setFolders(foldersWithCounts);
  }, []);

  // Fetch files (optionally by folder)
  const fetchFiles = useCallback(async (folderId?: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from("library_files")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (folderId === null) {
      query = query.is("folder_id", null);
    } else if (folderId) {
      query = query.eq("folder_id", folderId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching files:", error);
      return;
    }

    setFiles(data || []);
  }, []);

  // Fetch recent files
  const fetchRecentFiles = useCallback(async (limit = 10) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("library_files")
      .select("*")
      .eq("user_id", user.id)
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching recent files:", error);
      return [];
    }

    return data || [];
  }, []);

  // Calculate total storage used
  const calculateStorageUsed = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("library_files")
      .select("file_size")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error calculating storage:", error);
      return;
    }

    const total = (data || []).reduce((sum, file) => sum + (file.file_size || 0), 0);
    setTotalStorageUsed(total);
  }, []);

  // Create folder
  const createFolder = async (name: string, icon = "folder", color = "#3B82F6", parentFolderId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "Debes iniciar sesión", variant: "destructive" });
      return null;
    }

    const { data, error } = await supabase
      .from("library_folders")
      .insert({
        user_id: user.id,
        name,
        icon,
        color,
        parent_folder_id: parentFolderId || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating folder:", error);
      toast({ title: "Error", description: "No se pudo crear la carpeta", variant: "destructive" });
      return null;
    }

    await fetchFolders();
    toast({ title: "Carpeta creada", description: `"${name}" creada exitosamente` });
    return data;
  };

  // Update folder
  const updateFolder = async (id: string, updates: Partial<Pick<LibraryFolder, "name" | "icon" | "color">>) => {
    const { error } = await supabase
      .from("library_folders")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Error updating folder:", error);
      toast({ title: "Error", description: "No se pudo actualizar la carpeta", variant: "destructive" });
      return false;
    }

    await fetchFolders();
    toast({ title: "Carpeta actualizada" });
    return true;
  };

  // Delete folder
  const deleteFolder = async (id: string) => {
    const { error } = await supabase
      .from("library_folders")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting folder:", error);
      toast({ title: "Error", description: "No se pudo eliminar la carpeta", variant: "destructive" });
      return false;
    }

    await fetchFolders();
    toast({ title: "Carpeta eliminada" });
    return true;
  };

  // Upload files
  const uploadFiles = async (fileList: FileList | File[], folderId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "Debes iniciar sesión", variant: "destructive" });
      return [];
    }

    setUploading(true);
    const uploadedFiles: LibraryFile[] = [];
    const files = Array.from(fileList);

    // Check storage limit
    const totalNewSize = files.reduce((sum, file) => sum + file.size, 0);
    const storageLimit = STORAGE_LIMITS.pro; // TODO: Check user plan
    
    if (totalStorageUsed + totalNewSize > storageLimit) {
      toast({ 
        title: "Límite de almacenamiento", 
        description: "No tienes suficiente espacio. Actualiza tu plan para más almacenamiento.",
        variant: "destructive" 
      });
      setUploading(false);
      return [];
    }

    for (const file of files) {
      try {
        // Determine file type
        let fileType = "other";
        if (file.type.startsWith("video/")) fileType = "video";
        else if (file.type.startsWith("audio/")) fileType = "audio";
        else if (file.type.startsWith("image/")) fileType = "image";
        else if (file.type.includes("text") || file.name.endsWith(".txt") || file.name.endsWith(".md")) fileType = "script";

        // Upload to storage
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("user-library")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Error uploading file:", uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("user-library")
          .getPublicUrl(fileName);

        let thumbnailUrl: string | null = null;
        let durationSeconds: number | null = null;

        // Generate thumbnail for videos
        if (fileType === "video") {
          const thumbnailResult = await generateVideoThumbnail(file);
          if (thumbnailResult) {
            durationSeconds = thumbnailResult.duration;
            
            // Upload thumbnail
            const thumbFileName = `${user.id}/thumbs/${Date.now()}-thumb.jpg`;
            const { error: thumbError } = await supabase.storage
              .from("user-library")
              .upload(thumbFileName, thumbnailResult.blob, { contentType: "image/jpeg" });

            if (!thumbError) {
              const { data: thumbUrlData } = supabase.storage
                .from("user-library")
                .getPublicUrl(thumbFileName);
              thumbnailUrl = thumbUrlData.publicUrl;
            }
          }
        }

        // For images, use the image itself as thumbnail
        if (fileType === "image") {
          thumbnailUrl = urlData.publicUrl;
        }

        // Create file record
        const { data: fileRecord, error: insertError } = await supabase
          .from("library_files")
          .insert({
            user_id: user.id,
            folder_id: folderId || null,
            name: file.name,
            file_type: fileType,
            mime_type: file.type,
            file_url: urlData.publicUrl,
            thumbnail_url: thumbnailUrl,
            file_size: file.size,
            duration_seconds: durationSeconds,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating file record:", insertError);
          continue;
        }

        uploadedFiles.push(fileRecord);
      } catch (error) {
        console.error("Error processing file:", error);
      }
    }

    setUploading(false);
    await calculateStorageUsed();
    await fetchFolders();
    
    if (uploadedFiles.length > 0) {
      toast({ 
        title: "Archivos subidos", 
        description: `${uploadedFiles.length} archivo(s) subido(s) exitosamente` 
      });
    }

    return uploadedFiles;
  };

  // Move file to folder
  const moveFile = async (fileId: string, toFolderId: string | null) => {
    const { error } = await supabase
      .from("library_files")
      .update({ folder_id: toFolderId })
      .eq("id", fileId);

    if (error) {
      console.error("Error moving file:", error);
      toast({ title: "Error", description: "No se pudo mover el archivo", variant: "destructive" });
      return false;
    }

    await fetchFolders();
    toast({ title: "Archivo movido" });
    return true;
  };

  // Rename file
  const renameFile = async (fileId: string, newName: string) => {
    const { error } = await supabase
      .from("library_files")
      .update({ name: newName })
      .eq("id", fileId);

    if (error) {
      console.error("Error renaming file:", error);
      toast({ title: "Error", description: "No se pudo renombrar el archivo", variant: "destructive" });
      return false;
    }

    toast({ title: "Archivo renombrado" });
    return true;
  };

  // Delete file
  const deleteFile = async (fileId: string, fileUrl: string) => {
    // Extract path from URL for storage deletion
    const urlParts = fileUrl.split("/user-library/");
    const storagePath = urlParts[1];

    if (storagePath) {
      await supabase.storage.from("user-library").remove([storagePath]);
    }

    const { error } = await supabase
      .from("library_files")
      .delete()
      .eq("id", fileId);

    if (error) {
      console.error("Error deleting file:", error);
      toast({ title: "Error", description: "No se pudo eliminar el archivo", variant: "destructive" });
      return false;
    }

    await calculateStorageUsed();
    await fetchFolders();
    toast({ title: "Archivo eliminado" });
    return true;
  };

  // Mark file as used
  const markFileAsUsed = async (fileId: string) => {
    await supabase
      .from("library_files")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", fileId);
  };

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchFolders(), fetchFiles(), calculateStorageUsed()]);
      setLoading(false);
    };
    load();
  }, [fetchFolders, fetchFiles, calculateStorageUsed]);

  return {
    folders,
    files,
    projects,
    loading,
    uploading,
    totalStorageUsed,
    storageLimit: STORAGE_LIMITS.pro,
    fetchFolders,
    fetchFiles,
    fetchRecentFiles,
    createFolder,
    updateFolder,
    deleteFolder,
    uploadFiles,
    moveFile,
    renameFile,
    deleteFile,
    markFileAsUsed,
  };
};
