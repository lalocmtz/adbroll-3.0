-- Create library_folders table
CREATE TABLE public.library_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'folder',
  color TEXT DEFAULT '#3B82F6',
  parent_folder_id UUID REFERENCES public.library_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create library_files table
CREATE TABLE public.library_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  folder_id UUID REFERENCES public.library_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size BIGINT DEFAULT 0,
  duration_seconds INTEGER,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create library_projects table
CREATE TABLE public.library_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create library_project_files junction table
CREATE TABLE public.library_project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.library_projects(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.library_files(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  UNIQUE(project_id, file_id)
);

-- Enable RLS on all tables
ALTER TABLE public.library_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_project_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for library_folders
CREATE POLICY "Users can view own folders" ON public.library_folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders" ON public.library_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON public.library_folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON public.library_folders
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for library_files
CREATE POLICY "Users can view own files" ON public.library_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own files" ON public.library_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files" ON public.library_files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files" ON public.library_files
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for library_projects
CREATE POLICY "Users can view own projects" ON public.library_projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON public.library_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.library_projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.library_projects
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for library_project_files (through project ownership)
CREATE POLICY "Users can view own project files" ON public.library_project_files
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.library_projects WHERE id = project_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create own project files" ON public.library_project_files
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.library_projects WHERE id = project_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete own project files" ON public.library_project_files
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.library_projects WHERE id = project_id AND user_id = auth.uid())
  );

-- Create storage bucket for user library files
INSERT INTO storage.buckets (id, name, public) VALUES ('user-library', 'user-library', true);

-- Storage policies for user-library bucket
CREATE POLICY "Users can upload own library files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-library' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own library files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user-library' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own library files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-library' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own library files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-library' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Triggers for updated_at
CREATE TRIGGER update_library_folders_updated_at
  BEFORE UPDATE ON public.library_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_library_files_updated_at
  BEFORE UPDATE ON public.library_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_library_projects_updated_at
  BEFORE UPDATE ON public.library_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();