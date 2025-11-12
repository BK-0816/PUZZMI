/*
  # 이메일 인증 테이블 생성

  1. New Tables
    - `email_verifications`
      - `id` (bigint, primary key)
      - `email` (text, not null)
      - `verification_code` (text, not null)
      - `expires_at` (timestamptz, not null)
      - `attempts` (integer, default 0)
      - `verified` (boolean, default false)
      - `verified_at` (timestamptz, nullable)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `email_verifications` table
    - Add policies for service role access (needed for Edge Function)

  3. Indexes
    - Index on email for faster lookups
    - Index on expires_at for cleanup
*/

CREATE TABLE IF NOT EXISTS email_verifications (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  verification_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer DEFAULT 0,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verifications_verified ON email_verifications(verified);

ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage email verifications"
  ON email_verifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION cleanup_expired_email_verifications()
RETURNS void AS $$
BEGIN
  DELETE FROM email_verifications 
  WHERE expires_at < now() - interval '1 day';
END;
$$ LANGUAGE plpgsql;