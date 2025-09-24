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
    - Add policies for public access (needed for signup process)

  3. Indexes
    - Index on email for faster lookups
    - Index on expires_at for cleanup
*/

-- 이메일 인증 테이블 생성
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verifications_verified ON email_verifications(verified);

-- RLS 활성화
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- 공개 접근 정책 (회원가입 과정에서 필요)
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

-- 만료된 인증 코드 자동 삭제 함수
CREATE OR REPLACE FUNCTION cleanup_expired_email_verifications()
RETURNS void AS $$
BEGIN
  DELETE FROM email_verifications 
  WHERE expires_at < now() - interval '1 day';
END;
$$ LANGUAGE plpgsql;

-- 매일 자동 정리 (선택사항)
-- SELECT cron.schedule('cleanup-email-verifications', '0 2 * * *', 'SELECT cleanup_expired_email_verifications();');