/*
  # PortOne 결제 시스템 구축

  1. 새로운 테이블
    - `portone_payments`
      - `id` (uuid, primary key) - 결제 고유 ID
      - `booking_id` (bigint) - 예약 ID (bookings 테이블 참조)
      - `user_id` (uuid) - 사용자 ID
      - `imp_uid` (text) - 포트원 거래 고유번호
      - `merchant_uid` (text) - 가맹점 주문번호
      - `amount` (numeric) - 결제 금액
      - `currency` (text) - 통화 (JPY, KRW 등)
      - `status` (text) - 결제 상태 (ready, paid, failed, cancelled, refunded)
      - `pg_provider` (text) - PG사 (inicis_v2, tosspayments 등)
      - `pay_method` (text) - 결제 수단 (card, vbank, cvs, paypay, linepay 등)
      - `apply_num` (text) - 카드 승인번호
      - `pg_tid` (text) - PG사 거래번호
      - `receipt_url` (text) - 영수증 URL
      - `fail_reason` (text) - 실패 사유
      - `cancelled_at` (timestamptz) - 취소 시각
      - `failed_at` (timestamptz) - 실패 시각
      - `paid_at` (timestamptz) - 결제 완료 시각
      - `refund_amount` (numeric) - 환불 금액
      - `refund_reason` (text) - 환불 사유
      - `refunded_at` (timestamptz) - 환불 시각
      - `webhook_verified` (boolean) - 웹훅 검증 완료 여부
      - `created_at` (timestamptz) - 생성 시각
      - `updated_at` (timestamptz) - 수정 시각

  2. 보안
    - RLS 활성화
    - 사용자는 자신의 결제 정보만 조회 가능
    - 관리자는 모든 결제 정보 조회 가능
    - 삽입은 인증된 사용자만 가능

  3. 인덱스
    - imp_uid (포트원 거래 조회용)
    - merchant_uid (주문번호 조회용)
    - booking_id (예약별 결제 조회용)
    - user_id (사용자별 결제 조회용)
*/

-- portone_payments 테이블 생성
CREATE TABLE IF NOT EXISTS portone_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id bigint REFERENCES bookings(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  imp_uid text UNIQUE NOT NULL,
  merchant_uid text UNIQUE NOT NULL,
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'JPY',
  status text NOT NULL DEFAULT 'ready',
  pg_provider text NOT NULL DEFAULT 'inicis_v2',
  pay_method text NOT NULL DEFAULT 'card',
  apply_num text,
  pg_tid text,
  receipt_url text,
  fail_reason text,
  cancelled_at timestamptz,
  failed_at timestamptz,
  paid_at timestamptz,
  refund_amount numeric(12, 2) DEFAULT 0,
  refund_reason text,
  refunded_at timestamptz,
  webhook_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_status CHECK (status IN ('ready', 'paid', 'failed', 'cancelled', 'refunded')),
  CONSTRAINT valid_currency CHECK (currency IN ('KRW', 'JPY', 'USD')),
  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT valid_refund CHECK (refund_amount >= 0 AND refund_amount <= amount)
);

-- RLS 활성화
ALTER TABLE portone_payments ENABLE ROW LEVEL SECURITY;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_portone_payments_imp_uid ON portone_payments(imp_uid);
CREATE INDEX IF NOT EXISTS idx_portone_payments_merchant_uid ON portone_payments(merchant_uid);
CREATE INDEX IF NOT EXISTS idx_portone_payments_booking_id ON portone_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_portone_payments_user_id ON portone_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_portone_payments_status ON portone_payments(status);
CREATE INDEX IF NOT EXISTS idx_portone_payments_created_at ON portone_payments(created_at DESC);

-- RLS 정책: 사용자는 자신의 결제 정보만 조회
CREATE POLICY "Users can view own payments"
  ON portone_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS 정책: 관리자는 모든 결제 정보 조회
CREATE POLICY "Admins can view all payments"
  ON portone_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- RLS 정책: 인증된 사용자는 자신의 결제 정보 삽입 가능
CREATE POLICY "Users can insert own payments"
  ON portone_payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 시스템(서비스롤)은 모든 결제 정보 업데이트 가능 (웹훅용)
CREATE POLICY "System can update payments"
  ON portone_payments FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_portone_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_portone_payments_updated_at
  BEFORE UPDATE ON portone_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_portone_payments_updated_at();
