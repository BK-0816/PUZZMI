/*
  # Complete Database Schema Migration - Bolt to Supabase
  
  ## Overview
  모든 테이블과 기능을 Bolt에서 Supabase로 완전히 이관합니다.
  
  ## 새로운 테이블들
  
  ### 1. Core Tables
  - `mate_profiles` - 메이트 프로필 정보
  - `bookings` - 예약 정보
  - `reviews` - 리뷰 정보
  - `qna` - Q&A 게시판
  - `admin_users` - 관리자 계정
  - `notifications` - 알림
  
  ### 2. LINE Integration Tables (이미 존재하는 경우 스킵)
  - `user_line_accounts` - LINE 계정 연동
  - `line_identity_verifications` - LINE 신원 확인
  - `payment_requests` - 결제 요청
  - `user_verifications` - 사용자 인증 상태
  
  ## 보안
  - 모든 테이블에 RLS 활성화
  - 적절한 정책 설정 (본인만 읽기/수정, 관리자 전체 접근)
  
  ## 인덱스
  - 성능 최적화를 위한 인덱스 추가
*/

-- ============================================
-- 1. MATE PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS mate_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  bio text,
  age integer,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  languages text[],
  interests text[],
  hourly_rate integer CHECK (hourly_rate >= 0),
  availability_status text DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'offline')),
  profile_image_url text,
  rating numeric(3, 2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_reviews integer DEFAULT 0,
  total_bookings integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  verification_level text DEFAULT 'none',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. BOOKINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS bookings (
  id bigserial PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mate_id uuid NOT NULL,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  duration_hours integer NOT NULL CHECK (duration_hours > 0),
  total_amount integer NOT NULL CHECK (total_amount >= 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'rejected')),
  meeting_location text,
  special_requests text,
  cancellation_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_mate_id FOREIGN KEY (mate_id) REFERENCES mate_profiles(user_id) ON DELETE CASCADE
);

-- ============================================
-- 3. REVIEWS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS reviews (
  id bigserial PRIMARY KEY,
  booking_id bigint NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mate_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(booking_id),
  CONSTRAINT fk_reviews_mate_id FOREIGN KEY (mate_id) REFERENCES mate_profiles(user_id) ON DELETE CASCADE
);

-- ============================================
-- 4. QNA TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS qna (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('general', 'booking', 'payment', 'account', 'mate', 'technical', 'other')),
  title text NOT NULL,
  content text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'closed')),
  admin_reply text,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  replied_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 5. ADMIN USERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'moderator')),
  permissions jsonb DEFAULT '{"all": true}'::jsonb,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 6. NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('booking', 'review', 'payment', 'system', 'admin', 'message')),
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 7. LINE INTEGRATION TABLES (IF NOT EXISTS)
-- ============================================

CREATE TABLE IF NOT EXISTS user_line_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  line_user_id text NOT NULL UNIQUE,
  line_display_name text,
  line_picture_url text,
  is_verified boolean DEFAULT false,
  connected_at timestamptz DEFAULT now(),
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id bigint NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  mate_id uuid NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  currency text DEFAULT 'JPY' CHECK (currency IN ('JPY', 'KRW', 'USD')),
  payment_method text DEFAULT 'line_pay' CHECK (payment_method IN ('line_pay', 'credit_card', 'bank_transfer')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'failed', 'expired', 'cancelled')),
  line_payment_url text,
  payment_deadline timestamptz,
  sent_at timestamptz,
  paid_at timestamptz,
  failed_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT fk_payment_mate_id FOREIGN KEY (mate_id) REFERENCES mate_profiles(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN ('email', 'phone', 'line', 'identity')),
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  verification_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, verification_type)
);

CREATE TABLE IF NOT EXISTS line_identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  line_user_id text NOT NULL,
  verified_name text,
  verified_age integer,
  verified_birth_date date,
  verification_level text DEFAULT 'basic',
  verified_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '1 year'),
  verification_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- LINE identity verifications foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'line_identity_verifications_user_id_fkey'
  ) THEN
    ALTER TABLE line_identity_verifications 
    ADD CONSTRAINT line_identity_verifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'line_identity_verifications_user_id_key'
  ) THEN
    ALTER TABLE line_identity_verifications 
    ADD CONSTRAINT line_identity_verifications_user_id_key 
    UNIQUE (user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'line_identity_verifications_line_user_id_key'
  ) THEN
    ALTER TABLE line_identity_verifications 
    ADD CONSTRAINT line_identity_verifications_line_user_id_key 
    UNIQUE (line_user_id);
  END IF;
END $$;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE mate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE qna ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_line_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_identity_verifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - MATE PROFILES
-- ============================================

CREATE POLICY "Anyone can view mate profiles"
  ON mate_profiles FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Mates can update own profile"
  ON mate_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can create mate profile"
  ON mate_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Mates can delete own profile"
  ON mate_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - BOOKINGS
-- ============================================

CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = mate_id);

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = mate_id)
  WITH CHECK (auth.uid() = customer_id OR auth.uid() = mate_id);

CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update all bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ============================================
-- RLS POLICIES - REVIEWS
-- ============================================

CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can create reviews for own bookings"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE id = booking_id 
      AND customer_id = auth.uid()
      AND status = 'completed'
    )
  );

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

-- ============================================
-- RLS POLICIES - QNA
-- ============================================

CREATE POLICY "Users can view own questions"
  ON qna FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create questions"
  ON qna FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own questions"
  ON qna FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all qna"
  ON qna FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ============================================
-- RLS POLICIES - ADMIN USERS
-- ============================================

CREATE POLICY "Admins can view all admins"
  ON admin_users FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Super admins can manage admins"
  ON admin_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- ============================================
-- RLS POLICIES - NOTIFICATIONS
-- ============================================

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- RLS POLICIES - LINE ACCOUNTS
-- ============================================

CREATE POLICY "Users can view own LINE account"
  ON user_line_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own LINE account"
  ON user_line_accounts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can insert LINE accounts"
  ON user_line_accounts FOR INSERT
  TO public
  WITH CHECK (true);

-- ============================================
-- RLS POLICIES - PAYMENT REQUESTS
-- ============================================

CREATE POLICY "Users can view own payment requests"
  ON payment_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Mates can view their payment requests"
  ON payment_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = mate_id);

-- ============================================
-- RLS POLICIES - USER VERIFICATIONS
-- ============================================

CREATE POLICY "Users can view own verifications"
  ON user_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own verifications"
  ON user_verifications FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - LINE IDENTITY VERIFICATIONS
-- ============================================

CREATE POLICY "Users can view own LINE identity"
  ON line_identity_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all LINE identities"
  ON line_identity_verifications FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage LINE identities"
  ON line_identity_verifications FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_mate_profiles_user_id ON mate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_mate_profiles_availability ON mate_profiles(availability_status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_mate_id ON bookings(mate_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_mate_id ON reviews(mate_id);
CREATE INDEX IF NOT EXISTS idx_qna_user_id ON qna(user_id);
CREATE INDEX IF NOT EXISTS idx_qna_status ON qna(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_payment_requests_booking_id ON payment_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_user_line_accounts_user_id ON user_line_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON user_verifications(user_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_mate_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_mate_profiles_updated_at
      BEFORE UPDATE ON mate_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_bookings_updated_at'
  ) THEN
    CREATE TRIGGER update_bookings_updated_at
      BEFORE UPDATE ON bookings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_reviews_updated_at'
  ) THEN
    CREATE TRIGGER update_reviews_updated_at
      BEFORE UPDATE ON reviews
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_qna_updated_at'
  ) THEN
    CREATE TRIGGER update_qna_updated_at
      BEFORE UPDATE ON qna
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================
-- UPDATE MATE RATING FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_mate_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mate_profiles SET
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM reviews
      WHERE mate_id = NEW.mate_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE mate_id = NEW.mate_id
    ),
    updated_at = now()
  WHERE user_id = NEW.mate_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_mate_rating'
  ) THEN
    CREATE TRIGGER trigger_update_mate_rating
      AFTER INSERT OR UPDATE ON reviews
      FOR EACH ROW
      EXECUTE FUNCTION update_mate_rating();
  END IF;
END $$;