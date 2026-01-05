/*
  # Add payment_token column to bookings table

  1. Changes
    - Add payment_token column to bookings table for secure payment link generation
    - Add unique constraint to ensure one-time use links
    - Add payment_method column to track payment gateway used
    - Add index for faster token lookups

  2. Security
    - payment_token enables secure, tokenized payment links
    - Unique constraint prevents token reuse
*/

-- Add payment_token column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'payment_token'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_token text UNIQUE;
  END IF;
END $$;

-- Add payment_method column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_method text;
  END IF;
END $$;

-- Create index for payment_token lookups
CREATE INDEX IF NOT EXISTS idx_bookings_payment_token ON bookings(payment_token) WHERE payment_token IS NOT NULL;