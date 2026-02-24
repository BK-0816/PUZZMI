import { PORTONE_CONFIG, createPaymentParams, requestPayment } from './portone_config.js';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = 'https://eevvgbbokenpjnvtmztk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldnZnYmJva2VucGpudnRtenRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NjI2OTgsImV4cCI6MjA3MzEzODY5OH0.aLoqYYeDW_0ZEwkr8c8IPFvXnEwQPZah1mQzwiyG2Y4';

let supabase;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (error) {
  console.error('Supabase init error:', error);
}

let bookingData = null;

function getPaymentToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

async function loadPaymentInfo() {
  const token = getPaymentToken();

  if (!token) {
    showError('결제 링크가 올바르지 않습니다.');
    return;
  }

  document.getElementById('loading').style.display = 'block';
  document.getElementById('payBtn').disabled = true;

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('payment_token', token)
      .maybeSingle();

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

    const hours = data.duration_hours || 0;
    const bookingId = '#' + data.id;
    const orderName = 'PUZZMI \u30E1\u30A4\u30C8\u4E88\u7D04 (' + hours + '\u6642\u9593)';
    const totalAmount = yenFormatter.format(data.total_amount || 0);

    document.getElementById('booking_id').textContent = bookingId;
    document.getElementById('goodname').textContent = orderName;
    document.getElementById('price').textContent = totalAmount;

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
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const paymentId = 'PUZZMI_' + timestamp + '_' + random;

    const hours = bookingData.duration_hours || 0;
    const orderName = 'PUZZMI \u30E1\u30A4\u30C8\u4E88\u7D04 (' + hours + '\u6642\u9593)';

    const paymentParams = createPaymentParams({
      paymentId: paymentId,
      orderName: orderName,
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

    const { error: insertError } = await supabase
      .from('portone_payments')
      .insert({
        booking_id: bookingData.id,
        user_id: null,
        imp_uid: paymentId,
        merchant_uid: paymentId,
        amount: bookingData.total_amount,
        currency: 'JPY',
        status: 'ready',
        pg_provider: 'portone_v2_inicis',
        pay_method: 'CARD'
      });

    if (insertError) {
      console.error('결제 정보 저장 실패:', insertError);
      console.error('에러 상세:', JSON.stringify(insertError, null, 2));
      console.error('삽입 시도 데이터:', {
        booking_id: bookingData.id,
        user_id: bookingData.customer_id,
        imp_uid: paymentId,
        merchant_uid: paymentId,
        amount: bookingData.total_amount,
        currency: 'JPY',
        status: 'ready',
        pg_provider: 'portone_v2_inicis',
        pay_method: 'CARD'
      });
      throw new Error('결제 정보 저장에 실패했습니다: ' + (insertError.message || insertError.code));
    }

    const paymentResult = await requestPayment(paymentParams);

    const verifyResponse = await fetch(`${SUPABASE_URL}/functions/v1/payment-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        paymentId: paymentResult.payment_id
      })
    });

    const verifyResult = await verifyResponse.json();

    if (!verifyResult.success) {
      throw new Error(verifyResult.message || '결제 검증에 실패했습니다.');
    }

    alert('결제가 완료되었습니다!');
    window.location.href = 'payment_complete.html';

  } catch (error) {
    console.error('Payment error:', error);
    alert(error.error_msg || error.message || '결제에 실패했습니다.');
    this.disabled = false;
    this.innerHTML = '\u{1F512} 안전결제 실행';
  }
});

window.addEventListener('DOMContentLoaded', loadPaymentInfo);
