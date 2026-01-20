-- Clean contaminated data: Nullify product_id for videos linked to products from wrong market
-- This affects ~43 videos (MX->US and US->MX mismatches)

UPDATE videos v
SET 
    product_id = NULL, 
    product_name = NULL, 
    ai_match_confidence = NULL,
    ai_match_attempted_at = NULL
FROM products p
WHERE v.product_id = p.id
  AND v.country IS NOT NULL
  AND p.market IS NOT NULL
  AND v.country != p.market;