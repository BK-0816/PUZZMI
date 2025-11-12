/*
  # 유저 삭제 제약 조건 수정

  ## 변경 사항
  
  유저를 삭제할 수 있도록 외래 키 제약 조건을 수정합니다.
  
  ### 수정되는 제약 조건
  
  1. **bookings.customer_id**
     - NO ACTION → CASCADE
     - 고객이 삭제되면 예약도 함께 삭제
  
  2. **qna.answered_by**
     - NO ACTION → SET NULL
     - 답변한 관리자가 삭제되면 NULL로 설정
  
  3. **notifications.sender_id**
     - NO ACTION → SET NULL
     - 알림 발신자가 삭제되면 NULL로 설정
  
  4. **payment_requests.user_id**
     - NO ACTION → CASCADE
     - 고객이 삭제되면 결제 요청도 함께 삭제
  
  5. **passport_verifications.verified_by**
     - NO ACTION → SET NULL
     - 검증한 관리자가 삭제되면 NULL로 설정

  ## 참고
  - CASCADE: 부모 레코드 삭제 시 자식 레코드도 함께 삭제
  - SET NULL: 부모 레코드 삭제 시 외래 키를 NULL로 설정
*/

-- 1. bookings.customer_id: NO ACTION → CASCADE
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_customer_id_fkey,
  ADD CONSTRAINT bookings_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 2. qna.answered_by: NO ACTION → SET NULL
ALTER TABLE qna
  DROP CONSTRAINT IF EXISTS qna_answered_by_fkey,
  ADD CONSTRAINT qna_answered_by_fkey
    FOREIGN KEY (answered_by)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- 3. notifications.sender_id: NO ACTION → SET NULL
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_sender_id_fkey,
  ADD CONSTRAINT notifications_sender_id_fkey
    FOREIGN KEY (sender_id)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- 4. payment_requests.user_id: NO ACTION → CASCADE
ALTER TABLE payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_user_id_fkey,
  ADD CONSTRAINT payment_requests_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 5. passport_verifications.verified_by: NO ACTION → SET NULL
ALTER TABLE passport_verifications
  DROP CONSTRAINT IF EXISTS passport_verifications_verified_by_fkey,
  ADD CONSTRAINT passport_verifications_verified_by_fkey
    FOREIGN KEY (verified_by)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;