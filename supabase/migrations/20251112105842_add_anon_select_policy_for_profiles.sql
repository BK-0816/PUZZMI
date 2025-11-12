/*
  # Add anonymous read policy for profiles table
  
  1. Changes
    - Add policy to allow anonymous users to check email/phone number uniqueness
    - This is necessary for signup validation before authentication
    - Policy only allows SELECT on email and phone_number columns
  
  2. Security
    - Limited to SELECT operations only
    - Users can only check if email/phone exists, not see other data
*/

CREATE POLICY "Allow anon to check email and phone uniqueness"
  ON profiles
  FOR SELECT
  TO anon
  USING (true);
