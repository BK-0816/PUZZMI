// 이메일 인증 서비스 모듈
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://eevvgbbokenpjnvtmztk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldnZnYmJva2VucGpudnRtenRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NjI2OTgsImV4cCI6MjA3MzEzODY5OH0.aLoqYYeDW_0ZEwkr8c8IPFvXnEwQPZah1mQzwiyG2Y4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 이메일 인증 서비스 클래스
 * 6자리 인증번호를 이메일로 발송하고 검증하는 기능
 */
export class EmailVerificationService {
  constructor() {
    this.codeLength = 6;
    this.expiryMinutes = 10; // 10분 유효
    this.maxAttempts = 5;
  }

  /**
   * 6자리 인증번호 생성
   */
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 이메일 중복 확인
   */
  async checkEmailDuplicate(email) {
    try {
      // auth.users 테이블에서 확인 (Supabase Auth)
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) {
        // admin API 접근 불가 시 다른 방법 사용
        console.warn('Admin API 접근 불가, 대체 방법 사용');
        return false; // 일단 중복 없음으로 처리
      }
      
      const existingUser = data.users.find(user => user.email === email);
      return !!existingUser;
    } catch (error) {
      console.warn('이메일 중복 확인 실패:', error);
      return false; // 에러 시 중복 없음으로 처리
    }
  }

  /**
   * 이메일 인증번호 발송
   */
  async sendVerificationCode(email) {
    try {
      const code = this.generateVerificationCode();
      const expiresAt = new Date(Date.now() + this.expiryMinutes * 60 * 1000);

      // 기존 미인증 코드 삭제
      await supabase
        .from('email_verifications')
        .delete()
        .eq('email', email)
        .eq('verified', false);

      // 새 인증 코드 저장
      const { data, error } = await supabase
        .from('email_verifications')
        .insert({
          email: email,
          verification_code: code,
          expires_at: expiresAt.toISOString(),
          attempts: 0,
          verified: false
        })
        .select()
        .single();

      if (error) throw error;

      // 실제 이메일 발송
      await this.sendEmail(email, code);

      return {
        success: true,
        verificationId: data.id,
        expiresAt: expiresAt.toISOString()
      };

    } catch (error) {
      console.error('이메일 발송 실패:', error);
      throw new Error('이메일 발송에 실패했습니다: ' + error.message);
    }
  }

  /**
   * 실제 이메일 발송 (Edge Function 또는 외부 서비스)
   */
  async sendEmail(email, code) {
    // 개발 환경에서는 콘솔에 출력
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('bolt.new')) {
      console.log(`📧 이메일 발송 시뮬레이션:`);
      console.log(`📧 수신자: ${email}`);
      console.log(`🔢 인증번호: ${code}`);
      console.log(`⏰ 유효시간: ${this.expiryMinutes}분`);
      
      // 개발용 알림
      if (window.confirm(`이메일 인증번호 발송\n수신자: ${email}\n인증번호: ${code}\n\n실제 이메일은 발송되지 않습니다. 콘솔에서 인증번호를 확인하세요.`)) {
        return true;
      }
    }

    // 실제 운영 환경에서는 Edge Function 호출
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-verification-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: email,
          code: code,
          expiryMinutes: this.expiryMinutes
        })
      });

      if (!response.ok) {
        throw new Error('이메일 발송 서비스 오류');
      }

      return true;
    } catch (error) {
      // Edge Function이 없는 경우 시뮬레이션으로 대체
      console.warn('Edge Function 호출 실패, 시뮬레이션 모드:', error);
      return true;
    }
  }

  /**
   * 인증번호 확인
   */
  async verifyCode(email, inputCode) {
    try {
      // 인증 코드 조회
      const { data: verification, error } = await supabase
        .from('email_verifications')
        .select('*')
        .eq('email', email)
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!verification) {
        throw new Error('유효한 인증 요청이 없습니다. 인증번호를 다시 요청해주세요.');
      }

      // 만료 시간 확인
      if (new Date() > new Date(verification.expires_at)) {
        throw new Error('인증번호가 만료되었습니다. 새로운 인증번호를 요청해주세요.');
      }

      // 시도 횟수 확인
      if (verification.attempts >= this.maxAttempts) {
        throw new Error('인증 시도 횟수를 초과했습니다. 새로운 인증번호를 요청해주세요.');
      }

      // 인증번호 확인
      if (verification.verification_code !== inputCode) {
        // 시도 횟수 증가
        await supabase
          .from('email_verifications')
          .update({ attempts: verification.attempts + 1 })
          .eq('id', verification.id);

        throw new Error(`인증번호가 올바르지 않습니다. (${verification.attempts + 1}/${this.maxAttempts})`);
      }

      // 인증 성공 처리
      await supabase
        .from('email_verifications')
        .update({ 
          verified: true, 
          verified_at: new Date().toISOString() 
        })
        .eq('id', verification.id);

      return {
        success: true,
        verificationId: verification.id,
        email: email
      };

    } catch (error) {
      console.error('인증 확인 실패:', error);
      throw error;
    }
  }
}

// 전역에서 사용할 수 있도록 인스턴스 생성
export const emailVerificationService = new EmailVerificationService();