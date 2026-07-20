-- Add require_color_selection flag to products
-- When true, customers must pick at least one color before adding to cart
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS require_color_selection BOOLEAN NOT NULL DEFAULT false;
