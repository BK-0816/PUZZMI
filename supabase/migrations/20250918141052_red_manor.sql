/*
  # Fix LINE accounts RLS policies

  1. Policy Changes
    - Drop all existing policies on user_line_accounts table
    - Create new comprehensive policy for all operations
    - Ensure users can INSERT, UPDATE, SELECT their own LINE account data

  2. Security
    - Maintain RLS protection with uid() = user_id condition
    - Allow all CRUD operations for authenticated users on their own data
*/

-- Drop all existing policies on user_line_accounts
DROP POLICY IF EXISTS "Users can insert own LINE account" ON user_line_accounts;
DROP POLICY IF EXISTS "Users can read own LINE account" ON user_line_accounts;
DROP POLICY IF EXISTS "Users can update own LINE account" ON user_line_accounts;
DROP POLICY IF EXISTS "Users can manage own LINE account" ON user_line_accounts;

-- Create a single comprehensive policy for all operations
CREATE POLICY "user_line_accounts_all_own"
  ON user_line_accounts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE user_line_accounts ENABLE ROW LEVEL SECURITY;