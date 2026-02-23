/*
  # Add admin insert policy for mate_profiles

  1. Changes
    - Add policy allowing admins to insert mate_profiles for any user
    - This enables admins to convert regular users to mates
  
  2. Security
    - Only users with is_admin = true can insert mate profiles
    - Maintains existing RLS policies for non-admin users
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mate_profiles' 
    AND policyname = 'Admins can insert mate profiles'
  ) THEN
    CREATE POLICY "Admins can insert mate profiles"
      ON mate_profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.is_admin = true
        )
      );
  END IF;
END $$;
