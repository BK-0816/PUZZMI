// LINE Pay 결제 서비스 모듈 (PortOne V2 연동 버전)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://eevvgbbokenpjnvtmztk.supabase.co";
// 제공해주신 ANON KEY
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldnZnYmJva2VucGpudnRtenRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NjI2OTgsImV4cCI6MjA3MzEzODY5OH0.aLoqYYeDW_0ZEwkr8c8IPFvXnEwQPZah1mQzwiyG2Y4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 배포된 프론트엔드 URL (Netlify 등의 실제 도메인으로 변경하세요)
const FRONTEND_URL = "https://puzzmi.netlify.app"; 

export class LinePaymentService {
  
  /**
   * 관리자용: 고객에게 포트원 결제 링크 발송
   */
  async sendPaymentRequestByAdmin(bookingId) {
    try {
      // 1. 예약 정보 및 관련 데이터 조회
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          mate_profiles!inner (
            user_id, hourly_rate,
            profiles!inner ( full_name )
          )
        `)
        .eq('id', bookingId)
        .single();
      
      if (bookingError) throw bookingError;

      // 2. 결제 토큰 확인 및 생성 (payment_page.html 접속용)
      // 이미 토큰이 있다면 재사용하고, 없다면 새로 생성하여 저장합니다.
      let paymentToken = booking.payment_token;
      if (!paymentToken) {
        paymentToken = `pt_${bookingId}_${Math.random().toString(36).substring(2, 10)}`;
        
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ payment_token: paymentToken })
          .eq('id', bookingId);
          
        if (updateError) throw new Error('결제 토큰 생성/저장 실패');
      }

      // 3. 결제 금액 계산 (DB에 total_amount가 있다면 우선 사용)
      const hourlyRate = booking.mate_profiles.hourly_rate || 4000;
      const totalAmount = booking.total_amount || (booking.duration_hours * hourlyRate);

      // 4. 고객에게 보낼 결제 페이지 URL 조합
      const paymentUrl = `${FRONTEND_URL}/payment_page.html?token=${paymentToken}`;

      // 5. Supabase Edge Function을 통한 LINE 메시지 발송
      // 작성하신 'send-line-notification' 함수를 호출하여 안전하게 발송합니다.
      console.log('📱 LINE 결제 알림 발송 요청 중...');
      const { data: functionData, error: functionError } = await supabase.functions.invoke('send-line-notification', {
        body: {
          userId: booking.customer_id,
          bookingId: booking.id,
          type: 'payment_request',
          paymentUrl: paymentUrl,
          amount: totalAmount
        }
      });

      if (functionError) {
        console.error('Edge Function 호출 에러:', functionError);
        throw new Error('LINE 메시지 발송에 실패했습니다.');
      }

      // 6. 관리자 화면 로그용 (선택 사항: payment_requests 테이블에 기록 남기기)
      await supabase
        .from('payment_requests')
        .insert({
          booking_id: bookingId,
          user_id: booking.customer_id,
          mate_id: booking.mate_id,
          amount: totalAmount,
          currency: 'JPY',
          payment_method: 'portone_v2_inicis',
          status: 'sent',
          line_payment_url: paymentUrl,
          sent_at: new Date().toISOString()
        });

      return {
        success: true,
        paymentToken: paymentToken,
        paymentUrl: paymentUrl
      };
      
    } catch (error) {
      console.error('관리자 결제 요청 발송 프로세스 실패:', error);
      throw error;
    }
  }
}

// 전역에서 사용할 수 있도록 인스턴스 생성
export const linePaymentService = new LinePaymentService();

/**
 * 관리자용 결제 요청 발송 함수 (버튼 클릭 등에서 호출)
 */
export async function sendPaymentRequestToCustomer(bookingId) {
  try {
    const result = await linePaymentService.sendPaymentRequestByAdmin(bookingId);
    
    // 성공 알림
    showToast('💳 결제 요청 링크가 고객의 LINE으로 발송되었습니다!');
    return result;
    
  } catch (error) {
    console.error('결제 요청 발송 에러:', error);
    showToast('❌ 결제 요청 발송 실패: ' + error.message);
    throw error;
  }
}

/**
 * 토스트 메시지 표시 UI 유틸리티
 */
function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white; padding: 12px 24px; border-radius: 12px;
    z-index: 9999; font-weight: 600; box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
    animation: slideDown 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}