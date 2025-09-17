// SMS 인증 서비스 모듈
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://eevvgbbokenpjnvtmztk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldnZnYmJva2VucGpudnRtenRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NjI2OTgsImV4cCI6MjA3MzEzODY5OH0.aLoqYYeDW_0ZEwkr8c8IPFvXnEwQPZah1mQzwiyG2Y4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * SMS 인증 서비스 클래스
 * 실제 운영에서는 외부 SMS 서비스 (알리고, 쿨SMS, AWS SNS 등) 연동 필요
 */
export class SMSVerificationService {
  constructor() {
    this.codeLength = 6;
    this.expiryMinutes = 5;
    this.maxAttempts = 3;
  }

  /**
   * 전화번호 포맷 정규화
   */
  normalizePhoneNumber(phone) {
    // 한국 전화번호 정규화 (010-1234-5678 → +821012345678)
    const cleaned = phone.replace(/[^0-9]/g, '');
    
    if (cleaned.startsWith('010')) {
      return '+82' + cleaned.substring(1);
    } else if (cleaned.startsWith('82')) {
      return '+' + cleaned;
    } else if (cleaned.startsWith('+82')) {
      return cleaned;
    }
    
    // 일본 전화번호 처리
    if (cleaned.startsWith('090') || cleaned.startsWith('080') || cleaned.startsWith('070')) {
      return '+81' + cleaned.substring(1);
    }
    
    return phone; // 기타 국가는 그대로
  }

  /**
   * 인증번호 생성
   */
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * SMS 인증번호 발송
   */
  async sendVerificationCode(phoneNumber, userId = null) {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      const code = this.generateVerificationCode();
      const expiresAt = new Date(Date.now() + this.expiryMinutes * 60 * 1000);

      // 기존 미인증 코드 삭제
      await supabase
        .from('phone_verifications')
        .delete()
        .eq('phone_number', normalizedPhone)
        .eq('verified', false);

      // 새 인증 코드 저장
      const { data, error } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: normalizedPhone,
          verification_code: code,
          expires_at: expiresAt.toISOString(),
          user_id: userId,
          attempts: 0
        })
        .select()
        .single();

      if (error) throw error;

      // 실제 SMS 발송 (여기서는 시뮬레이션)
      await this.sendSMS(normalizedPhone, code);

      return {
        success: true,
        verificationId: data.id,
        expiresAt: expiresAt.toISOString()
      };

    } catch (error) {
      console.error('SMS 발송 실패:', error);
      throw new Error('SMS 발송에 실패했습니다: ' + error.message);
    }
  }

  /**
   * 실제 SMS 발송 (외부 서비스 연동)
   */
  async sendSMS(phoneNumber, code) {
    // 개발 환경에서는 콘솔에 출력
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('bolt.new')) {
      console.log(`📱 SMS 발송 시뮬레이션:`);
      console.log(`📞 전화번호: ${phoneNumber}`);
      console.log(`🔢 인증번호: ${code}`);
      console.log(`⏰ 유효시간: ${this.expiryMinutes}분`);
      
      // 개발용 알림
      if (window.confirm(`SMS 시뮬레이션\n전화번호: ${phoneNumber}\n인증번호: ${code}\n\n실제 SMS는 발송되지 않습니다. 확인을 누르면 콘솔에서 인증번호를 확인할 수 있습니다.`)) {
        return true;
      }
    }

    // 실제 운영 환경에서는 아래 코드 사용
    /*
    // 알리고 SMS 서비스 예시
    const response = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        key: 'YOUR_ALIGO_API_KEY',
        userid: 'YOUR_ALIGO_USER_ID',
        sender: 'YOUR_SENDER_NUMBER',
        receiver: phoneNumber,
        msg: `[PUZZMI] 인증번호: ${code} (${this.expiryMinutes}분 내 입력)`,
        msg_type: 'SMS'
      })
    });

    if (!response.ok) {
      throw new Error('SMS 발송 실패');
    }

    const result = await response.json();
    if (result.result_code !== '1') {
      throw new Error('SMS 발송 실패: ' + result.message);
    }
    */

    return true;
  }

  /**
   * 인증번호 확인
   */
  async verifyCode(phoneNumber, inputCode, userId = null) {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // 인증 코드 조회
      const { data: verification, error } = await supabase
        .from('phone_verifications')
        .select('*')
        .eq('phone_number', normalizedPhone)
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
          .from('phone_verifications')
          .update({ attempts: verification.attempts + 1 })
          .eq('id', verification.id);

        throw new Error(`인증번호가 올바르지 않습니다. (${verification.attempts + 1}/${this.maxAttempts})`);
      }

      // 인증 성공 처리
      await supabase
        .from('phone_verifications')
        .update({ 
          verified: true, 
          verified_at: new Date().toISOString() 
        })
        .eq('id', verification.id);

      return {
        success: true,
        verificationId: verification.id,
        phoneNumber: normalizedPhone
      };

    } catch (error) {
      console.error('인증 확인 실패:', error);
      throw error;
    }
  }

  /**
   * 전화번호 중복 확인
   */
  async checkPhoneDuplicate(phoneNumber) {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    if (error) throw error;
    
    return !!data; // true면 중복, false면 사용 가능
  }
}

// 전역에서 사용할 수 있도록 인스턴스 생성
export const smsService = new SMSVerificationService();