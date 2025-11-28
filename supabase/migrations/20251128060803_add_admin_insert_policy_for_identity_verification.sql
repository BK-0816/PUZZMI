/*
  # Add admin insert policy for identity_verification_requests

  1. Changes
    - Add policy for admins to create verification requests for any user
    
  2. Security
    - Only users with is_admin = true can create verification requests for other users
    - Regular users can still only create verification requests for themselves
*/

CREATE POLICY "Admins can create verification requests for any user"
  ON identity_verification_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );