/*
  # profiles 테이블 확장 - 회원가입 개인정보 보강

  1. 새로운 컬럼들
    - `phone_number` (text) - 전화번호
    - `nationality` (text) - 국적
    - `residence` (text) - 거주지
    - `occupation` (text) - 직업
    - `interests` (text[]) - 관심사 배열
    - `self_introduction` (text) - 자기소개
    - `profile_completion` (integer) - 프로필 완성도 (0-100)
    - `last_login_at` (timestamptz) - 마지막 로그인 시간
    - `account_status` (text) - 계정 상태
    - `updated_at` (timestamptz) - 업데이트 시간

  2. 보안
    - 기존 RLS 정책 유지
*/

-- profiles 테이블에 새로운 컬럼들 추가
DO $$
BEGIN
  -- 전화번호 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_number text;
  END IF;

  -- 국적 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'nationality'
  ) THEN
    ALTER TABLE profiles ADD COLUMN nationality text;
  END IF;

  -- 거주지 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'residence'
  ) THEN
    ALTER TABLE profiles ADD COLUMN residence text;
  END IF;

  -- 직업 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'occupation'
  ) THEN
    ALTER TABLE profiles ADD COLUMN occupation text;
  END IF;

  -- 관심사 배열 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'interests'
  ) THEN
    ALTER TABLE profiles ADD COLUMN interests text[];
  END IF;

  -- 자기소개 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'self_introduction'
  ) THEN
    ALTER TABLE profiles ADD COLUMN self_introduction text;
  END IF;

  -- 프로필 완성도 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_completion'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_completion integer DEFAULT 0;
  END IF;

  -- 마지막 로그인 시간 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_login_at timestamptz;
  END IF;

  -- 계정 상태 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned', 'pending'));
  END IF;

  -- 업데이트 시간 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- LINE 계정 연동 테이블 생성
CREATE TABLE IF NOT EXISTS user_line_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  line_user_id text NOT NULL UNIQUE,
  line_display_name text,
  line_picture_url text,
  is_verified boolean DEFAULT false,
  connected_at timestamptz DEFAULT now(),
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  UNIQUE(user_id)
);

-- 결제 요청 테이블 생성
CREATE TABLE IF NOT EXISTS payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id bigint NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  mate_id uuid NOT NULL REFERENCES mate_profiles(user_id),
  amount integer NOT NULL CHECK (amount > 0),
  currency text DEFAULT 'JPY' CHECK (currency IN ('JPY', 'KRW', 'USD')),
  payment_method text DEFAULT 'line_pay' CHECK (payment_method IN ('line_pay', 'credit_card', 'bank_transfer')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'failed', 'expired', 'cancelled')),
  line_payment_url text,
  payment_deadline timestamptz,
  sent_at timestamptz,
  paid_at timestamptz,
  failed_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- 사용자 인증 상태 테이블 생성
CREATE TABLE IF NOT EXISTS user_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN ('email', 'phone', 'line', 'identity')),
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  verification_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, verification_type)
);

-- RLS 활성화
ALTER TABLE user_line_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;

-- RLS 정책 설정

-- user_line_accounts 정책
CREATE POLICY "Users can read own LINE account"
  ON user_line_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own LINE account"
  ON user_line_accounts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own LINE account"
  ON user_line_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- payment_requests 정책
CREATE POLICY "Users can read own payment requests"
  ON payment_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Mates can read their payment requests"
  ON payment_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = mate_id);

-- user_verifications 정책
CREATE POLICY "Users can read own verifications"
  ON user_verifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own verifications"
  ON user_verifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verifications"
  ON user_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_nationality ON profiles(nationality);
CREATE INDEX IF NOT EXISTS idx_user_line_accounts_user_id ON user_line_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_booking_id ON payment_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON user_verifications(user_id);

-- 프로필 완성도 계산 함수
CREATE OR REPLACE FUNCTION calculate_profile_completion(user_uuid uuid)
RETURNS integer AS $$
DECLARE
  completion_score integer := 0;
  profile_data record;
  line_connected boolean := false;
BEGIN
  -- 프로필 데이터 가져오기
  SELECT * INTO profile_data
  FROM profiles
  WHERE id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- LINE 연동 확인
  SELECT EXISTS(
    SELECT 1 FROM user_line_accounts 
    WHERE user_id = user_uuid AND is_verified = true
  ) INTO line_connected;
  
  -- 점수 계산 (총 100점)
  IF profile_data.full_name IS NOT NULL AND profile_data.full_name != '' THEN
    completion_score := completion_score + 15;
  END IF;
  
  IF profile_data.age IS NOT NULL THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_data.gender IS NOT NULL AND profile_data.gender != '' THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_data.phone_number IS NOT NULL AND profile_data.phone_number != '' THEN
    completion_score := completion_score + 15;
  END IF;
  
  IF profile_data.nationality IS NOT NULL AND profile_data.nationality != '' THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_data.languages IS NOT NULL AND array_length(profile_data.languages, 1) > 0 THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_data.self_introduction IS NOT NULL AND profile_data.self_introduction != '' THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF line_connected THEN
    completion_score := completion_score + 20;
  END IF;
  
  RETURN completion_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;