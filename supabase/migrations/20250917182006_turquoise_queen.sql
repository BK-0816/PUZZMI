/*
  # 전화번호 인증 시스템 추가

  1. 테이블 변경사항
    - `profiles` 테이블에 전화번호 관련 필드 추가
    - `phone_verifications` 테이블 생성 (SMS 인증 코드 관리)
    
  2. 새로운 필드들
    - `phone_number` (전화번호)
    - `phone_verified` (전화번호 인증 여부)
    - `preferred_contact` (선호 연락 수단)
    - `nationality` (국적)
    - `marketing_consent` (마케팅 동의)
    - `last_login_at` (마지막 로그인)
    - `profile_completed` (프로필 완성 여부)
    
  3. 보안
    - RLS 정책 추가
    - 전화번호 인증 테이블 보안 설정
*/

-- profiles 테이블에 전화번호 관련 필드 추가
DO $$
BEGIN
  -- phone_number 필드 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_number text;
  END IF;

  -- phone_verified 필드 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_verified boolean DEFAULT false;
  END IF;

  -- email_verified 필드 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_verified boolean DEFAULT false;
  END IF;

  -- preferred_contact 필드 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_contact'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferred_contact text DEFAULT 'phone';
  END IF;

  -- nationality 필드 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'nationality'
  ) THEN
    ALTER TABLE profiles ADD COLUMN nationality text;
  END IF;

  -- marketing_consent 필드 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'marketing_consent'
  ) THEN
    ALTER TABLE profiles ADD COLUMN marketing_consent boolean DEFAULT false;
  END IF;

  -- last_login_at 필드 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_login_at timestamptz;
  END IF;

  -- profile_completed 필드 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_completed boolean DEFAULT false;
  END IF;
END $$;

-- 전화번호 인증 코드 관리 테이블 생성
CREATE TABLE IF NOT EXISTS phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  verification_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- phone_verifications 테이블 RLS 활성화
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- 전화번호 인증 정책들
CREATE POLICY "Users can insert their own verification codes"
  ON phone_verifications
  FOR INSERT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own verification codes"
  ON phone_verifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own verification codes"
  ON phone_verifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 관리자는 모든 인증 코드 조회 가능
CREATE POLICY "Admins can read all verification codes"
  ON phone_verifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- 전화번호 유니크 인덱스 (중복 방지)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique 
  ON profiles(phone_number) 
  WHERE phone_number IS NOT NULL;

-- 인증 코드 만료 시간 인덱스 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires 
  ON phone_verifications(expires_at);

-- 전화번호별 인덱스 (조회 성능)
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone 
  ON phone_verifications(phone_number);

-- 오래된 인증 코드 자동 삭제 함수 (선택사항)
CREATE OR REPLACE FUNCTION cleanup_expired_verifications()
RETURNS void AS $$
BEGIN
  DELETE FROM phone_verifications 
  WHERE expires_at < now() - interval '1 day';
END;
$$ LANGUAGE plpgsql;

-- 매일 자동 정리 (cron 확장이 있는 경우)
-- SELECT cron.schedule('cleanup-phone-verifications', '0 2 * * *', 'SELECT cleanup_expired_verifications();');