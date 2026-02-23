/*
  # Add Admin Delete Policy for Mate Profiles

  ## Changes
  - Add DELETE policy for `mate_profiles` table allowing admins to remove mate profiles
  
  ## Security
  - Only users with `is_admin = true` in their profile can delete mate profiles
  - Prevents unauthorized deletion of mate profiles
*/

CREATE POLICY "Admins can delete mate profiles"
  ON mate_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
