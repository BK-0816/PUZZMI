/*
  # Add anonymous insert policy for portone_payments

  1. Changes
    - Add policy allowing anonymous users to insert payment records
    - This is needed for guest checkout functionality where users can make payments without being logged in
  
  2. Security
    - Anonymous users can only insert payment records
    - They cannot read, update, or delete payment records
    - This allows the payment flow to work for non-authenticated users
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'portone_payments' 
    AND policyname = 'Anonymous users can insert payments'
  ) THEN
    CREATE POLICY "Anonymous users can insert payments"
      ON portone_payments
      FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;
