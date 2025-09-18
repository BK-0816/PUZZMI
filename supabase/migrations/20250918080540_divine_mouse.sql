/*
  # 프로필 테이블 스키마 수정

  1. 기존 테이블 확장
    - `profiles` 테이블에 누락된 컬럼들 추가
    - 전화번호, 국적, 거주지, 직업, 관심사, 자기소개 등

  2. 보안
    - RLS 정책 유지
*/

-- profiles 테이블에 누락된 컬럼들 추가
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

  -- 관심사 추가
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

  -- 업데이트 시간 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;