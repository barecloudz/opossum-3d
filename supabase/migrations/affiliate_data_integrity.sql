-- Add UNIQUE constraint to prevent duplicate conversions for the same order
-- PostgreSQL doesn't support IF NOT EXISTS for ADD CONSTRAINT, so use a DO block
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'affiliate_conversions_order_id_unique'
  ) THEN
    ALTER TABLE affiliate_conversions
      ADD CONSTRAINT affiliate_conversions_order_id_unique UNIQUE (order_id);
  END IF;
END$$;

-- Ensure 'reversed' is a valid status (was missing from original CHECK constraint)
-- Drop and recreate the constraint to include 'reversed'
ALTER TABLE affiliate_conversions
  DROP CONSTRAINT IF EXISTS affiliate_conversions_status_check;

ALTER TABLE affiliate_conversions
  ADD CONSTRAINT affiliate_conversions_status_check
  CHECK (status IN ('pending', 'approved', 'paid', 'reversed'));
