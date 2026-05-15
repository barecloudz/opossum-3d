-- Affiliate program settings (single admin-configurable row)
CREATE TABLE IF NOT EXISTS affiliate_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  customer_discount_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  min_payout_threshold DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cookie_duration_days INT NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO affiliate_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Affiliate accounts
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  promo_plan TEXT,
  code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  commission_rate DECIMAL(5,2),
  payout_method TEXT,
  payout_details TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Click tracking
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversions (one per qualifying order)
CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_total DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  payout_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payout records
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  method TEXT NOT NULL,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key from conversions to payouts
ALTER TABLE affiliate_conversions
  ADD CONSTRAINT fk_affiliate_conversions_payout
  FOREIGN KEY (payout_id) REFERENCES affiliate_payouts(id) ON DELETE SET NULL;

-- Add affiliate_id to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS affiliate_discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- RLS policies
ALTER TABLE affiliate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- affiliate_settings: anyone can read, only service role can write
CREATE POLICY "Anyone can read affiliate settings" ON affiliate_settings FOR SELECT USING (true);

-- affiliates: user can read/update their own row; anyone can insert (application)
CREATE POLICY "Anyone can apply as affiliate" ON affiliates FOR INSERT WITH CHECK (true);
CREATE POLICY "Affiliate can read own record" ON affiliates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Affiliate can update own payout info" ON affiliates FOR UPDATE USING (auth.uid() = user_id);

-- affiliate_clicks: anyone can insert (public tracking)
CREATE POLICY "Anyone can record click" ON affiliate_clicks FOR INSERT WITH CHECK (true);

-- affiliate_conversions: affiliate can read own conversions
CREATE POLICY "Affiliate can read own conversions" ON affiliate_conversions FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);

-- affiliate_payouts: affiliate can read own payouts
CREATE POLICY "Affiliate can read own payouts" ON affiliate_payouts FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);
