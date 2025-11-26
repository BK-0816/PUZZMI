/*
  # Add admin functionality

  1. Changes
    - Add is_admin column to profiles table
    - Add policies for admins to access identity verification requests
    - Set current user as admin

  2. Security
    - Only users with is_admin = true can view/update all verification requests
    - Default is_admin to false for new users
*/

-- Add is_admin column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Set current authenticated user as admin
UPDATE profiles 
SET is_admin = true 
WHERE id = (SELECT auth.uid());

-- Add admin policies for identity_verification_requests
CREATE POLICY "Admins can view all identity verification requests"
  ON identity_verification_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update all identity verification requests"
  ON identity_verification_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
