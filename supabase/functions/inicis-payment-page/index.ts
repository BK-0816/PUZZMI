import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const INICIS_MID = 'INIpayTest';
const INICIS_SIGN_KEY = 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.pathname.split('/').pop();

    if (!token) {
      return new Response('Invalid payment link', { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: payment, error } = await supabase
      .from('kg_inicis_payments')
      .select('*, bookings!inner(*)')
      .eq('payment_token', token)
      .maybeSingle();

    if (error || !payment) {
      return new Response('Payment not found', { status: 404 });
    }

    if (payment.payment_status === 'paid') {
      return new Response(getAlreadyPaidHTML(), {
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
          'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline';",
        },
      });
    }

    const baseUrl = supabaseUrl.replace('.supabase.co', '.supabase.co');
    const returnUrl = `${baseUrl}/functions/v1/inicis-payment-callback`;
    const closeUrl = `${baseUrl}/functions/v1/inicis-payment-close`;

    const html = getPaymentHTML({
      mid: INICIS_MID,
      oid: payment.oid,
      price: payment.amount.toString(),
      timestamp: payment.inicis_timestamp?.toString() || '',
      signature: payment.inicis_signature || '',
      verification: payment.inicis_verification || '',
      mKey: payment.metadata?.mKey || '',
      goodname: payment.good_name || '렌탈친구 서비스',
      buyername: payment.buyer_name || '',
      buyertel: payment.buyer_tel || '',
      buyeremail: payment.buyer_email || '',
      returnUrl,
      closeUrl,
    });

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=UTF-8',
        'Content-Security-Policy': "default-src 'self'; script-src 'unsafe-inline' 'unsafe-eval' https://stgstdpay.inicis.com; style-src 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://stgstdpay.inicis.com; frame-src https://stgstdpay.inicis.com;",
      },
    });
  } catch (error) {
    console.error('Payment page error:', error);
    return new Response('Internal server error', { status: 500 });
  }
});

function getPaymentHTML(params: any): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PUZZMI - 결제하기</title>
  <script language="javascript" type="text/javascript" src="https://stgstdpay.inicis.com/stdjs/INIStdPay.js" charset="UTF-8"></script>
  <script>
    // LINE WebView 감지
    function isLineApp() {
      return /Line/i.test(navigator.userAgent);
    }

    // 외부 브라우저로 열기 안내
    if (isLineApp()) {
      document.addEventListener('DOMContentLoaded', function() {
        var btn = document.querySelector('.btn-pay');
        if (btn) {
          btn.textContent = '⚠️ 외부 브라우저에서 열어주세요';
          btn.onclick = function() {
            alert('LINE 앱에서는 결제가 불가능합니다.\\n\\n오른쪽 상단 [...] 메뉴를 누르고\\n"외부 브라우저에서 열기"를 선택해주세요.');
            return false;
          };
        }
      });
    }
  </script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 24px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      text-align: center;
      color: #667eea;
      margin-bottom: 30px;
      font-size: 2rem;
    }
    .info-box {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #666; }
    .info-value { font-weight: 600; color: #333; }
    .btn-pay {
      width: 100%;
      padding: 18px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 1.2rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .btn-pay:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
    }
    .secure-badge {
      text-align: center;
      margin-top: 20px;
      color: #28a745;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>💳 결제하기</h1>
    
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">주문번호</span>
        <span class="info-value">${params.oid}</span>
      </div>
      <div class="info-row">
        <span class="info-label">상품명</span>
        <span class="info-value">${params.goodname}</span>
      </div>
      <div class="info-row">
        <span class="info-label">결제금액</span>
        <span class="info-value" style="color: #667eea; font-size: 1.3rem;">${parseInt(params.price).toLocaleString()}원</span>
      </div>
    </div>

    <form name="SendPayForm_id" id="SendPayForm_id" method="post">
      <input type="hidden" name="version" value="1.0">
      <input type="hidden" name="gopaymethod" value="Card:VBank">
      <input type="hidden" name="mid" value="${params.mid}">
      <input type="hidden" name="oid" value="${params.oid}">
      <input type="hidden" name="price" value="${params.price}">
      <input type="hidden" name="timestamp" value="${params.timestamp}">
      <input type="hidden" name="use_chkfake" value="Y">
      <input type="hidden" name="signature" value="${params.signature}">
      <input type="hidden" name="verification" value="${params.verification}">
      <input type="hidden" name="mKey" value="${params.mKey}">
      <input type="hidden" name="currency" value="WON">
      <input type="hidden" name="goodname" value="${params.goodname}">
      <input type="hidden" name="buyername" value="${params.buyername}">
      <input type="hidden" name="buyertel" value="${params.buyertel}">
      <input type="hidden" name="buyeremail" value="${params.buyeremail}">
      <input type="hidden" name="returnUrl" value="${params.returnUrl}">
      <input type="hidden" name="closeUrl" value="${params.closeUrl}">
      <input type="hidden" name="acceptmethod" value="below1000">
    </form>

    <button type="button" class="btn-pay" onclick="INIStdPay.pay('SendPayForm_id')">
      🔒 안전결제 실행
    </button>

    <div class="secure-badge">
      ✅ KG이니시스 안전결제
    </div>
  </div>
</body>
</html>`;
}

function getAlreadyPaidHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>결제 완료</title>
  <style>
    body {
      font-family: sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f8f9fa;
      text-align: center;
    }
    .message {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }
    h1 { color: #28a745; }
  </style>
</head>
<body>
  <div class="message">
    <h1>✅ 결제가 이미 완료되었습니다</h1>
    <p>이 결제는 이미 처리되었습니다.</p>
  </div>
</body>
</html>`;
}
