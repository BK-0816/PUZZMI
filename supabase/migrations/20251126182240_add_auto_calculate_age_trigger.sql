/*
  # Add automatic age calculation from birth_date

  1. Changes
    - Creates a function to calculate age from birth_date
    - Creates a trigger to automatically calculate age when birth_date is set or updated
    - Updates existing profiles with null age but existing birth_date
  
  2. Details
    - The function calculates age considering month and day (proper age calculation)
    - Trigger runs BEFORE INSERT or UPDATE on profiles table
    - Only calculates if birth_date is provided and age is null or being updated
*/

-- Function to calculate age from birth_date
CREATE OR REPLACE FUNCTION calculate_age_from_birth_date()
RETURNS TRIGGER AS $$
BEGIN
  -- If birth_date is set, calculate age
  IF NEW.birth_date IS NOT NULL THEN
    NEW.age := EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.birth_date));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_calculate_age ON profiles;

-- Create trigger to automatically calculate age
CREATE TRIGGER trigger_calculate_age
  BEFORE INSERT OR UPDATE OF birth_date
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_age_from_birth_date();

-- Update existing profiles with null age but existing birth_date
UPDATE profiles
SET age = EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date))
WHERE birth_date IS NOT NULL AND age IS NULL;