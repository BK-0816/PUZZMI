/*
  # Fix anonymous read policy for profiles table
  
  1. Changes
    - Drop existing anon policy if exists
    - Create new policy to allow anonymous users to check email/phone number uniqueness
  
  2. Security
    - Limited to SELECT operations only for anon role
*/

DROP POLICY IF EXISTS "Allow anon to check email and phone uniqueness" ON profiles;

CREATE POLICY "anon_can_check_duplicates"
  ON profiles
  FOR SELECT
  TO anon
  USING (true);
