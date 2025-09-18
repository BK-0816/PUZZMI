// LINE Pay 결제 서비스 모듈
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://eevvgbbokenpjnvtmztk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldnZnYmJva2VucGpudnRtenRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NjI2OTgsImV4cCI6MjA3MzEzODY5OH0.aLoqYYeDW_0ZEwkr8c8IPFvXnEwQPZah1mQzwiyG2Y4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * LINE Pay 결제 서비스 클래스
 * 실제 운영에서는 LINE Pay API 연동 필요
 */
export class LinePaymentService {
  constructor() {
    // 실제 환경에서는 환경변수에서 가져오기
    this.channelId = process.env.LINE_PAY_CHANNEL_ID || 'YOUR_LINE_PAY_CHANNEL_ID';
    this.channelSecret = process.env.LINE_PAY_CHANNEL_SECRET || 'YOUR_LINE_PAY_CHANNEL_SECRET';
    this.apiUrl = 'https://api-pay.line.me'; // 실제 환경
    // this.apiUrl = 'https://sandbox-api-pay.line.me'; // 테스트 환경
  }

  /**
   * 결제 요청 생성
   */
  async createPaymentRequest(bookingData) {
    try {
      const { booking, user, mate, amount, currency = 'JPY' } = bookingData;
      
      // 1. 사용자의 LINE 계정 확인
      const { data: lineAccount, error: lineError } = await supabase
        .from('user_line_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_verified', true)
        .single();
      
      if (lineError || !lineAccount) {
        throw new Error('LINE 계정이 연동되지 않았습니다. LINE 연동 후 다시 시도해주세요.');
      }
      
      // 2. 결제 요청 데이터 생성
      const paymentRequestData = {
        booking_id: booking.id,
        user_id: user.id,
        mate_id: mate.user_id,
        amount: amount,
        currency: currency,
        payment_method: 'line_pay',
        status: 'pending',
        payment_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24시간 후
        metadata: {
          booking_date: booking.date,
          booking_time: booking.start_time,
          duration: booking.duration_hours,
          mate_name: mate.profiles?.full_name || '메이트',
          customer_name: booking.customer_name
        }
      };
      
      // 3. 결제 요청 DB에 저장
      const { data: paymentRequest, error: dbError } = await supabase
        .from('payment_requests')
        .insert(paymentRequestData)
        .select()
        .single();
      
      if (dbError) throw dbError;
      
      // 4. LINE Pay API 호출 (실제 환경에서 사용)
      const linePayUrl = await this.requestLinePayment({
        paymentRequestId: paymentRequest.id,
        amount: amount,
        currency: currency,
        orderId: `PUZZMI_${booking.id}_${Date.now()}`,
        productName: `PUZZMI 메이트 예약 (${booking.duration_hours}시간)`,
        lineUserId: lineAccount.line_user_id
      });
      
      // 5. 결제 URL 업데이트
      await supabase
        .from('payment_requests')
        .update({ 
          line_payment_url: linePayUrl,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', paymentRequest.id);
      
      // 6. LINE 메시지 발송
      await this.sendLinePaymentMessage(lineAccount.line_user_id, {
        paymentUrl: linePayUrl,
        amount: amount,
        currency: currency,
        mateName: mate.profiles?.full_name || '메이트',
        bookingDate: booking.date,
        bookingTime: booking.start_time
      });
      
      return {
        success: true,
        paymentRequestId: paymentRequest.id,
        paymentUrl: linePayUrl
      };
      
    } catch (error) {
      console.error('결제 요청 생성 실패:', error);
      throw error;
    }
  }

  /**
   * LINE Pay 결제 요청 (실제 API 호출)
   */
  async requestLinePayment(paymentData) {
    try {
      // 실제 환경에서는 아래 코드 사용
      /*
      const requestBody = {
        amount: paymentData.amount,
        currency: paymentData.currency,
        orderId: paymentData.orderId,
        packages: [{
          id: 'package1',
          amount: paymentData.amount,
          products: [{
            name: paymentData.productName,
            quantity: 1,
            price: paymentData.amount
          }]
        }],
        redirectUrls: {
          confirmUrl: `${window.location.origin}/payment_confirm.html?request_id=${paymentData.paymentRequestId}`,
          cancelUrl: `${window.location.origin}/payment_cancel.html?request_id=${paymentData.paymentRequestId}`
        }
      };
      
      const response = await fetch(`${this.apiUrl}/v3/payments/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-LINE-ChannelId': this.channelId,
          'X-LINE-Authorization-Nonce': this.generateNonce(),
          'X-LINE-Authorization': this.generateSignature(requestBody)
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error('LINE Pay 요청 실패');
      }
      
      const result = await response.json();
      return result.info.paymentUrl.web;
      */
      
      // 개발 환경에서는 시뮬레이션 URL 반환
      return `https://pay.line.me/payments/request?transactionId=mock_${paymentData.paymentRequestId}`;
      
    } catch (error) {
      console.error('LINE Pay 요청 실패:', error);
      throw error;
    }
  }

  /**
   * LINE 메시지 발송
   */
  async sendLinePaymentMessage(lineUserId, messageData) {
    try {
      // 실제 환경에서는 LINE Messaging API 사용
      /*
      const message = {
        to: lineUserId,
        messages: [{
          type: 'flex',
          altText: 'PUZZMI 결제 요청',
          contents: {
            type: 'bubble',
            header: {
              type: 'box',
              layout: 'vertical',
              contents: [{
                type: 'text',
                text: 'PUZZMI 결제 요청',
                weight: 'bold',
                size: 'xl',
                color: '#667eea'
              }]
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: `메이트: ${messageData.mateName}`,
                  weight: 'bold',
                  margin: 'md'
                },
                {
                  type: 'text',
                  text: `일정: ${messageData.bookingDate} ${messageData.bookingTime}`,
                  margin: 'sm'
                },
                {
                  type: 'text',
                  text: `금액: ${new Intl.NumberFormat('ja-JP', { style: 'currency', currency: messageData.currency }).format(messageData.amount)}`,
                  weight: 'bold',
                  color: '#f093fb',
                  margin: 'md'
                }
              ]
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [{
                type: 'button',
                action: {
                  type: 'uri',
                  label: '결제하기',
                  uri: messageData.paymentUrl
                },
                style: 'primary',
                color: '#667eea'
              }]
            }
          }
        }]
      };
      
      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.channelAccessToken}`
        },
        body: JSON.stringify(message)
      });
      
      if (!response.ok) {
        throw new Error('LINE 메시지 발송 실패');
      }
      */
      
      // 개발 환경에서는 콘솔 로그
      console.log('📱 LINE 결제 메시지 발송 시뮬레이션:');
      console.log(`👤 수신자: ${lineUserId}`);
      console.log(`💰 금액: ${messageData.amount} ${messageData.currency}`);
      console.log(`🔗 결제 URL: ${messageData.paymentUrl}`);
      
      return true;
      
    } catch (error) {
      console.error('LINE 메시지 발송 실패:', error);
      throw error;
    }
  }

  /**
   * 결제 상태 확인
   */
  async checkPaymentStatus(paymentRequestId) {
    try {
      const { data: paymentRequest, error } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('id', paymentRequestId)
        .single();
      
      if (error) throw error;
      
      // 실제 환경에서는 LINE Pay API로 상태 확인
      /*
      const response = await fetch(`${this.apiUrl}/v3/payments/${paymentRequest.transaction_id}`, {
        headers: {
          'X-LINE-ChannelId': this.channelId,
          'X-LINE-Authorization': this.generateSignature()
        }
      });
      
      const result = await response.json();
      return result.info;
      */
      
      return paymentRequest;
      
    } catch (error) {
      console.error('결제 상태 확인 실패:', error);
      throw error;
    }
  }

  /**
   * 결제 완료 처리
   */
  async completePayment(paymentRequestId, transactionId) {
    try {
      // 결제 요청 상태 업데이트
      const { error: updateError } = await supabase
        .from('payment_requests')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          metadata: {
            transaction_id: transactionId,
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', paymentRequestId);
      
      if (updateError) throw updateError;
      
      // 예약 상태를 confirmed로 변경
      const { data: paymentRequest } = await supabase
        .from('payment_requests')
        .select('booking_id, user_id')
        .eq('id', paymentRequestId)
        .single();
      
      if (paymentRequest) {
        await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', paymentRequest.booking_id);
        
        // 결제 완료 알림 생성
        await supabase
          .from('notifications')
          .insert({
            user_id: paymentRequest.user_id,
            type: 'booking_confirmed',
            title: '결제 완료 및 예약 확정',
            body: '결제가 완료되어 예약이 확정되었습니다. 메이트가 곧 연락드릴 예정입니다.',
            link: `my_bookings.html`
          });
      }
      
      return true;
      
    } catch (error) {
      console.error('결제 완료 처리 실패:', error);
      throw error;
    }
  }

  /**
   * 관리자용: 결제 요청 발송
   */
  async sendPaymentRequestByAdmin(bookingId) {
    try {
      // 예약 정보 조회
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
      
      // 고객 정보 조회
      const { data: customer, error: customerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', booking.customer_id)
        .single();
      
      if (customerError) throw customerError;
      
      // 결제 금액 계산
      const hourlyRate = booking.mate_profiles.hourly_rate || 4000;
      const totalAmount = booking.duration_hours * hourlyRate;
      
      // 결제 요청 생성
      const result = await this.createPaymentRequest({
        booking: booking,
        user: { id: booking.customer_id },
        mate: booking.mate_profiles,
        amount: totalAmount,
        currency: 'JPY'
      });
      
      // 시스템 로그 기록
      await supabase
        .from('system_logs')
        .insert({
          level: 'info',
          category: 'payment',
          message: `관리자가 예약 #${bookingId}에 대한 결제 요청을 발송했습니다.`,
          metadata: {
            booking_id: bookingId,
            amount: totalAmount,
            currency: 'JPY',
            payment_request_id: result.paymentRequestId
          }
        });
      
      return result;
      
    } catch (error) {
      console.error('관리자 결제 요청 발송 실패:', error);
      
      // 에러 로그 기록
      await supabase
        .from('system_logs')
        .insert({
          level: 'error',
          category: 'payment',
          message: `결제 요청 발송 실패: ${error.message}`,
          metadata: {
            booking_id: bookingId,
            error: error.message
          }
        });
      
      throw error;
    }
  }

  /**
   * 결제 요청 취소
   */
  async cancelPaymentRequest(paymentRequestId, reason = '관리자에 의한 취소') {
    try {
      const { error } = await supabase
        .from('payment_requests')
        .update({
          status: 'cancelled',
          failed_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRequestId);
      
      if (error) throw error;
      
      return true;
      
    } catch (error) {
      console.error('결제 요청 취소 실패:', error);
      throw error;
    }
  }

  /**
   * 서명 생성 (LINE Pay API용)
   */
  generateSignature(requestBody = '') {
    // 실제 환경에서는 HMAC-SHA256으로 서명 생성
    const crypto = require('crypto');
    const nonce = this.generateNonce();
    const timestamp = Date.now().toString();
    const message = this.channelSecret + '/v3/payments/request' + JSON.stringify(requestBody) + nonce + timestamp;
    
    return crypto.createHmac('sha256', this.channelSecret).update(message).digest('base64');
  }

  /**
   * Nonce 생성
   */
  generateNonce() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

// 전역에서 사용할 수 있도록 인스턴스 생성
export const linePaymentService = new LinePaymentService();

/**
 * 관리자용 결제 요청 발송 함수
 */
export async function sendPaymentRequestToCustomer(bookingId) {
  try {
    const result = await linePaymentService.sendPaymentRequestByAdmin(bookingId);
    
    // 성공 알림
    showToast('💳 결제 요청이 고객의 LINE으로 발송되었습니다!');
    
    return result;
    
  } catch (error) {
    console.error('결제 요청 발송 실패:', error);
    showToast('❌ 결제 요청 발송 실패: ' + error.message);
    throw error;
  }
}

/**
 * 토스트 메시지 표시
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