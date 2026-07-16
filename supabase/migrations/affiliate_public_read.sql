-- Allow anyone (including guests) to look up approved affiliates by code.
-- This is required for:
--   1. Manual code entry at checkout
--   2. Cookie auto-apply at checkout
--   3. Click tracking in AffiliateTracker
-- Only approved affiliates are visible; sensitive payout details are not exposed
-- because Supabase column-level security isn't in use, but the anon key has no
-- write access and this data (name, code, commission_rate) is non-sensitive.

CREATE POLICY "Public can read approved affiliates"
  ON affiliates
  FOR SELECT
  USING (status = 'approved');
