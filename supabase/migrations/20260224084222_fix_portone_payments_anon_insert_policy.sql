/*
  # Fix portone_payments INSERT policy for anonymous payments
  
  1. Changes
    - Drop existing "Users can insert own payments" policy
    - Create new policy that allows authenticated users to insert payments with null or matching user_id
    - This supports both authenticated and anonymous payment scenarios
  
  2. Security
    - Authenticated users can insert payments where user_id is null (anonymous) or matches their own ID
    - Anonymous users can still insert payments via the existing anon policy
*/

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can insert own payments" ON portone_payments;

-- Create new policy that allows both scenarios
CREATE POLICY "Users can insert payments"
  ON portone_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
