/*
  # Japan Payment System Tables

  ## 1. New Tables
    - `japan_payment_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `booking_id` (bigint, references bookings)
      - `mid` (text) - 상점아이디
      - `order_id` (text) - 주문번호
      - `amount` (numeric) - 결제금액
      - `good_name` (text) - 상품명
      - `buyer_name` (text) - 구매자명
      - `buyer_tel` (text) - 구매자 전화번호
      - `buyer_email` (text) - 구매자 이메일
      - `hash_data` (text) - 해시데이터
      - `timestamp` (bigint) - 타임스탬프
      - `status` (text) - 결제상태
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `japan_payment_results`
      - `id` (uuid, primary key)
      - `payment_request_id` (uuid, references japan_payment_requests)
      - `tid` (text) - 거래ID
      - `result_code` (text) - 결과코드
      - `error_code` (text) - 에러코드
      - `result_msg` (text) - 결과메시지
      - `sid` (text) - 세션ID
      - `paymethod` (text) - 결제수단
      - `appl_date` (text) - 승인일자
      - `appl_time` (text) - 승인시간
      - `appl_no` (text) - 승인번호
      - `pay_nm` (text) - 결제자명
      - `raw_response` (jsonb) - 원본 응답 데이터
      - `created_at` (timestamptz)

  ## 2. Security
    - Enable RLS on all tables
    - Users can view their own payment records
    - Admins can view all payment records
    - Anon users can insert payment results (for webhook)
*/

-- Create japan_payment_requests table
CREATE TABLE IF NOT EXISTS japan_payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id bigint REFERENCES bookings(id) ON DELETE SET NULL,
  mid text NOT NULL DEFAULT 'CBTTEST001',
  order_id text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  good_name text NOT NULL,
  buyer_name text NOT NULL,
  buyer_tel text NOT NULL,
  buyer_email text NOT NULL,
  hash_data text NOT NULL,
  timestamp bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create japan_payment_results table
CREATE TABLE IF NOT EXISTS japan_payment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id uuid REFERENCES japan_payment_requests(id) ON DELETE CASCADE,
  tid text,
  result_code text,
  error_code text,
  result_msg text,
  sid text,
  paymethod text,
  appl_date text,
  appl_time text,
  appl_no text,
  pay_nm text,
  raw_response jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE japan_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE japan_payment_results ENABLE ROW LEVEL SECURITY;

-- Policies for japan_payment_requests
CREATE POLICY "Users can view own payment requests"
  ON japan_payment_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment requests"
  ON japan_payment_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment requests"
  ON japan_payment_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment requests"
  ON japan_payment_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policies for japan_payment_results
CREATE POLICY "Users can view own payment results"
  ON japan_payment_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM japan_payment_requests
      WHERE japan_payment_requests.id = japan_payment_results.payment_request_id
      AND japan_payment_requests.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payment results"
  ON japan_payment_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Anon users can insert payment results (for notification webhook)
CREATE POLICY "Allow anon insert for payment results"
  ON japan_payment_results
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_japan_payment_requests_user_id ON japan_payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_japan_payment_requests_booking_id ON japan_payment_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_japan_payment_requests_order_id ON japan_payment_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_japan_payment_requests_status ON japan_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_japan_payment_results_payment_request_id ON japan_payment_results(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_japan_payment_results_tid ON japan_payment_results(tid);