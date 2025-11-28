/*
  # Add admin select policy for user_line_accounts

  1. Changes
    - Add policy for admins to view all LINE accounts
    
  2. Security
    - Only users with is_admin = true can view all LINE accounts
    - Regular users can still only view their own LINE account
*/

CREATE POLICY "Admins can view all LINE accounts"
  ON user_line_accounts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );