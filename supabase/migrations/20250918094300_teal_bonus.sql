/*
  # Add birth_date column to profiles table

  1. Schema Changes
    - Add `birth_date` column to `profiles` table
    - Column type: date (nullable)
    - Allows storing user's birth date for more accurate age calculation

  2. Notes
    - Existing `age` column is kept for backward compatibility
    - New registrations will store both birth_date and calculated age
    - birth_date can be used for birthday-based features in the future
*/

-- Add birth_date column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN birth_date date;
  END IF;
END $$;