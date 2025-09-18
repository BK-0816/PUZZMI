/*
  # Set Korean Standard Time (KST) as default timezone

  1. Database Configuration
    - Set default timezone to 'Asia/Seoul' (UTC+9)
    - All new timestamp operations will use Korean time
    - Existing UTC data remains unchanged but will display in KST

  2. Benefits
    - All `now()` functions will return Korean time
    - New records will have Korean timestamps
    - Consistent timezone for Korean users

  3. Impact
    - Affects all future timestamp operations
    - Existing data interpretation changes to KST display
    - All tables with timestamp columns affected
*/

-- Set the database timezone to Korea Standard Time (UTC+9)
SET timezone = 'Asia/Seoul';

-- Make this setting persistent for the database
ALTER DATABASE postgres SET timezone = 'Asia/Seoul';

-- Update the default timezone for the current session
SELECT set_config('timezone', 'Asia/Seoul', false);

-- Verify the timezone setting
SELECT current_setting('timezone') as current_timezone;

-- Show current time in the new timezone
SELECT now() as korean_current_time;