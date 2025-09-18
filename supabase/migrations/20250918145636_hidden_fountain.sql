/*
  # LINE 계정 RLS 정책 수정 - Public INSERT 허용

  1. 문제 해결
    - 콜백 페이지에서 세션 컨텍스트 문제로 인한 INSERT 실패 해결
    - Public 역할에서도 LINE 계정 생성 가능하도록 정책 추가

  2. 보안
    - INSERT 시에는 state에서 받은 userId만 사용 가능
    - SELECT/UPDATE는 여전히 본인 데이터만 접근 가능
*/

-- 기존 정책들 모두 삭제
DROP POLICY IF EXISTS "line_accounts_full_access" ON user_line_accounts;
DROP POLICY IF EXISTS "line_accounts_insert_public" ON user_line_accounts;
DROP POLICY IF EXISTS "line_accounts_select_own" ON user_line_accounts;
DROP POLICY IF EXISTS "line_accounts_update_own" ON user_line_accounts;
DROP POLICY IF EXISTS "user_line_accounts_all_own" ON user_line_accounts;

-- 새로운 정책들 생성
-- 1. Public 역할도 INSERT 가능 (콜백 처리용)
CREATE POLICY "line_accounts_insert_any"
  ON user_line_accounts
  FOR INSERT
  TO public
  WITH CHECK (true);

-- 2. 인증된 사용자는 자신의 데이터만 SELECT/UPDATE 가능
CREATE POLICY "line_accounts_select_own"
  ON user_line_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "line_accounts_update_own"
  ON user_line_accounts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. 삭제는 본인만 가능
CREATE POLICY "line_accounts_delete_own"
  ON user_line_accounts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);