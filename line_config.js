// LINE API 설정 파일
export const LINE_CONFIG = {
  // LINE Developers Console에서 받은 실제 값들로 교체하세요
  CHANNEL_ID: '2008137189',  // Basic settings > Channel ID
  CHANNEL_SECRET: 'e743b9de9cd4ecc5b1d44f8d4c34d9d3', // Basic settings > Channel secret
  
  // 자동으로 현재 도메인 감지
  get CALLBACK_URL() {
    const origin = window.location.origin;
    return `${origin}/line_callback.html`;
  },
  
  // LINE OAuth URL 생성
  generateLoginUrl(userId) {
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
  }
};

// 개발 환경에서 설정 확인
if (LINE_CONFIG.CHANNEL_ID === '2008137189') {
  console.warn('⚠️ LINE_CONFIG: 실제 Channel ID를 설정해주세요!');
}

if (LINE_CONFIG.CHANNEL_SECRET === 'e743b9de9cd4ecc5b1d44f8d4c34d9d3') {
  console.warn('⚠️ LINE_CONFIG: 실제 Channel Secret을 설정해주세요!');
}