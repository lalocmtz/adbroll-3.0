-- Eliminar el foreign key constraint que causa el error
ALTER TABLE public.favorites_scripts 
DROP CONSTRAINT IF EXISTS favorites_scripts_script_id_fkey;