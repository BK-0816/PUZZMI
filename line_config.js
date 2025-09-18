import { SUPABASE_URL, SUPABASE_ANON_KEY } from './nav.js';

// LINE API 설정 - 완전히 서버사이드 처리
export const LINE_CONFIG = {
  // Edge Function을 통한 안전한 LINE API 처리
  get FUNCTIONS_URL() {
    return `${SUPABASE_URL}/functions/v1`;
  },
  
  // LINE OAuth URL 생성 (완전히 서버에서 처리)
  async generateLoginUrl(userId) {
    try {
      console.log('🔗 Edge Function을 통한 LINE URL 생성 시작');
      
      // 현재 로그인 세션 확인
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('로그인 세션이 없습니다. 다시 로그인해주세요.');
      }
      
      const response = await fetch(`${this.FUNCTIONS_URL}/line-auth/generate-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'Origin': window.location.origin,
          'Referer': window.location.href
        },
        body: JSON.stringify({ 
          // userId는 서버에서 JWT에서 추출하므로 보내지 않음
          requestOrigin: window.location.origin
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge Function 호출 실패:', {
          status: response.status,
          error: errorText
        });
        throw new Error(`Edge Function 호출 실패: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'LINE URL 생성 실패');
      }
      
      console.log('✅ Edge Function으로 LINE URL 생성 성공');
      return result.loginUrl;
      
      // Edge Function 호출 실패 시 에러 표시
      throw error;
    }
  },
  
  // LINE 인증 완료 처리 (서버에서 처리)
  async completeLineAuth(code, state) {
    try {
      console.log('🔐 Edge Function을 통한 LINE 인증 완료 처리');
      
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('로그인 세션이 없습니다. 다시 로그인해주세요.');
      }
      
      const response = await fetch(`${this.FUNCTIONS_URL}/line-auth/complete-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code, state })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`인증 완료 처리 실패: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '인증 완료 처리 실패');
      }
      
      console.log('✅ LINE 인증 완료!');
      return result;
      
    } catch (error) {
      console.error('LINE 인증 완료 처리 실패:', error);
      throw error;
    }
  }
};

// 보안 정보 표시
if (typeof window !== 'undefined') {
  console.info('🔒 보안 강화: 모든 LINE API 처리가 서버사이드에서 안전하게 처리됩니다');
  console.info('🚀 Supabase Edge Functions를 통한 완전한 서버사이드 처리');
  console.info('🔐 클라이언트에는 민감한 정보가 노출되지 않습니다');
}