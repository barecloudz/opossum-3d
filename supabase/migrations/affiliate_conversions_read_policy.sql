-- Allow affiliates to read their own conversion records.
-- Without this, the SELECT from affiliate_conversions in the affiliate dashboard
-- is silently blocked by RLS, so conversions (and earned/pending totals) never
-- appear — even when an admin has correctly assigned or approved them.
-- Clicks were already visible because "Affiliate can read own clicks" existed;
-- this mirrors that policy for conversions.

CREATE POLICY "Affiliate can read own conversions"
  ON affiliate_conversions
  FOR SELECT
  USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );
