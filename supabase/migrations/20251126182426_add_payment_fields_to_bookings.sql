/*
  # Add payment fields to bookings table

  1. Changes
    - Add total_amount column to store booking price
    - Add currency column to store payment currency (default: JPY)
    - Add payment_status column to track payment state
    - Add payment_id column to store external payment reference
  
  2. Details
    - total_amount: numeric field for amount in the smallest currency unit
    - currency: text field with default 'JPY'
    - payment_status: enum for tracking payment state
    - payment_id: text field for external payment system reference
*/

-- Add payment-related columns to bookings table
DO $$ 
BEGIN
  -- Add total_amount column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN total_amount numeric DEFAULT 0;
  END IF;

  -- Add currency column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'currency'
  ) THEN
    ALTER TABLE bookings ADD COLUMN currency text DEFAULT 'JPY';
  END IF;

  -- Add payment_status column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_status text DEFAULT 'pending';
  END IF;

  -- Add payment_id column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'payment_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_id text;
  END IF;
END $$;