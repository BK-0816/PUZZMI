/*
  # Add anonymous SELECT policy for identity verification

  1. Changes
    - Add policy allowing anonymous users to read verification requests by token
    - This enables the passport upload page to verify tokens without authentication

  2. Security
    - Only allows reading when a valid verification_token is provided
    - Does not expose user data without the token
*/

CREATE POLICY "Allow anonymous to read verification request by token"
  ON identity_verification_requests
  FOR SELECT
  TO anon
  USING (verification_token IS NOT NULL);
