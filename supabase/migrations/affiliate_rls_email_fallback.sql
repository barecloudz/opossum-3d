-- Allow affiliates to read their own record by email when user_id is not yet linked.
-- This covers the window between when an invite is sent and when the user clicks it
-- (or any edge case where user_id ends up null despite being approved).
-- The dashboard will auto-link user_id once they sign in, so this is a self-healing fallback.

CREATE POLICY "Affiliate can read own record by email (unlinked)"
  ON affiliates
  FOR SELECT
  USING (
    user_id IS NULL
    AND lower(email) = lower(auth.jwt() ->> 'email')
  );

-- Also allow the update that links user_id (the auto-link in Dashboard.tsx)
CREATE POLICY "Affiliate can link own user_id (unlinked)"
  ON affiliates
  FOR UPDATE
  USING (
    user_id IS NULL
    AND lower(email) = lower(auth.jwt() ->> 'email')
  )
  WITH CHECK (
    user_id = auth.uid()
  );
