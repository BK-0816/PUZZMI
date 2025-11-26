/*
  # 신원인증 요청 외래키 수정

  1. 변경사항
    - identity_verification_requests 테이블의 user_id 외래키를 profiles 테이블로 변경
    - 이를 통해 Supabase의 자동 관계 감지가 작동하도록 수정

  2. 참고사항
    - profiles 테이블의 id는 이미 auth.users(id)를 참조하므로
    - identity_verification_requests가 profiles를 참조하면 간접적으로 auth.users와 연결됨
*/

-- 기존 외래키 제약조건 삭제
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'identity_verification_requests_user_id_fkey'
    AND table_name = 'identity_verification_requests'
  ) THEN
    ALTER TABLE identity_verification_requests
    DROP CONSTRAINT identity_verification_requests_user_id_fkey;
  END IF;
END $$;

-- profiles 테이블을 참조하는 새로운 외래키 추가
ALTER TABLE identity_verification_requests
ADD CONSTRAINT identity_verification_requests_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- approved_by도 profiles를 참조하도록 수정
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'identity_verification_requests_approved_by_fkey'
    AND table_name = 'identity_verification_requests'
  ) THEN
    ALTER TABLE identity_verification_requests
    DROP CONSTRAINT identity_verification_requests_approved_by_fkey;
  END IF;
END $$;

ALTER TABLE identity_verification_requests
ADD CONSTRAINT identity_verification_requests_approved_by_fkey
FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL;
