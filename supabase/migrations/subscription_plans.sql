-- Subscription Plans (for Mystery Box feature)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  interval TEXT NOT NULL CHECK (interval IN ('weekly', 'biweekly', 'monthly', 'every2months', 'quarterly')),
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  is_mystery_box BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Subscriptions (both Subscribe & Save and Mystery Box)
CREATE TABLE IF NOT EXISTS customer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- For Subscribe & Save: links to a product
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  -- For Mystery Box: links to a plan
  subscription_plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  interval TEXT NOT NULL CHECK (interval IN ('weekly', 'biweekly', 'monthly', 'every2months', 'quarterly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'canceled', 'past_due')),
  next_billing_date TIMESTAMPTZ,
  -- Preserved customer options for Subscribe & Save
  selected_colors TEXT[],
  product_description TEXT,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-product subscription settings
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS allow_subscriptions BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subscription_intervals TEXT[],
  ADD COLUMN IF NOT EXISTS subscription_discount_rate DECIMAL(5,2) DEFAULT 10.00;

-- RLS: customers can only see their own subscriptions
ALTER TABLE customer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON customer_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON customer_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON customer_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can see all subscriptions
CREATE POLICY "Admins can manage all subscriptions"
  ON customer_subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- subscription_plans are public read, admin write
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active plans"
  ON subscription_plans FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admins can manage plans"
  ON subscription_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
