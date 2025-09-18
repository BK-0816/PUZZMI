/*
  # LINE 기반 신원확인 시스템 추가

  1. New Tables
    - `line_identity_verifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `line_user_id` (text, LINE 사용자 ID)
      - `verified_name` (text, LINE에서 받은 실명)
      - `verified_age` (integer, LINE에서 받은 나이)
      - `verified_birth_date` (date, LINE에서 받은 생년월일)
      - `verification_level` (text, 인증 레벨)
      - `verified_at` (timestamp)
      - `expires_at` (timestamp, 인증 만료일)
      - `verification_data` (jsonb, 추가 인증 정보)
      - `created_at` (timestamp)

  2. Table Updates
    - `profiles` 테이블에 `identity_verified` 컬럼 추가
    - `profiles` 테이블에 `age_verified` 컬럼 추가
    - `profiles` 테이블에 `verification_source` 컬럼 추가

  3. Security
    - Enable RLS on `line_identity_verifications` table
    - Add policies for users and admins
    - Add age verification constraints

  4. Functions
    - 나이 검증 함수 추가
    - 실명 매칭 함수 추가
*/

-- LINE 신원확인 테이블 생성
CREATE TABLE IF NOT EXISTS line_identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  line_user_id text NOT NULL,
  verified_name text,
  verified_age integer,
  verified_birth_date date,
  verification_level text DEFAULT 'basic' CHECK (verification_level IN ('basic', 'enhanced', 'premium')),
  verified_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '1 year'),
  verification_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(line_user_id)
);

-- profiles 테이블에 인증 관련 컬럼 추가
DO $$
BEGIN
  -- identity_verified 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'identity_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN identity_verified boolean DEFAULT false;
  END IF;

  -- age_verified 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'age_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN age_verified boolean DEFAULT false;
  END IF;

  -- verification_source 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'verification_source'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verification_source text CHECK (verification_source IN ('manual', 'line', 'phone', 'id_card'));
  END IF;

  -- verification_level 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'verification_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verification_level text DEFAULT 'none' CHECK (verification_level IN ('none', 'basic', 'enhanced', 'premium'));
  END IF;
END $$;

-- RLS 활성화
ALTER TABLE line_identity_verifications ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 인증 정보만 조회 가능
CREATE POLICY "Users can read own identity verification"
  ON line_identity_verifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 관리자는 모든 인증 정보 조회 가능
CREATE POLICY "Admins can read all identity verifications"
  ON line_identity_verifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- 시스템만 인증 정보 삽입/수정 가능 (일반 사용자는 직접 수정 불가)
CREATE POLICY "System can manage identity verifications"
  ON line_identity_verifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- 나이 검증 함수
CREATE OR REPLACE FUNCTION verify_user_age(
  p_user_id uuid,
  p_line_birth_date date,
  p_line_name text,
  p_line_user_id text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  calculated_age integer;
  profile_age integer;
  age_difference integer;
BEGIN
  -- LINE에서 받은 생년월일로 나이 계산
  calculated_age := EXTRACT(YEAR FROM age(p_line_birth_date));
  
  -- 프로필의 나이 가져오기
  SELECT age INTO profile_age 
  FROM profiles 
  WHERE id = p_user_id;
  
  -- 나이 차이 계산 (1세 이내 허용)
  age_difference := ABS(calculated_age - COALESCE(profile_age, calculated_age));
  
  -- 인증 정보 저장
  INSERT INTO line_identity_verifications (
    user_id,
    line_user_id,
    verified_name,
    verified_age,
    verified_birth_date,
    verification_level,
    verification_data
  ) VALUES (
    p_user_id,
    p_line_user_id,
    p_line_name,
    calculated_age,
    p_line_birth_date,
    CASE 
      WHEN age_difference <= 1 THEN 'enhanced'
      ELSE 'basic'
    END,
    jsonb_build_object(
      'age_difference', age_difference,
      'profile_age', profile_age,
      'calculated_age', calculated_age,
      'verified_at', now()
    )
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    verified_name = EXCLUDED.verified_name,
    verified_age = EXCLUDED.verified_age,
    verified_birth_date = EXCLUDED.verified_birth_date,
    verification_level = EXCLUDED.verification_level,
    verification_data = EXCLUDED.verification_data,
    verified_at = now();
  
  -- 프로필 인증 상태 업데이트
  UPDATE profiles SET
    identity_verified = true,
    age_verified = (age_difference <= 1),
    verification_source = 'line',
    verification_level = CASE 
      WHEN age_difference <= 1 THEN 'enhanced'
      ELSE 'basic'
    END,
    -- LINE에서 받은 정확한 나이로 업데이트
    age = calculated_age,
    birth_date = p_line_birth_date,
    updated_at = now()
  WHERE id = p_user_id;
  
  RETURN (age_difference <= 1);
END;
$$;

-- 미성년자 예약 제한 함수
CREATE OR REPLACE FUNCTION check_age_restriction_for_booking()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  user_age integer;
  is_age_verified boolean;
  verification_level text;
BEGIN
  -- 고객의 나이 및 인증 상태 확인
  SELECT 
    p.age,
    p.age_verified,
    p.verification_level
  INTO 
    user_age,
    is_age_verified,
    verification_level
  FROM profiles p
  WHERE p.id = NEW.customer_id;
  
  -- 나이 정보가 없는 경우
  IF user_age IS NULL THEN
    RAISE EXCEPTION '나이 정보가 필요합니다. 프로필을 완성해주세요.';
  END IF;
  
  -- 18세 미만 제한
  IF user_age < 18 THEN
    RAISE EXCEPTION '만 18세 미만은 예약할 수 없습니다. (현재 나이: %세)', user_age;
  END IF;
  
  -- 나이 인증이 안된 경우 경고 (차단하지는 않음)
  IF NOT is_age_verified THEN
    -- 로그 기록용 (실제로는 알림 테이블에 기록)
    INSERT INTO notifications (
      user_id,
      type,
      title,
      body
    ) VALUES (
      NEW.customer_id,
      'system',
      '나이 인증 권장',
      '더 안전한 서비스 이용을 위해 LINE 연동을 통한 나이 인증을 권장합니다.'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 예약 테이블에 나이 제한 트리거 추가
DROP TRIGGER IF EXISTS trg_check_age_restriction ON bookings;
CREATE TRIGGER trg_check_age_restriction
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_age_restriction_for_booking();

-- 인증 레벨별 제한 확인 함수
CREATE OR REPLACE FUNCTION get_user_verification_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  profile_data record;
  line_verification record;
BEGIN
  -- 프로필 정보 조회
  SELECT 
    full_name,
    age,
    birth_date,
    identity_verified,
    age_verified,
    verification_source,
    verification_level
  INTO profile_data
  FROM profiles
  WHERE id = p_user_id;
  
  -- LINE 인증 정보 조회
  SELECT 
    verified_name,
    verified_age,
    verified_birth_date,
    verification_level as line_verification_level,
    verified_at,
    expires_at
  INTO line_verification
  FROM line_identity_verifications
  WHERE user_id = p_user_id;
  
  -- 결과 JSON 생성
  result := jsonb_build_object(
    'user_id', p_user_id,
    'profile', jsonb_build_object(
      'name', profile_data.full_name,
      'age', profile_data.age,
      'birth_date', profile_data.birth_date,
      'identity_verified', profile_data.identity_verified,
      'age_verified', profile_data.age_verified,
      'verification_source', profile_data.verification_source,
      'verification_level', profile_data.verification_level
    ),
    'line_verification', CASE 
      WHEN line_verification IS NOT NULL THEN
        jsonb_build_object(
          'verified_name', line_verification.verified_name,
          'verified_age', line_verification.verified_age,
          'verified_birth_date', line_verification.verified_birth_date,
          'verification_level', line_verification.line_verification_level,
          'verified_at', line_verification.verified_at,
          'expires_at', line_verification.expires_at,
          'is_expired', (line_verification.expires_at < now())
        )
      ELSE NULL
    END,
    'restrictions', jsonb_build_object(
      'can_book', (COALESCE(profile_data.age, 0) >= 18),
      'requires_guardian', (COALESCE(profile_data.age, 0) < 18),
      'verification_required', (NOT COALESCE(profile_data.identity_verified, false)),
      'age_verification_required', (NOT COALESCE(profile_data.age_verified, false))
    ),
    'recommendations', jsonb_build_array(
      CASE WHEN NOT COALESCE(profile_data.identity_verified, false) THEN 'LINE 연동을 통한 실명 인증을 권장합니다' END,
      CASE WHEN NOT COALESCE(profile_data.age_verified, false) THEN 'LINE 연동을 통한 나이 인증을 권장합니다' END,
      CASE WHEN line_verification.expires_at < now() THEN 'LINE 인증이 만료되었습니다. 재인증을 진행해주세요' END
    ) - ARRAY[NULL]
  );
  
  RETURN result;
END;
$$;