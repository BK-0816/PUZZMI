// Supabase 설정
const SUPABASE_URL = 'https://eevvgbbokenpjnvtmztk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldnZnYmJva2VucGpudnRtenRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NjI2OTgsImV4cCI6MjA3MzEzODY5OH0.aLoqYYeDW_0ZEwkr8c8IPFvXnEwQPZah1mQzwiyG2Y4';

// URL에서 결제 토큰 가져오기
function getPaymentToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

// 결제 정보 로드
async function loadPaymentInfo() {
  const token = getPaymentToken();

  if (!token) {
    showError('결제 링크가 올바르지 않습니다.');
    return;
  }

  document.getElementById('loading').style.display = 'block';
  document.getElementById('payBtn').disabled = true;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/kg_inicis_payments?payment_token=eq.${token}&select=*,bookings!inner(*)`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error('결제 정보를 찾을 수 없습니다.');
    }

    const data = await response.json();

    if (data.length === 0) {
      throw new Error('결제 정보를 찾을 수 없습니다.');
    }

    const payment = data[0];

    if (payment.payment_status === 'paid') {
      showError('이미 결제가 완료되었습니다.');
      return;
    }

    // 화면에 정보 표시
    document.getElementById('oid').textContent = payment.oid;
    document.getElementById('goodname').textContent = payment.good_name || '렌탈친구 서비스';
    document.getElementById('price').textContent = parseInt(payment.amount).toLocaleString() + '원';

    // 폼 데이터 설정
    document.getElementById('mid').value = payment.mid || 'INIpayTest';
    document.getElementById('form_oid').value = payment.oid;
    document.getElementById('form_price').value = payment.amount;
    document.getElementById('timestamp').value = payment.inicis_timestamp || '';
    document.getElementById('signature').value = payment.inicis_signature || '';
    document.getElementById('verification').value = payment.inicis_verification || '';
    document.getElementById('mKey').value = payment.metadata?.mKey || '';
    document.getElementById('form_goodname').value = payment.good_name || '렌탈친구 서비스';
    document.getElementById('buyername').value = payment.buyer_name || '';
    document.getElementById('buyertel').value = payment.buyer_tel || '';
    document.getElementById('buyeremail').value = payment.buyer_email || '';
    document.getElementById('returnUrl').value = `${SUPABASE_URL}/functions/v1/inicis-payment-callback`;
    document.getElementById('closeUrl').value = `${SUPABASE_URL}/functions/v1/inicis-payment-close`;

    document.getElementById('loading').style.display = 'none';
    document.getElementById('payBtn').disabled = false;

  } catch (error) {
    console.error('Payment load error:', error);
    showError(error.message || '결제 정보를 불러오는데 실패했습니다.');
  }
}

// 에러 메시지 표시
function showError(message) {
  const container = document.querySelector('.container');
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  container.insertBefore(errorDiv, container.firstChild);

  document.getElementById('loading').style.display = 'none';
  document.getElementById('payBtn').disabled = true;
}

// 결제 실행
document.getElementById('payBtn').addEventListener('click', function() {
  if (typeof INIStdPay !== 'undefined') {
    INIStdPay.pay('SendPayForm_id');
  } else {
    alert('결제 모듈을 불러오는데 실패했습니다. 페이지를 새로고침해주세요.');
  }
});

// 페이지 로드 시 결제 정보 가져오기
window.addEventListener('DOMContentLoaded', loadPaymentInfo);
