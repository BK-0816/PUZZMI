import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createPaymentParams, generatePaymentId, requestPayment } from './portone_config.js';

const SUPABASE_URL = 'https://eevvgbbokenpjnvtmztk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldnZnYmJva2VucGpudnRtenRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NjI2OTgsImV4cCI6MjA3MzEzODY5OH0.aLoqYYeDW_0ZEwkr8c8IPFvXnEwQPZah1mQzwiyG2Y4';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let bookingData = null;

async function loadPaymentInfo() {
  const token = new URLSearchParams(window.location.search).get('token');
  if (!token) return showError('결제 링크가 올바르지 않습니다.');

  try {
    const { data, error } = await supabase.from('bookings').select('*').eq('payment_token', token).maybeSingle();
    if (error || !data) throw new Error('결제 정보를 찾을 수 없습니다.');
    if (data.payment_status === 'paid') throw new Error('이미 결제가 완료되었습니다.');

    bookingData = data;
    const hours = data.duration_hours || 0;
    
    // 화면 표시용 정보 세팅 (화면에는 일본어 상품명 노출)
    document.getElementById('booking_id').textContent = '#' + data.id;
    document.getElementById('goodname').textContent = 'PUZZMIメイト予約 (' + hours + '時間)';
    document.getElementById('price').textContent = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(data.total_amount || 0);
    
    document.getElementById('loading').style.display = 'none';
    document.getElementById('payBtn').disabled = false;
  } catch (err) {
    showError(err.message);
  }
}

function showError(msg) {
  const errDiv = document.getElementById('error-message');
  errDiv.textContent = msg; errDiv.style.display = 'block';
  document.getElementById('loading').style.display = 'none';
  document.getElementById('payBtn').disabled = true;
}

document.getElementById('payBtn').addEventListener('click', async function() {
  if (!bookingData) return;
  
  this.disabled = true;
  this.textContent = '결제 처리 중...';

  try {
    const paymentId = generatePaymentId();
    
    // 1. 보안 정책(RLS)이 적용된 테이블에 결제 대기(ready) 정보 저장
    const { error: insertError } = await supabase.from('portone_payments').insert({
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
    if (insertError) throw new Error('결제 초기화 실패: ' + insertError.message);

    // 2. portone_config.js를 이용해 파라미터 생성
    const rawPhone = (bookingData.customer_contact || '08000000000').replace(/[^0-9]/g, '');
    const paymentParams = createPaymentParams({
      paymentId: paymentId,
      totalAmount: bookingData.total_amount,
      durationHours: bookingData.duration_hours,
      customer: {
        tel: rawPhone,
        email: 'guest@puzzmi.com'
      },
      customData: {
        booking_id: bookingData.id,
        user_id: bookingData.customer_id,
        mate_id: bookingData.mate_id
      }
    });

    // 3. 결제창 호출
    const paymentResult = await requestPayment(paymentParams);

    // 4. 결제 완료 후 보안 검증 (Edge Function 호출)
    const verifyResponse = await fetch(`${SUPABASE_URL}/functions/v1/payment-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ paymentId: paymentResult.payment_id })
    });
    
    const verifyResult = await verifyResponse.json();
    if (!verifyResult.success) throw new Error(verifyResult.message || '결제 검증 실패');

    window.location.href = `payment_complete.html?paymentId=${paymentResult.payment_id}`;

  } catch (error) {
    console.error('결제 에러:', error);
    alert(error.error_msg || error.message);
    this.disabled = false;
    this.textContent = '安全決済を実行';
  }
});

window.addEventListener('DOMContentLoaded', loadPaymentInfo);