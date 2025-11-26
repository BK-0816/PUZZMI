import { createClient } from 'npm:@supabase/supabase-js@2';

const INICIS_SIGN_KEY = 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS';
const LINE_CHANNEL_ACCESS_TOKEN = 'YOUR_LINE_CHANNEL_ACCESS_TOKEN';

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const resultCode = formData.get('resultCode')?.toString();
    const oid = formData.get('MOID')?.toString() || formData.get('oid')?.toString();
    
    console.log('💳 결제 콜백 수신:', { resultCode, oid });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (resultCode === '0000') {
      const authToken = formData.get('authToken')?.toString();
      const authUrl = formData.get('authUrl')?.toString();
      const mid = formData.get('mid')?.toString();
      const timestamp = Date.now();

      const signatureData = `authToken=${authToken}&timestamp=${timestamp}`;
      const signatureBuffer = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(signatureData)
      );
      const signature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const verificationData = `authToken=${authToken}&signKey=${INICIS_SIGN_KEY}&timestamp=${timestamp}`;
      const verificationBuffer = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(verificationData)
      );
      const verification = Array.from(new Uint8Array(verificationBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const authResponse = await fetch(authUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          mid: mid!,
          authToken: authToken!,
          timestamp: timestamp.toString(),
          signature,
          verification,
          charset: 'UTF-8',
          format: 'JSON'
        })
      });

      const authResult = await authResponse.json();
      console.log('✅ 승인 결과:', authResult);

      if (authResult.resultCode === '0000') {
        const { data: payment } = await supabase
          .from('kg_inicis_payments')
          .select('*, bookings!inner(customer_id), user_line_accounts!kg_inicis_payments_user_id_fkey(line_user_id)')
          .eq('oid', oid!)
          .single();

        if (payment) {
          await supabase
            .from('kg_inicis_payments')
            .update({
              payment_status: 'paid',
              paid_at: new Date().toISOString(),
              inicis_tid: authResult.tid,
              inicis_auth_token: authToken,
              inicis_result_code: authResult.resultCode,
              inicis_result_msg: authResult.resultMsg
            })
            .eq('id', payment.id);

          await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', payment.booking_id);

          if (payment.user_line_accounts?.line_user_id) {
            try {
              const lineMessage = {
                to: payment.user_line_accounts.line_user_id,
                messages: [{
                  type: 'text',
                  text: `✅ 결제가 성공적으로 완료되었습니다!\n\n금액: ${payment.amount.toLocaleString()}원\n주문번호: ${oid}\n\nPUZZMI 서비스를 이용해주셔서 감사합니다! 🙏`
                }]
              };

              await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
                },
                body: JSON.stringify(lineMessage)
              });
            } catch (lineError) {
              console.error('LINE 메시지 전송 오류:', lineError);
            }
          }

          return new Response(getSuccessHTML(authResult), {
            headers: { 'Content-Type': 'text/html; charset=UTF-8' }
          });
        }
      }
    }

    const { data: payment } = await supabase
      .from('kg_inicis_payments')
      .select('*')
      .eq('oid', oid!)
      .maybeSingle();

    if (payment) {
      await supabase
        .from('kg_inicis_payments')
        .update({
          payment_status: 'failed',
          inicis_result_code: resultCode,
          inicis_result_msg: formData.get('resultMsg')?.toString() || '결제 실패',
          failed_reason: formData.get('resultMsg')?.toString()
        })
        .eq('id', payment.id);
    }

    return new Response(getFailureHTML(resultCode, formData.get('resultMsg')?.toString()), {
      headers: { 'Content-Type': 'text/html; charset=UTF-8' }
    });

  } catch (error) {
    console.error('콜백 처리 오류:', error);
    return new Response(getErrorHTML(), {
      headers: { 'Content-Type': 'text/html; charset=UTF-8' }
    });
  }
});

function getSuccessHTML(result: any): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>결제 성공</title>
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
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .icon { font-size: 4rem; margin-bottom: 20px; }
    h1 { color: #28a745; margin-bottom: 20px; }
    .info-box {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      margin: 30px 0;
      text-align: left;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .info-row:last-child { border-bottom: none; }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✅</div>
    <h1>결제가 완료되었습니다!</h1>
    <p>결제가 성공적으로 처리되었습니다.</p>
    
    <div class="info-box">
      <div class="info-row">
        <span>거래번호</span>
        <strong>${result.tid}</strong>
      </div>
      <div class="info-row">
        <span>주문번호</span>
        <strong>${result.MOID}</strong>
      </div>
      <div class="info-row">
        <span>결제금액</span>
        <strong>${parseInt(result.TotPrice).toLocaleString()}원</strong>
      </div>
      <div class="info-row">
        <span>결제일시</span>
        <strong>${result.applDate} ${result.applTime}</strong>
      </div>
    </div>
    
    <p style="color: #666;">감사합니다. LINE으로 확인 메시지를 보내드렸습니다.</p>
    <a href="/my_bookings.html" class="btn">내 예약 보기</a>
  </div>
  <script>
    setTimeout(() => { window.close(); }, 3000);
  </script>
</body>
</html>`;
}

function getFailureHTML(code?: string, msg?: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>결제 실패</title>
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
    h1 { color: #dc3545; margin-bottom: 20px; }
    .code { background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="message">
    <h1>❌ 결제가 실패했습니다</h1>
    <p>${msg || '결제 처리 중 오류가 발생했습니다.'}</p>
    ${code ? `<div class="code">오류코드: ${code}</div>` : ''}
    <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px;">닫기</button>
  </div>
</body>
</html>`;
}

function getErrorHTML(): string {
  return getFailureHTML(undefined, '시스템 오류가 발생했습니다.');
}