-- Volume / tiered pricing for products
-- Applied when a customer uses an affiliate code at checkout

CREATE TABLE IF NOT EXISTS product_price_tiers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_qty integer NOT NULL CHECK (min_qty >= 1),
  max_qty integer CHECK (max_qty IS NULL OR max_qty >= min_qty),
  price_per_unit numeric(10,2) NOT NULL CHECK (price_per_unit >= 0),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_price_tiers_product_id_idx
  ON product_price_tiers(product_id);

-- RLS
ALTER TABLE product_price_tiers ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage price tiers"
  ON product_price_tiers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Anyone can read tiers (needed at checkout to compute prices)
CREATE POLICY "Anyone can view price tiers"
  ON product_price_tiers FOR SELECT
  USING (true);
