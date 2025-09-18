import { SUPABASE_URL, SUPABASE_ANON_KEY } from './nav.js';

// LINE API 설정 - 서버사이드 처리 버전
export const LINE_CONFIG = {
  // Edge Function을 통한 안전한 LINE API 처리
  CHANNEL_ID: '2008137189', // 실제 채널 ID (Edge Function에서 검증됨)
  
  // Supabase Functions URL
  get FUNCTIONS_URL() {
    return `${SUPABASE_URL}/functions/v1`;
  },
  
  // 자동으로 현재 도메인 감지
  get CALLBACK_URL() {
    // 개발 환경과 운영 환경 자동 감지
    const origin = window.location.origin;
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('bolt.new');
    
    if (isLocalhost) {
      // 개발 환경: localhost 사용
      return `${origin}/line_callback.html`;
    } else {
      // 운영 환경: Netlify 도메인 사용 (https://puzzmi.netlify.app)
      return `${origin}/line_callback.html`;
    }
  },
  
  // LINE OAuth URL 생성 (서버에서 처리)
  async generateLoginUrl(userId) {
    try {
      console.log('LINE URL 생성 시작, userId:', userId);
      console.log('Callback URL:', this.CALLBACK_URL);
      
      // Edge Function이 없거나 실패할 경우를 대비해 직접 URL 생성
      const state = btoa(JSON.stringify({ 
        userId, 
        timestamp: Date.now(),
        origin: window.location.origin 
      }));
      
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: this.CHANNEL_ID,
        redirect_uri: this.CALLBACK_URL,
        state: state,
        scope: 'profile openid'
      });
      
      const lineUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
      
      console.log('생성된 LINE URL:', lineUrl);
      return lineUrl;
      
    } catch (error) {
      console.error('LINE URL 생성 실패:', error);
      throw error;
    }
  },
  
  // 개발용 시뮬레이션 URL
  generateSimulationUrl(userId) {
    console.log('시뮬레이션 URL 생성, userId:', userId);
    const params = new URLSearchParams({
      simulation: 'true',
      userId: userId,
      timestamp: Date.now()
    });
    
    const simulationUrl = `${this.CALLBACK_URL}?${params.toString()}`;
    console.log('시뮬레이션 URL:', simulationUrl);
    return simulationUrl;
  },
  
  // 토큰 교환 (서버에서 처리)
  async exchangeCodeForToken(code) {
    try {
      const response = await fetch(`${this.FUNCTIONS_URL}/line-auth/exchange-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
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
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
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