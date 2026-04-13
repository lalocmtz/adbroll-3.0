-- Clean remaining cross-market contamination: MX videos linked to US products
UPDATE videos v
SET product_id = NULL, 
    product_name = NULL, 
    ai_match_confidence = NULL,
    ai_match_attempted_at = NULL
FROM products p
WHERE v.product_id = p.id
  AND v.country = 'mx' 
  AND p.market = 'us';

-- Also clean US videos linked to MX products (if any)
UPDATE videos v
SET product_id = NULL, 
    product_name = NULL, 
    ai_match_confidence = NULL,
    ai_match_attempted_at = NULL
FROM products p
WHERE v.product_id = p.id
  AND v.country = 'us' 
  AND p.market = 'mx';