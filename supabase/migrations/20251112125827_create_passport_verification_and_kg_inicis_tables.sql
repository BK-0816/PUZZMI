/*
  # 여권 인증 및 KG이니시스 결제 테이블 생성

  ## 새로운 테이블
  
  ### 1. `passport_verifications` - 여권 인증 정보
    - `id` (uuid, primary key) - 인증 고유 ID
    - `booking_id` (bigint, foreign key) - 예약 ID
    - `user_id` (uuid, foreign key) - 사용자 ID
    - `passport_image_url` (text) - 여권 이미지 URL (Supabase Storage)
    - `verification_status` (text) - 인증 상태: 'pending', 'verified', 'rejected'
    - `verified_by` (uuid) - 인증한 관리자 ID
    - `verified_at` (timestamptz) - 인증 완료 시간
    - `rejection_reason` (text) - 거부 사유
    - `passport_number` (text) - 여권 번호 (선택)
    - `full_name` (text) - 여권상 이름
    - `nationality` (text) - 국적
    - `birth_date` (date) - 생년월일
    - `expiry_date` (date) - 만료일
    - `created_at` (timestamptz) - 생성 시간
    - `updated_at` (timestamptz) - 업데이트 시간
  
  ### 2. `kg_inicis_payments` - KG이니시스 결제 정보
    - `id` (uuid, primary key) - 결제 고유 ID
    - `booking_id` (bigint, foreign key) - 예약 ID
    - `user_id` (uuid, foreign key) - 사용자 ID
    - `amount` (integer) - 결제 금액
    - `currency` (text) - 통화: 'KRW', 'JPY', 'USD'
    - `payment_status` (text) - 결제 상태: 'pending', 'sent', 'paid', 'failed', 'cancelled', 'refunded'
    - `tid` (text) - KG이니시스 거래 ID
    - `oid` (text) - 주문 번호 (고유)
    - `payment_method` (text) - 결제 방법: 'card', 'bank', 'vbank'
    - `payment_url` (text) - 결제 URL (LINE으로 전송)
    - `line_message_sent` (boolean) - LINE 메시지 전송 여부
    - `line_message_sent_at` (timestamptz) - LINE 메시지 전송 시간
    - `paid_at` (timestamptz) - 결제 완료 시간
    - `failed_reason` (text) - 실패 사유
    - `refund_reason` (text) - 환불 사유
    - `refunded_at` (timestamptz) - 환불 시간
    - `metadata` (jsonb) - 추가 메타데이터
    - `created_at` (timestamptz) - 생성 시간
    - `updated_at` (timestamptz) - 업데이트 시간

  ## 보안
  - 두 테이블 모두 RLS 활성화
  - 관리자만 모든 데이터 접근 가능
  - 사용자는 자신의 데이터만 조회 가능
*/

-- 여권 인증 테이블 생성
CREATE TABLE IF NOT EXISTS passport_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id bigint NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  passport_image_url text,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  rejection_reason text,
  passport_number text,
  full_name text,
  nationality text,
  birth_date date,
  expiry_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- KG이니시스 결제 테이블 생성
CREATE TABLE IF NOT EXISTS kg_inicis_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id bigint NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  currency text DEFAULT 'KRW' CHECK (currency IN ('KRW', 'JPY', 'USD')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'sent', 'paid', 'failed', 'cancelled', 'refunded')),
  tid text,
  oid text UNIQUE,
  payment_method text CHECK (payment_method IN ('card', 'bank', 'vbank')),
  payment_url text,
  line_message_sent boolean DEFAULT false,
  line_message_sent_at timestamptz,
  paid_at timestamptz,
  failed_reason text,
  refund_reason text,
  refunded_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_passport_verifications_booking_id ON passport_verifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_passport_verifications_user_id ON passport_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_passport_verifications_status ON passport_verifications(verification_status);

CREATE INDEX IF NOT EXISTS idx_kg_inicis_payments_booking_id ON kg_inicis_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_kg_inicis_payments_user_id ON kg_inicis_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_kg_inicis_payments_status ON kg_inicis_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_kg_inicis_payments_oid ON kg_inicis_payments(oid);

-- RLS 활성화
ALTER TABLE passport_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE kg_inicis_payments ENABLE ROW LEVEL SECURITY;

-- passport_verifications 정책
CREATE POLICY "관리자는 모든 여권 인증 조회 가능"
  ON passport_verifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "사용자는 자신의 여권 인증 조회 가능"
  ON passport_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 여권 인증 생성 가능"
  ON passport_verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 여권 인증 수정 가능"
  ON passport_verifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "관리자는 모든 여권 인증 수정 가능"
  ON passport_verifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- kg_inicis_payments 정책
CREATE POLICY "관리자는 모든 결제 정보 조회 가능"
  ON kg_inicis_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "사용자는 자신의 결제 정보 조회 가능"
  ON kg_inicis_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "관리자는 결제 정보 생성 가능"
  ON kg_inicis_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "관리자는 결제 정보 수정 가능"
  ON kg_inicis_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- 업데이트 시간 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS update_passport_verifications_updated_at ON passport_verifications;
CREATE TRIGGER update_passport_verifications_updated_at
  BEFORE UPDATE ON passport_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kg_inicis_payments_updated_at ON kg_inicis_payments;
CREATE TRIGGER update_kg_inicis_payments_updated_at
  BEFORE UPDATE ON kg_inicis_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();