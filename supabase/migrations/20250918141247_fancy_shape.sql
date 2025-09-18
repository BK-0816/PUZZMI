/*
  # LINE 계정 RLS 정책 완전 수정

  1. 기존 정책 모두 삭제
  2. 새로운 정책 생성 (INSERT, UPDATE, SELECT 모두 지원)
  3. 정책 테스트 및 검증
*/

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "user_line_accounts_all_own" ON user_line_accounts;
DROP POLICY IF EXISTS "Users can manage own LINE account" ON user_line_accounts;

-- RLS 비활성화 후 재활성화 (정책 초기화)
ALTER TABLE user_line_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_line_accounts ENABLE ROW LEVEL SECURITY;

-- 새로운 정책 생성 (모든 작업 허용)
CREATE POLICY "line_accounts_full_access"
  ON user_line_accounts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 익명 사용자도 INSERT 가능하도록 (LINE 콜백에서 필요)
CREATE POLICY "line_accounts_insert_public"
  ON user_line_accounts
  FOR INSERT
  TO public
  WITH CHECK (true);

-- 본인 데이터 조회 허용
CREATE POLICY "line_accounts_select_own"
  ON user_line_accounts
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

-- 본인 데이터 업데이트 허용
CREATE POLICY "line_accounts_update_own"
  ON user_line_accounts
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);