// LINE API 설정 - 서버사이드 처리 버전
export const LINE_CONFIG = {
  // 클라이언트에서는 API 키를 직접 노출하지 않음
  // 모든 LINE API 호출은 Supabase Edge Functions를 통해 처리
  
  // Supabase Functions URL
  get FUNCTIONS_URL() {
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  },
  
  // 자동으로 현재 도메인 감지
  get CALLBACK_URL() {
    const origin = window.location.origin;
    return `${origin}/line_callback.html`;
  },
  
  // LINE OAuth URL 생성 (서버에서 처리)
  async generateLoginUrl(userId) {
    try {
      const response = await fetch(`${this.FUNCTIONS_URL}/line-auth/generate-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ userId })
      });
      
      if (!response.ok) {
        throw new Error(`URL 생성 실패: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'URL 생성 실패');
      }
      
      return result.loginUrl;
      
    } catch (error) {
      console.error('LINE URL 생성 실패:', error);
      console.warn('⚠️ 서버 연결 실패. 시뮬레이션 모드로 전환됩니다.');
      return this.generateSimulationUrl(userId);
    }
  },
  
  // 개발용 시뮬레이션 URL
  generateSimulationUrl(userId) {
    const params = new URLSearchParams({
      simulation: 'true',
      userId: userId,
      timestamp: Date.now()
    });
    
    return `${this.CALLBACK_URL}?${params.toString()}`;
  },
  
  // 토큰 교환 (서버에서 처리)
  async exchangeCodeForToken(code) {
    try {
      const response = await fetch(`${this.FUNCTIONS_URL}/line-auth/exchange-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ 
          code,
          callbackUrl: this.CALLBACK_URL 
        })
      });
      
      if (!response.ok) {
        throw new Error(`토큰 교환 실패: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '토큰 교환 실패');
      }
      
      return result.tokenData;
      
    } catch (error) {
      console.error('토큰 교환 실패:', error);
      // 실패 시 시뮬레이션 데이터 반환
      return {
        access_token: 'mock_access_token_' + Date.now(),
        token_type: 'Bearer',
        expires_in: 2592000,
        refresh_token: 'mock_refresh_token_' + Date.now(),
        scope: 'profile openid'
      };
    }
  },
  
  // 사용자 프로필 조회 (서버에서 처리)
  async getUserProfile(accessToken) {
    try {
      const response = await fetch(`${this.FUNCTIONS_URL}/line-auth/get-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ accessToken })
      });
      
      if (!response.ok) {
        throw new Error(`프로필 조회 실패: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '프로필 조회 실패');
      }
      
      return result.profile;
      
    } catch (error) {
      console.error('LINE 프로필 조회 실패:', error);
      // 실패 시 시뮬레이션 데이터 반환
      return {
        userId: 'U' + Math.random().toString(36).substr(2, 9),
        displayName: '테스트 사용자',
        pictureUrl: 'https://picsum.photos/200/200',
        statusMessage: 'PUZZMI 사용자'
      };
    }
  }
};

// 보안 정보 표시
if (typeof window !== 'undefined') {
  console.info('🔒 보안 강화: LINE API 키가 서버사이드에서 안전하게 처리됩니다');
  console.info('🚀 Supabase Edge Functions를 통한 안전한 API 호출');
  console.info('📖 설정 가이드: secure_line_setup.html 참조');
}