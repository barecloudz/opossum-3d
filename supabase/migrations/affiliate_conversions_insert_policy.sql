-- Allow anyone (including guests) to insert affiliate conversions at checkout.
-- Without this, the anon key used by the checkout flow is blocked by RLS,
-- so the customer gets their discount but the affiliate never gets commission.
-- Mirrors the existing "Anyone can record click" policy on affiliate_clicks.

CREATE POLICY "Anyone can insert affiliate conversion"
  ON affiliate_conversions
  FOR INSERT
  WITH CHECK (true);
