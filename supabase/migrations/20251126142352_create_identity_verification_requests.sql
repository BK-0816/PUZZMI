/*
  # 신원인증 요청 시스템 생성

  ## 새로운 테이블

  ### identity_verification_requests
  사용자의 신원인증 요청 및 여권 업로드 관리
  
  **컬럼:**
  - `id` (uuid, primary key) - 요청 고유 ID
  - `user_id` (uuid, foreign key) - 요청한 사용자
  - `status` (text) - 상태: 'pending', 'passport_uploaded', 'approved', 'rejected'
  - `verification_token` (text, unique) - 여권 업로드 링크용 토큰
  - `passport_image_url` (text) - 업로드된 여권 이미지 URL
  - `admin_notes` (text) - 관리자 메모
  - `verified_name` (text) - 인증된 이름
  - `verified_birth_date` (date) - 인증된 생년월일
  - `verified_age` (integer) - 인증된 나이
  - `verified_nationality` (text) - 인증된 국적
  - `approved_by` (uuid, foreign key) - 승인한 관리자
  - `approved_at` (timestamptz) - 승인 일시
  - `rejected_reason` (text) - 거부 사유
  - `created_at` (timestamptz) - 요청 생성 일시
  - `updated_at` (timestamptz) - 마지막 업데이트 일시

  ## 보안
  - RLS 활성화
  - 사용자는 자신의 요청만 조회/생성 가능
  - 여권 업로드는 토큰 기반으로 anon 접근 허용
  - 관리자 페이지는 service role로 접근
*/

-- identity_verification_requests 테이블 생성
CREATE TABLE IF NOT EXISTS identity_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'passport_uploaded', 'approved', 'rejected')),
  verification_token text UNIQUE,
  passport_image_url text,
  admin_notes text,
  verified_name text,
  verified_birth_date date,
  verified_age integer,
  verified_nationality text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_identity_verification_requests_user_id 
  ON identity_verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_verification_requests_status 
  ON identity_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_identity_verification_requests_token 
  ON identity_verification_requests(verification_token);

-- RLS 활성화
ALTER TABLE identity_verification_requests ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 요청만 조회 가능
CREATE POLICY "Users can view own verification requests"
  ON identity_verification_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 사용자는 자신의 요청 생성 가능
CREATE POLICY "Users can create own verification requests"
  ON identity_verification_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 pending 요청 업데이트 가능 (여권 업로드용)
CREATE POLICY "Users can update own pending requests"
  ON identity_verification_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending', 'passport_uploaded'))
  WITH CHECK (auth.uid() = user_id);

-- 토큰 기반 여권 업로드를 위한 anon 정책
CREATE POLICY "Allow passport upload via token"
  ON identity_verification_requests
  FOR UPDATE
  TO anon
  USING (verification_token IS NOT NULL)
  WITH CHECK (verification_token IS NOT NULL);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_identity_verification_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS identity_verification_requests_updated_at ON identity_verification_requests;
CREATE TRIGGER identity_verification_requests_updated_at
  BEFORE UPDATE ON identity_verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_identity_verification_requests_updated_at();