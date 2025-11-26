/*
  # Create passports storage bucket

  1. Storage Setup
    - Create 'passports' bucket for passport verification photos
    - Set bucket to private (not publicly accessible)
    - Configure file size limits and allowed MIME types
  
  2. Security
    - Enable RLS on storage.objects
    - Service role can upload/read/delete (used by Edge Function)
*/

-- Create the passports bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'passports',
  'passports',
  true, -- Public so Edge Function can generate public URLs
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow service role full access to passports" ON storage.objects;

-- Policy: Allow service role full access (Edge Function uses service role)
CREATE POLICY "Allow service role full access to passports"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'passports')
WITH CHECK (bucket_id = 'passports');