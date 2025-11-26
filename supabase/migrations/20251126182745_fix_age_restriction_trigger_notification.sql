/*
  # Fix age restriction trigger to include sender_id in notifications

  1. Changes
    - Update check_age_restriction_for_booking function to include sender_id
    - sender_id is set to the customer_id (user creating the notification for themselves)
  
  2. Details
    - This fixes the RLS policy violation when inserting notifications
    - The notification is a system notification but sender must be set for RLS
*/

CREATE OR REPLACE FUNCTION check_age_restriction_for_booking()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  user_age integer;
  is_age_verified boolean;
  verification_level text;
BEGIN
  -- 고객의 나이 및 인증 상태 확인
  SELECT 
    p.age,
    COALESCE(p.age_verified, false),
    COALESCE(p.verification_level, 'none')
  INTO 
    user_age,
    is_age_verified,
    verification_level
  FROM profiles p
  WHERE p.id = NEW.customer_id;
  
  -- 나이 정보가 없는 경우
  IF user_age IS NULL THEN
    RAISE EXCEPTION '나이 정보가 필요합니다. 프로필을 완성해주세요.';
  END IF;
  
  -- 18세 미만 제한
  IF user_age < 18 THEN
    RAISE EXCEPTION '만 18세 미만은 예약할 수 없습니다. (현재 나이: %세)', user_age;
  END IF;
  
  -- 나이 인증이 안된 경우 경고 알림 생성 (차단하지는 않음)
  IF NOT is_age_verified THEN
    INSERT INTO notifications (
      user_id,
      sender_id,
      type,
      title,
      body
    ) VALUES (
      NEW.customer_id,
      NEW.customer_id,  -- sender_id 추가 (시스템 알림이지만 RLS를 위해 필요)
      'system',
      '나이 인증 권장',
      '더 안전한 서비스 이용을 위해 LINE 연동을 통한 나이 인증을 권장합니다.'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;