-- Click-to-conversion linkage
ALTER TABLE affiliate_conversions ADD COLUMN IF NOT EXISTS click_id UUID REFERENCES affiliate_clicks(id) ON DELETE SET NULL;

-- Performance index
CREATE INDEX IF NOT EXISTS idx_aff_clicks_aff_created ON affiliate_clicks(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aff_conversions_click ON affiliate_conversions(click_id);

-- Stamp existing approved affiliates at 10% so changing global rate won't affect them
UPDATE affiliates SET commission_rate = 10 WHERE commission_rate IS NULL AND status = 'approved';

-- Change global default to 5% for new affiliates going forward
UPDATE affiliate_settings SET commission_rate = 5 WHERE id = 1;
