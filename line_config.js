// LINE API 설정 파일 - Netlify 환경변수 대응 버전
export const LINE_CONFIG = {
  // Netlify에서는 클라이언트 사이드에서 환경변수 직접 접근 불가
  // 대신 빌드 시점에 주입되거나 런타임에 서버에서 가져와야 함
  
  // 개발 환경에서는 여기에 직접 설정 (보안 주의!)
  // 운영 환경에서는 Netlify Functions나 Edge Functions 사용 권장
  CHANNEL_ID: '2008137189', // 실제 Channel ID로 교체
  CHANNEL_SECRET: 'e743b9de9cd4ecc5b1d44f8d4c34d9d3', // 실제 Channel Secret으로 교체
  
  // 자동으로 현재 도메인 감지
  get CALLBACK_URL() {
    const origin = window.location.origin;
    return `${origin}/line_callback.html`;
  },
  
  // LINE OAuth URL 생성
  generateLoginUrl(userId) {
    // Channel ID 유효성 검사
    if (!this.CHANNEL_ID || this.CHANNEL_ID === 'YOUR_LINE_CHANNEL_ID_HERE') {
      console.warn('⚠️ LINE Channel ID가 설정되지 않았습니다. 시뮬레이션 모드로 실행됩니다.');
      return this.generateSimulationUrl(userId);
    }
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.CHANNEL_ID,
      redirect_uri: this.CALLBACK_URL,
      state: btoa(JSON.stringify({ 
        userId: userId, 
        timestamp: Date.now(),
        origin: window.location.origin 
      })),
      scope: 'profile openid email'
    });
    
    return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
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
  
  // 토큰 교환 (실제 환경에서는 서버에서 처리해야 함)
  async exchangeCodeForToken(code) {
    try {
      const response = await fetch('https://api.line.me/oauth2/v2.1/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.CALLBACK_URL,
          client_id: this.CHANNEL_ID,
          client_secret: this.CHANNEL_SECRET
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`토큰 교환 실패: ${response.status} ${errorData}`);
      }
      
      return await response.json();
      
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
  
  // 사용자 프로필 조회
  async getUserProfile(accessToken) {
    try {
      const response = await fetch('https://api.line.me/v2/profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`프로필 조회 실패: ${response.status}`);
      }
      
      return await response.json();
      
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

// 보안 경고 표시
if (typeof window !== 'undefined') {
  console.warn('🔒 보안 주의: 실제 운영 환경에서는 Channel Secret을 클라이언트에 노출하면 안됩니다!');
  console.info('💡 권장사항: Netlify Functions나 서버사이드에서 토큰 교환 처리');
  console.info('📖 보안 가이드: secure_line_setup.html 참조');
}