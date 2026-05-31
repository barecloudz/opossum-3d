CREATE TABLE IF NOT EXISTS affiliate_milestone_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversions_required INT NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Default tiers
INSERT INTO affiliate_milestone_tiers (conversions_required, commission_rate, label, description, display_order) VALUES
(0,  5,  'Starter',    'Your starting commission rate when you join the program.', 0),
(20, 7,  'Rising Star','Refer 20 orders to unlock 7% commission. Keep growing!', 1),
(45, 10, 'Elite',      'Refer 45 total orders to unlock the maximum 10% commission.', 2)
ON CONFLICT DO NOTHING;

-- RLS: anyone can read, only service role writes
ALTER TABLE affiliate_milestone_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read milestone tiers" ON affiliate_milestone_tiers FOR SELECT USING (true);
