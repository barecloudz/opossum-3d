ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_colors text[] DEFAULT '{}';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_description text;

ALTER TABLE products ADD COLUMN IF NOT EXISTS available_colors text[];
