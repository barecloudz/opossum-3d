-- Add UNIQUE constraint to prevent duplicate conversions for the same order
-- This prevents both accidental manual duplicates and any checkout double-fires
ALTER TABLE affiliate_conversions
  ADD CONSTRAINT affiliate_conversions_order_id_unique UNIQUE (order_id);

-- Ensure 'reversed' is a valid status (was missing from original CHECK constraint)
-- Drop and recreate the constraint to include 'reversed'
ALTER TABLE affiliate_conversions
  DROP CONSTRAINT IF EXISTS affiliate_conversions_status_check;

ALTER TABLE affiliate_conversions
  ADD CONSTRAINT affiliate_conversions_status_check
  CHECK (status IN ('pending', 'approved', 'paid', 'reversed'));
