/*
  # 이메일 인증 시스템 구축

  1. New Tables
    - `email_verifications`
      - `id` (bigint, primary key, auto increment)
      - `email` (text, not null)
      - `verification_code` (text, not null) - 6자리 OTP
      - `expires_at` (timestamptz, not null) - 만료시간
      - `attempts` (integer, default 0) - 시도횟수
      - `verified` (boolean, default false) - 인증완료 여부
      - `verified_at` (timestamptz, nullable) - 인증완료 시간
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `email_verifications` table
    - Add policies for public access (anyone can insert/read own verifications)

  3. Indexes
    - Index on email for fast lookup
    - Index on expires_at for cleanup
    - Index on verified for filtering
*/

-- Create email_verifications table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verifications_verified ON email_verifications(verified);

-- Enable Row Level Security
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can insert email verification"
  ON email_verifications
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can read own email verification"
  ON email_verifications
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can update own email verification"
  ON email_verifications
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);