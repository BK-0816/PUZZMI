/*
  # Create verification-documents storage bucket

  1. Storage Setup
    - Create 'verification-documents' bucket for passport and identity verification photos
    - Set bucket to private (not publicly accessible)
    - Configure file size limits and allowed MIME types
  
  2. Security
    - Enable RLS on storage.objects
    - Add policy for authenticated users to upload their own documents
    - Add policy for service role to read all documents (for admin verification)
    - Add policy for users to read their own documents
*/

-- Create the verification-documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-documents',
  'verification-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role to read all verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own verification documents" ON storage.objects;

-- Policy: Allow authenticated users to upload files to their own folder
CREATE POLICY "Allow authenticated users to upload verification documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to read their own verification documents
CREATE POLICY "Allow users to read own verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow service role to read all verification documents (for admin)
CREATE POLICY "Allow service role to read all verification documents"
ON storage.objects
FOR SELECT
TO service_role
USING (bucket_id = 'verification-documents');

-- Policy: Allow users to update their own verification documents
CREATE POLICY "Allow users to update own verification documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to delete their own verification documents
CREATE POLICY "Allow users to delete own verification documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);