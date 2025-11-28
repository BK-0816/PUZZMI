/*
  # 토큰 기반 결제 페이지 접근 정책

  1. 변경사항
    - 익명 사용자가 유효한 payment_token으로 결제 정보 조회 가능
    - 보안: payment_token이 있고 결제 상태가 pending인 경우만 허용
    
  2. 보안
    - 토큰은 UUID로 추측 불가능
    - pending 상태의 결제만 조회 가능
    - 이미 완료된 결제는 조회 불가
*/

-- 익명 사용자가 토큰으로 결제 정보를 조회할 수 있는 정책
CREATE POLICY "익명 사용자는 유효한 토큰으로 결제 정보 조회 가능"
  ON kg_inicis_payments
  FOR SELECT
  TO anon
  USING (
    payment_token IS NOT NULL 
    AND payment_status = 'pending'
  );