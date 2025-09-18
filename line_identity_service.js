// LINE 신원확인 서비스 모듈
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://eevvgbbokenpjnvtmztk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldnZnYmJva2VucGpudnRtenRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NjI2OTgsImV4cCI6MjA3MzEzODY5OH0.aLoqYYeDW_0ZEwkr8c8IPFvXnEwQPZah1mQzwiyG2Y4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * LINE 신원확인 서비스 클래스
 * LINE에서 제공하는 사용자 정보를 활용한 실명인증 및 나이 검증
 */
export class LineIdentityService {
  constructor() {
    this.lineChannelId = process.env.LINE_CHANNEL_ID || 'YOUR_LINE_CHANNEL_ID';
    this.lineChannelSecret = process.env.LINE_CHANNEL_SECRET || 'YOUR_LINE_CHANNEL_SECRET';
    this.verificationValidityDays = 365; // 인증 유효기간 (1년)
  }

  /**
   * LINE 사용자 프로필에서 신원 정보 추출 및 검증
   */
  async processLineIdentityVerification(userId, lineUserProfile, accessToken) {
    try {
      // 1. LINE에서 받은 기본 정보
      const lineUserInfo = {
        line_user_id: lineUserProfile.userId,
        line_display_name: lineUserProfile.displayName,
        line_picture_url: lineUserProfile.pictureUrl
      };

      // 2. LINE에서 추가 신원 정보 요청 (실제 환경에서는 LINE의 Identity API 사용)
      const identityInfo = await this.getLineIdentityInfo(accessToken);
      
      // 3. 기존 프로필 정보와 비교 검증
      const verificationResult = await this.verifyIdentityWithProfile(userId, identityInfo);
      
      // 4. 검증 결과에 따른 인증 레벨 결정
      const verificationLevel = this.determineVerificationLevel(verificationResult);
      
      // 5. 데이터베이스에 인증 정보 저장
      await this.saveVerificationResult(userId, lineUserInfo, identityInfo, verificationResult, verificationLevel);
      
      return {
        success: true,
        verificationLevel,
        verificationResult,
        message: this.getVerificationMessage(verificationLevel, verificationResult)
      };
      
    } catch (error) {
      console.error('LINE 신원확인 처리 실패:', error);
      throw error;
    }
  }

  /**
   * LINE Identity API를 통한 상세 신원 정보 조회
   * (실제 환경에서는 LINE의 공식 Identity API 사용)
   */
  async getLineIdentityInfo(accessToken) {
    try {
      // 실제 환경에서는 아래와 같이 LINE API 호출
      /*
      const response = await fetch('https://api.line.me/v2/profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('LINE 프로필 조회 실패');
      }
      
      const profile = await response.json();
      
      // LINE에서 제공하는 추가 신원 정보 (가상의 API)
      const identityResponse = await fetch('https://api.line.me/v2/identity', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      const identityData = await identityResponse.json();
      */
      
      // 개발 환경에서는 시뮬레이션 데이터 반환
      const mockIdentityInfo = {
        verified_name: '김지은', // LINE에서 인증된 실명
        verified_birth_date: '1998-03-15', // LINE에서 인증된 생년월일
        verified_age: this.calculateAge('1998-03-15'),
        verification_method: 'line_identity_verification',
        verification_timestamp: new Date().toISOString(),
        confidence_score: 0.95, // 신뢰도 점수
        additional_data: {
          phone_verified: true,
          email_verified: true,
          identity_document_verified: true
        }
      };
      
      return mockIdentityInfo;
      
    } catch (error) {
      console.error('LINE 신원 정보 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 기존 프로필 정보와 LINE 인증 정보 비교 검증
   */
  async verifyIdentityWithProfile(userId, lineIdentityInfo) {
    try {
      // 기존 프로필 정보 조회
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, age, birth_date, phone_number')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      const verificationResult = {
        name_match: false,
        age_match: false,
        birth_date_match: false,
        age_difference: null,
        discrepancies: []
      };
      
      // 이름 비교 (유사도 검사)
      if (profile.full_name && lineIdentityInfo.verified_name) {
        verificationResult.name_match = this.compareNames(profile.full_name, lineIdentityInfo.verified_name);
        if (!verificationResult.name_match) {
          verificationResult.discrepancies.push(`이름 불일치: 프로필(${profile.full_name}) vs LINE(${lineIdentityInfo.verified_name})`);
        }
      }
      
      // 나이 비교 (±1세 허용)
      if (profile.age && lineIdentityInfo.verified_age) {
        verificationResult.age_difference = Math.abs(profile.age - lineIdentityInfo.verified_age);
        verificationResult.age_match = verificationResult.age_difference <= 1;
        if (!verificationResult.age_match) {
          verificationResult.discrepancies.push(`나이 불일치: 프로필(${profile.age}세) vs LINE(${lineIdentityInfo.verified_age}세)`);
        }
      }
      
      // 생년월일 비교
      if (profile.birth_date && lineIdentityInfo.verified_birth_date) {
        verificationResult.birth_date_match = profile.birth_date === lineIdentityInfo.verified_birth_date;
        if (!verificationResult.birth_date_match) {
          verificationResult.discrepancies.push(`생년월일 불일치: 프로필(${profile.birth_date}) vs LINE(${lineIdentityInfo.verified_birth_date})`);
        }
      }
      
      return verificationResult;
      
    } catch (error) {
      console.error('프로필 비교 검증 실패:', error);
      throw error;
    }
  }

  /**
   * 검증 결과에 따른 인증 레벨 결정
   */
  determineVerificationLevel(verificationResult) {
    const { name_match, age_match, birth_date_match, discrepancies } = verificationResult;
    
    if (name_match && age_match && birth_date_match) {
      return 'premium'; // 모든 정보 일치
    } else if ((name_match && age_match) || (name_match && birth_date_match)) {
      return 'enhanced'; // 이름 + (나이 또는 생년월일) 일치
    } else if (name_match || age_match) {
      return 'basic'; // 이름 또는 나이만 일치
    } else {
      return 'unverified'; // 불일치가 많음
    }
  }

  /**
   * 검증 결과 데이터베이스 저장
   */
  async saveVerificationResult(userId, lineUserInfo, identityInfo, verificationResult, verificationLevel) {
    try {
      // LINE 신원확인 정보 저장
      const { error: lineVerificationError } = await supabase
        .from('line_identity_verifications')
        .upsert({
          user_id: userId,
          line_user_id: lineUserInfo.line_user_id,
          verified_name: identityInfo.verified_name,
          verified_age: identityInfo.verified_age,
          verified_birth_date: identityInfo.verified_birth_date,
          verification_level: verificationLevel,
          expires_at: new Date(Date.now() + this.verificationValidityDays * 24 * 60 * 60 * 1000).toISOString(),
          verification_data: {
            ...verificationResult,
            confidence_score: identityInfo.confidence_score,
            verification_method: identityInfo.verification_method,
            line_display_name: lineUserInfo.line_display_name
          }
        }, { onConflict: 'user_id' });
      
      if (lineVerificationError) throw lineVerificationError;
      
      // 프로필 인증 상태 업데이트
      const isVerified = verificationLevel !== 'unverified';
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          identity_verified: isVerified,
          age_verified: verificationResult.age_match || false,
          verification_source: 'line',
          verification_level: verificationLevel,
          // LINE에서 인증된 정보로 프로필 업데이트 (일치하는 경우)
          ...(verificationResult.name_match && { full_name: identityInfo.verified_name }),
          ...(verificationResult.age_match && { age: identityInfo.verified_age }),
          ...(verificationResult.birth_date_match && { birth_date: identityInfo.verified_birth_date }),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (profileError) throw profileError;
      
      // 인증 완료 알림 생성
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'system',
          title: '신원확인 완료',
          body: `LINE 연동을 통한 신원확인이 완료되었습니다.\n인증 레벨: ${verificationLevel}\n${verificationResult.discrepancies.length > 0 ? '\n⚠️ 일부 정보 불일치가 발견되었습니다.' : ''}`,
          link: 'my_profile.html'
        });
      
    } catch (error) {
      console.error('검증 결과 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 이름 유사도 비교 (한글 이름 처리)
   */
  compareNames(profileName, lineName) {
    if (!profileName || !lineName) return false;
    
    // 공백 제거 후 비교
    const cleanProfile = profileName.replace(/\s+/g, '');
    const cleanLine = lineName.replace(/\s+/g, '');
    
    // 정확히 일치
    if (cleanProfile === cleanLine) return true;
    
    // 성씨 + 이름 순서 바뀜 체크 (예: "김지은" vs "지은김")
    if (cleanProfile.length === cleanLine.length && cleanProfile.length >= 3) {
      const reversed = cleanLine.split('').reverse().join('');
      if (cleanProfile === reversed) return true;
    }
    
    // 레벤슈타인 거리 계산 (편집 거리 1 이하면 유사)
    const distance = this.levenshteinDistance(cleanProfile, cleanLine);
    return distance <= 1;
  }

  /**
   * 레벤슈타인 거리 계산
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * 생년월일에서 나이 계산
   */
  calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * 인증 레벨별 메시지 생성
   */
  getVerificationMessage(level, result) {
    switch (level) {
      case 'premium':
        return '🎉 완벽한 신원확인이 완료되었습니다! 모든 서비스를 안전하게 이용하실 수 있습니다.';
      case 'enhanced':
        return '✅ 신원확인이 완료되었습니다. 대부분의 서비스를 이용하실 수 있습니다.';
      case 'basic':
        return '⚠️ 기본 신원확인이 완료되었습니다. 일부 정보 불일치가 있어 제한된 서비스만 이용 가능합니다.';
      case 'unverified':
        return '❌ 신원확인에 실패했습니다. 프로필 정보를 확인하고 다시 시도해주세요.';
      default:
        return '신원확인 처리가 완료되었습니다.';
    }
  }

  /**
   * 사용자의 예약 가능 여부 확인
   */
  async checkBookingEligibility(userId) {
    try {
      const { data, error } = await supabase
        .rpc('get_user_verification_status', { p_user_id: userId });
      
      if (error) throw error;
      
      const restrictions = data.restrictions;
      const recommendations = data.recommendations;
      
      return {
        canBook: restrictions.can_book,
        requiresGuardian: restrictions.requires_guardian,
        verificationRequired: restrictions.verification_required,
        ageVerificationRequired: restrictions.age_verification_required,
        recommendations: recommendations,
        verificationLevel: data.profile.verification_level
      };
      
    } catch (error) {
      console.error('예약 자격 확인 실패:', error);
      throw error;
    }
  }

  /**
   * 관리자용: 사용자 인증 상태 강제 업데이트
   */
  async adminUpdateVerificationStatus(userId, updates) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      // 관리자 액션 로그 기록
      await supabase
        .from('admin_logs')
        .insert({
          admin_user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'update_verification_status',
          target_user_id: userId,
          details: updates,
          timestamp: new Date().toISOString()
        });
      
      return true;
      
    } catch (error) {
      console.error('관리자 인증 상태 업데이트 실패:', error);
      throw error;
    }
  }

  /**
   * 미성년자 예약 시 보호자 동의 확인
   */
  async checkGuardianConsent(userId, bookingData) {
    try {
      // 사용자 나이 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('age, age_verified')
        .eq('id', userId)
        .single();
      
      if (!profile || !profile.age) {
        throw new Error('나이 정보가 필요합니다.');
      }
      
      if (profile.age >= 18) {
        return { required: false, message: '성인 사용자입니다.' };
      }
      
      // 미성년자인 경우 보호자 동의 필요
      return {
        required: true,
        message: '미성년자는 보호자 동의가 필요합니다.',
        guardianConsentRequired: true,
        ageVerificationRequired: !profile.age_verified
      };
      
    } catch (error) {
      console.error('보호자 동의 확인 실패:', error);
      throw error;
    }
  }

  /**
   * 인증 만료 알림 발송
   */
  async sendExpirationNotifications() {
    try {
      // 7일 내 만료 예정인 인증 조회
      const { data: expiringVerifications, error } = await supabase
        .from('line_identity_verifications')
        .select('user_id, verified_name, expires_at')
        .gte('expires_at', new Date().toISOString())
        .lte('expires_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
      
      if (error) throw error;
      
      // 각 사용자에게 만료 알림 발송
      for (const verification of expiringVerifications) {
        const daysLeft = Math.ceil((new Date(verification.expires_at) - new Date()) / (24 * 60 * 60 * 1000));
        
        await supabase
          .from('notifications')
          .insert({
            user_id: verification.user_id,
            type: 'system',
            title: '신원인증 만료 예정',
            body: `${verification.verified_name}님의 신원인증이 ${daysLeft}일 후 만료됩니다. LINE 재연동을 통해 인증을 갱신해주세요.`,
            link: 'my_profile.html'
          });
      }
      
      return expiringVerifications.length;
      
    } catch (error) {
      console.error('만료 알림 발송 실패:', error);
      throw error;
    }
  }
}

// 전역에서 사용할 수 있도록 인스턴스 생성
export const lineIdentityService = new LineIdentityService();

/**
 * 예약 전 나이 제한 확인 함수
 */
export async function checkAgeRestrictionForBooking(userId) {
  try {
    const eligibility = await lineIdentityService.checkBookingEligibility(userId);
    
    if (!eligibility.canBook) {
      throw new Error('예약 자격이 없습니다. 만 18세 이상만 예약 가능합니다.');
    }
    
    if (eligibility.requiresGuardian) {
      const guardianCheck = await lineIdentityService.checkGuardianConsent(userId);
      if (guardianCheck.required) {
        throw new Error('미성년자는 보호자 동의가 필요합니다.');
      }
    }
    
    return {
      success: true,
      eligibility,
      message: '예약 가능합니다.'
    };
    
  } catch (error) {
    console.error('나이 제한 확인 실패:', error);
    throw error;
  }
}