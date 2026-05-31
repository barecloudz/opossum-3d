-- Add sub_id to affiliate_clicks for campaign tracking (e.g. ?ref=CODE&sub=instagram)
ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS sub_id TEXT;

-- Add 'reversed' status to affiliate_conversions for refund clawbacks
ALTER TABLE affiliate_conversions DROP CONSTRAINT IF EXISTS affiliate_conversions_status_check;
ALTER TABLE affiliate_conversions ADD CONSTRAINT affiliate_conversions_status_check
  CHECK (status IN ('pending', 'approved', 'paid', 'reversed'));
