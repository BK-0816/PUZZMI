// LINE API 설정 파일 - 보안 강화 버전
export const LINE_CONFIG = {
  // ⚠️ 보안상 실제 키는 환경변수나 서버에서 관리해야 합니다
  // 현재는 개발용 플레이스홀더입니다
  CHANNEL_ID: process.env.LINE_CHANNEL_ID || 'YOUR_LINE_CHANNEL_ID_HERE',
  CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET || 'YOUR_LINE_CHANNEL_SECRET_HERE',
  
  // 자동으로 현재 도메인 감지
  get CALLBACK_URL() {
    const origin = window.location.origin;
    return `${origin}/line_callback.html`;
  },
  
  // LINE OAuth URL 생성
  generateLoginUrl(userId) {
    // 실제 Channel ID가 설정되지 않은 경우 시뮬레이션 모드
    if (this.CHANNEL_ID === 'YOUR_LINE_CHANNEL_ID_HERE' || !this.CHANNEL_ID) {
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
      scope: 'profile openid'
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
  }
};

// 개발 환경에서 설정 상태 확인
if (typeof window !== 'undefined') {
  if (LINE_CONFIG.CHANNEL_ID === 'YOUR_LINE_CHANNEL_ID_HERE') {
    console.warn('🔧 LINE 설정 필요: 실제 Channel ID를 환경변수에 설정해주세요');
    console.info('📖 설정 가이드: line_setup_guide.html 참조');
  }
  
  if (LINE_CONFIG.CHANNEL_SECRET === 'YOUR_LINE_CHANNEL_SECRET_HERE') {
    console.warn('🔧 LINE 설정 필요: 실제 Channel Secret을 환경변수에 설정해주세요');
    console.info('🔒 보안 주의: Secret은 절대 클라이언트 코드에 노출하면 안됩니다');
  }
}