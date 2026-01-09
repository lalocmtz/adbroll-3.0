-- Step 1: Normalize creators.country to lowercase
UPDATE creators SET country = lower(country) WHERE country IN ('MX', 'US');

-- Step 2: Drop unique CONSTRAINT (not just index)
ALTER TABLE creators DROP CONSTRAINT IF EXISTS creators_usuario_creador_key;

-- Step 3: Drop handle unique index
DROP INDEX IF EXISTS idx_creators_handle_unique;

-- Step 4: Create compound unique indexes by (field, country)
CREATE UNIQUE INDEX idx_creators_usuario_country 
ON creators (usuario_creador, country);

CREATE UNIQUE INDEX idx_creators_handle_country 
ON creators (creator_handle, country) 
WHERE creator_handle IS NOT NULL;