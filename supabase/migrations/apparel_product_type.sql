-- Add is_apparel flag to products table
-- When true, the product page shows apparel-style size grid + single-select color UI
-- instead of the standard 3D print customization UI

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_apparel BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN products.is_apparel IS 'When true, product page renders apparel size/color selector instead of standard customization UI';
