/*
  # Fix notifications insert policy

  1. Changes
    - Drop all duplicate and overly restrictive notification policies
    - Create new simplified policies that allow:
      - Users to insert notifications where they are the sender
      - Users to insert notifications to any recipient (for booking notifications)
  
  2. Security
    - Users can only set sender_id to their own user ID
    - Users can send notifications to any other user (needed for bookings)
    - Users can only read their own notifications
    - Users can only update their own notifications
*/

-- Drop all existing notification policies
DROP POLICY IF EXISTS "notif_insert" ON notifications;
DROP POLICY IF EXISTS "notif_select" ON notifications;
DROP POLICY IF EXISTS "notif_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_any" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_by_sender" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_sender" ON notifications;
DROP POLICY IF EXISTS "notifications_read_own" ON notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_read" ON notifications;

-- Create simplified policies

-- Allow users to insert notifications where they are the sender
-- No restriction on user_id to allow sending notifications to anyone
CREATE POLICY "Users can send notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Allow users to read their own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());