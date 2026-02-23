import { PORTONE_CONFIG, createPaymentParams, requestPayment } from './portone_config.js';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = 'https://eevvgbbokenpjnvtmztk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldnZnYmJva2VucGpudnRtenRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NjI2OTgsImV4cCI6MjA3MzEzODY5OH0.aLoqYYeDW_0ZEwkr8c8IPFvXnEwQPZah1mQzwiyG2Y4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let bookingData = null;

function getPaymentParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    token: params.get('token'),
    bookingId: params.get('booking_id'),
    amount: params.get('amount')
  };
}

async function loadPaymentInfo() {
  const { token, bookingId } = getPaymentParams();

  if (!token && !bookingId) {
    showError('결제 링크가 올바르지 않습니다.');
    return;
  }

  document.getElementById('loading').style.display = 'block';
  document.getElementById('payBtn').disabled = true;

  try {
    let query = supabase.from('bookings').select('*');

    if (token) {
      query = query.eq('payment_token', token);
    } else if (bookingId) {
      query = query.eq('id', bookingId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('결제 정보를 찾을 수 없습니다.');

    bookingData = data;

    if (data.payment_status === 'paid') {
      showError('이미 결제가 완료되었습니다.');
      return;
    }

    const yenFormatter = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0
    });

    document.getElementById('booking_id').textContent = `#${data.id}`;
    document.getElementById('goodname').textContent = `PUZZMI メイト予約 (${data.duration_hours || 0}時間)`;
    document.getElementById('price').textContent = yenFormatter.format(data.total_amount || 0);

    document.getElementById('loading').style.display = 'none';
    document.getElementById('payBtn').disabled = false;

  } catch (error) {
    console.error('Payment load error:', error);
    showError(error.message || '결제 정보를 불러오는데 실패했습니다.');
  }
}

function showError(message) {
  const errorDiv = document.getElementById('error-message');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';

  document.getElementById('loading').style.display = 'none';
  document.getElementById('payBtn').disabled = true;
}

document.getElementById('payBtn').addEventListener('click', async function() {
  if (!bookingData) {
    alert('결제 정보를 불러오지 못했습니다.');
    return;
  }

  this.disabled = true;
  this.innerHTML = '결제 처리 중...';

  try {
    const paymentId = `PUZZMI_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const paymentParams = createPaymentParams({
      paymentId: paymentId,
      orderName: `PUZZMI メイト予約 (${bookingData.duration_hours || 0}時間)`,
      totalAmount: bookingData.total_amount,
      currency: 'JPY',
      payMethod: 'CARD',
      customer: {
        name: bookingData.customer_name || 'Guest',
        tel: bookingData.customer_contact || '',
        email: 'guest@puzzmi.com'
      },
      customData: {
        booking_id: bookingData.id,
        user_id: bookingData.customer_id,
        mate_id: bookingData.mate_id
      }
    });

    console.log('결제 파라미터:', paymentParams);
    const paymentResult = await requestPayment(paymentParams);

    const { error: insertError } = await supabase
      .from('portone_payments')
      .insert({
        booking_id: bookingData.id,
        user_id: bookingData.customer_id,
        imp_uid: paymentResult.payment_id,
        merchant_uid: paymentResult.payment_id,
        amount: paymentResult.paid_amount,
        currency: paymentResult.currency || 'JPY',
        status: 'paid',
        pg_provider: 'portone_v2_inicis',
        pay_method: paymentResult.method || 'CARD',
        pg_tid: paymentResult.transaction_id,
        receipt_url: paymentResult.receipt_url,
        paid_at: paymentResult.paid_at || new Date().toISOString()
      });

    if (insertError) {
      console.error('결제 정보 저장 실패:', insertError);
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        payment_method: 'portone_inicis',
        payment_id: paymentResult.payment_id
      })
      .eq('id', bookingData.id);

    if (updateError) {
      console.error('예약 상태 업데이트 실패:', updateError);
    }

    alert('결제가 완료되었습니다!');
    window.location.href = 'payment_complete.html';

  } catch (error) {
    console.error('Payment error:', error);
    alert(error.error_msg || error.message || '결제에 실패했습니다.');
    this.disabled = false;
    this.innerHTML = '🔒 안전결제 실행';
  }
});

window.addEventListener('DOMContentLoaded', loadPaymentInfo);
