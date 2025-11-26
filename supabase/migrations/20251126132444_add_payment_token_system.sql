/*
  # 결제 토큰 시스템 추가

  ## 변경 사항
  
  KG이니시스 결제를 위한 토큰 기반 시스템 추가
  
  ### kg_inicis_payments 테이블에 컬럼 추가
  
  1. **payment_token** (text, unique)
     - 결제 페이지 접근을 위한 고유 토큰
     - /pay/:token 형태의 URL에 사용
  
  2. **inicis_signature** (text)
     - 이니시스 결제 요청 시 필요한 signature
  
  3. **inicis_verification** (text)
     - 이니시스 결제 검증을 위한 verification 값
  
  4. **inicis_timestamp** (bigint)
     - 이니시스 결제 요청 타임스탬프
  
  5. **buyer_name** (text)
     - 구매자 이름
  
  6. **buyer_tel** (text)
     - 구매자 전화번호
  
  7. **buyer_email** (text)
     - 구매자 이메일
  
  8. **good_name** (text)
     - 상품명
  
  9. **inicis_tid** (text)
     - 이니시스 거래 ID (결제 완료 후)
  
  10. **inicis_auth_token** (text)
      - 이니시스 승인 토큰
  
  11. **inicis_result_code** (text)
      - 이니시스 결과 코드
  
  12. **inicis_result_msg** (text)
      - 이니시스 결과 메시지
*/

-- 컬럼 추가
DO $$
BEGIN
  -- payment_token
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kg_inicis_payments' AND column_name = 'payment_token'
  ) THEN
    ALTER TABLE kg_inicis_payments ADD COLUMN payment_token text UNIQUE;
  END IF;

  -- inicis_signature
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kg_inicis_payments' AND column_name = 'inicis_signature'
  ) THEN
    ALTER TABLE kg_inicis_payments ADD COLUMN inicis_signature text;
  END IF;

  -- inicis_verification
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kg_inicis_payments' AND column_name = 'inicis_verification'
  ) THEN
    ALTER TABLE kg_inicis_payments ADD COLUMN inicis_verification text;
  END IF;

  -- inicis_timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kg_inicis_payments' AND column_name = 'inicis_timestamp'
  ) THEN
    ALTER TABLE kg_inicis_payments ADD COLUMN inicis_timestamp bigint;
  END IF;

  -- buyer_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kg_inicis_payments' AND column_name = 'buyer_name'
  ) THEN
    ALTER TABLE kg_inicis_payments ADD COLUMN buyer_name text;
  END IF;

  -- buyer_tel
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kg_inicis_payments' AND column_name = 'buyer_tel'
  ) THEN
    ALTER TABLE kg_inicis_payments ADD COLUMN buyer_tel text;
  END IF;

  -- buyer_email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kg_inicis_payments' AND column_name = 'buyer_email'
  ) THEN
    ALTER TABLE kg_inicis_payments ADD COLUMN buyer_email text;
  END IF;

  -- good_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kg_inicis_payments' AND column_name = 'good_name'
  ) THEN
    ALTER TABLE kg_inicis_payments ADD COLUMN good_name text;
  END IF;

  -- inicis_tid
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kg_inicis_payments' AND column_name = 'inicis_tid'
  ) THEN
    ALTER TABLE kg_inicis_payments ADD COLUMN inicis_tid text;
  END IF;

  -- inicis_auth_token
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kg_inicis_payments' AND column_name = 'inicis_auth_token'
  ) THEN
    ALTER TABLE kg_inicis_payments ADD COLUMN inicis_auth_token text;
  END IF;

  -- inicis_result_code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kg_inicis_payments' AND column_name = 'inicis_result_code'
  ) THEN
    ALTER TABLE kg_inicis_payments ADD COLUMN inicis_result_code text;
  END IF;

  -- inicis_result_msg
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kg_inicis_payments' AND column_name = 'inicis_result_msg'
  ) THEN
    ALTER TABLE kg_inicis_payments ADD COLUMN inicis_result_msg text;
  END IF;
END $$;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_kg_inicis_payments_token ON kg_inicis_payments(payment_token);
CREATE INDEX IF NOT EXISTS idx_kg_inicis_payments_inicis_tid ON kg_inicis_payments(inicis_tid);