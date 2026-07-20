-- Allow admins to read ALL orders (guest orders have user_id = null so per-user policies miss them)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admin can read all orders'
  ) THEN
    -- Only create if RLS is enabled on orders; safe no-op if not
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'orders' AND relrowsecurity = true) THEN
      CREATE POLICY "Admin can read all orders" ON orders
        FOR SELECT USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
  END IF;
END$$;

-- Allow admins to update ANY order (e.g. mark paid, ship, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admin can update all orders'
  ) THEN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'orders' AND relrowsecurity = true) THEN
      CREATE POLICY "Admin can update all orders" ON orders
        FOR UPDATE USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
  END IF;
END$$;

-- Allow admins to read ALL profiles (fixes Customers page showing only 1 customer)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admin can read all profiles'
  ) THEN
    CREATE POLICY "Admin can read all profiles" ON profiles
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END$$;

-- Allow admins to read ALL order_items (so order detail pages show colors/artwork)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Admin can read all order items'
  ) THEN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'order_items' AND relrowsecurity = true) THEN
      CREATE POLICY "Admin can read all order items" ON order_items
        FOR SELECT USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
  END IF;
END$$;
