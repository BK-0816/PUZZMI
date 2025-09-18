/*
  # Fix LINE accounts RLS policy

  1. Security Updates
    - Update user_line_accounts RLS policies to allow upsert operations
    - Ensure authenticated users can insert/update their own LINE account data
    - Fix policy conflicts that prevent LINE account creation

  2. Changes
    - Modify INSERT policy to allow upsert operations
    - Update UPDATE policy for better compatibility
    - Ensure policies work with ON CONFLICT operations
*/

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can insert own LINE account" ON user_line_accounts;
DROP POLICY IF EXISTS "Users can update own LINE account" ON user_line_accounts;

-- Create new policies that support upsert operations
CREATE POLICY "Users can manage own LINE account"
  ON user_line_accounts
  FOR ALL
  TO authenticated
  USING (uid() = user_id)
  WITH CHECK (uid() = user_id);

-- Ensure the table has RLS enabled
ALTER TABLE user_line_accounts ENABLE ROW LEVEL SECURITY;