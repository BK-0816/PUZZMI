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
          .select('*, bookings!inner(customer_id, date, start_time, duration_hours, customer_name), user_line_accounts!kg_inicis_payments_user_id_fkey(line_user_id), profiles!kg_inicis_payments_user_id_fkey(email, full_name)')
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
            .update({
              status: 'confirmed',
              payment_status: 'paid',
              payment_id: authResult.tid
            })
            .eq('id', payment.booking_id);

          const booking = payment.bookings;
          const paidAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
          const bookingDate = new Date(booking.date).toLocaleDateString('ko-KR');
          const bookingTime = booking.start_time || 'N/A';

          if (payment.user_line_accounts?.line_user_id) {
            try {
              const lineMessage = {
                to: payment.user_line_accounts.line_user_id,
                messages: [{
                  type: 'flex',
                  altText: `✅ 결제 완료 - ${payment.amount.toLocaleString()}원`,
                  contents: {
                    type: 'bubble',
                    hero: {
                      type: 'box',
                      layout: 'vertical',
                      contents: [{
                        type: 'text',
                        text: '✅ 결제 완료',
                        weight: 'bold',
                        size: 'xl',
                        align: 'center',
                        color: '#28a745'
                      }],
                      paddingAll: '20px',
                      backgroundColor: '#f8f9fa'
                    },
                    body: {
                      type: 'box',
                      layout: 'vertical',
                      contents: [
                        {
                          type: 'text',
                          text: '영수증',
                          weight: 'bold',
                          size: 'lg',
                          margin: 'md'
                        },
                        {
                          type: 'separator',
                          margin: 'lg'
                        },
                        {
                          type: 'box',
                          layout: 'vertical',
                          margin: 'lg',
                          spacing: 'sm',
                          contents: [
                            {
                              type: 'box',
                              layout: 'baseline',
                              spacing: 'sm',
                              contents: [
                                { type: 'text', text: '결제 금액', color: '#666666', size: 'sm', flex: 2 },
                                { type: 'text', text: `${payment.amount.toLocaleString()}원`, wrap: true, color: '#333333', size: 'md', flex: 3, weight: 'bold' }
                              ]
                            },
                            {
                              type: 'box',
                              layout: 'baseline',
                              spacing: 'sm',
                              contents: [
                                { type: 'text', text: '거래번호', color: '#666666', size: 'sm', flex: 2 },
                                { type: 'text', text: authResult.tid, wrap: true, color: '#333333', size: 'sm', flex: 3 }
                              ]
                            },
                            {
                              type: 'box',
                              layout: 'baseline',
                              spacing: 'sm',
                              contents: [
                                { type: 'text', text: '주문번호', color: '#666666', size: 'sm', flex: 2 },
                                { type: 'text', text: oid, wrap: true, color: '#333333', size: 'sm', flex: 3 }
                              ]
                            },
                            {
                              type: 'box',
                              layout: 'baseline',
                              spacing: 'sm',
                              contents: [
                                { type: 'text', text: '결제일시', color: '#666666', size: 'sm', flex: 2 },
                                { type: 'text', text: paidAt, wrap: true, color: '#333333', size: 'sm', flex: 3 }
                              ]
                            },
                            {
                              type: 'separator',
                              margin: 'lg'
                            },
                            {
                              type: 'text',
                              text: '예약 정보',
                              weight: 'bold',
                              size: 'md',
                              margin: 'lg'
                            },
                            {
                              type: 'box',
                              layout: 'baseline',
                              spacing: 'sm',
                              contents: [
                                { type: 'text', text: '예약 날짜', color: '#666666', size: 'sm', flex: 2 },
                                { type: 'text', text: bookingDate, wrap: true, color: '#333333', size: 'sm', flex: 3 }
                              ]
                            },
                            {
                              type: 'box',
                              layout: 'baseline',
                              spacing: 'sm',
                              contents: [
                                { type: 'text', text: '시작 시간', color: '#666666', size: 'sm', flex: 2 },
                                { type: 'text', text: bookingTime, wrap: true, color: '#333333', size: 'sm', flex: 3 }
                              ]
                            },
                            {
                              type: 'box',
                              layout: 'baseline',
                              spacing: 'sm',
                              contents: [
                                { type: 'text', text: '이용 시간', color: '#666666', size: 'sm', flex: 2 },
                                { type: 'text', text: `${booking.duration_hours}시간`, wrap: true, color: '#333333', size: 'sm', flex: 3 }
                              ]
                            }
                          ]
                        }
                      ],
                      paddingAll: '20px'
                    },
                    footer: {
                      type: 'box',
                      layout: 'vertical',
                      contents: [
                        {
                          type: 'text',
                          text: 'PUZZMI를 이용해주셔서 감사합니다! 🙏',
                          size: 'xs',
                          color: '#999999',
                          align: 'center'
                        }
                      ],
                      paddingAll: '12px'
                    }
                  }
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
              console.log('✅ LINE 영수증 전송 완료');
            } catch (lineError) {
              console.error('LINE 메시지 전송 오류:', lineError);
            }
          }

          if (payment.profiles?.email && payment.buyer_email) {
            try {
              const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 2rem; }
    .content { padding: 40px; }
    .receipt-box { background: #f8f9fa; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .receipt-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e9ecef; }
    .receipt-row:last-child { border-bottom: none; }
    .label { color: #666; font-weight: 500; }
    .value { color: #333; font-weight: 600; text-align: right; }
    .amount { font-size: 1.5rem; color: #28a745; font-weight: 700; }
    .section-title { font-size: 1.2rem; font-weight: 700; margin: 24px 0 16px 0; color: #333; }
    .footer { background: #f8f9fa; padding: 24px; text-align: center; color: #666; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ 결제 완료</h1>
      <p>PUZZMI 서비스 이용 감사합니다</p>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>${payment.profiles.full_name || booking.customer_name}</strong>님!</p>
      <p>결제가 성공적으로 완료되었습니다. 아래 영수증을 확인해주세요.</p>

      <div class="receipt-box">
        <div class="section-title">결제 정보</div>
        <div class="receipt-row">
          <span class="label">결제 금액</span>
          <span class="value amount">${payment.amount.toLocaleString()}원</span>
        </div>
        <div class="receipt-row">
          <span class="label">거래번호</span>
          <span class="value">${authResult.tid}</span>
        </div>
        <div class="receipt-row">
          <span class="label">주문번호</span>
          <span class="value">${oid}</span>
        </div>
        <div class="receipt-row">
          <span class="label">결제일시</span>
          <span class="value">${paidAt}</span>
        </div>

        <div class="section-title">예약 정보</div>
        <div class="receipt-row">
          <span class="label">예약 날짜</span>
          <span class="value">${bookingDate}</span>
        </div>
        <div class="receipt-row">
          <span class="label">시작 시간</span>
          <span class="value">${bookingTime}</span>
        </div>
        <div class="receipt-row">
          <span class="label">이용 시간</span>
          <span class="value">${booking.duration_hours}시간</span>
        </div>
        <div class="receipt-row">
          <span class="label">예약자명</span>
          <span class="value">${booking.customer_name}</span>
        </div>
      </div>

      <p style="color: #666; font-size: 0.9rem; margin-top: 24px;">
        문의사항이 있으시면 언제든지 연락주세요.<br>
        즐거운 서울 여행 되시기 바랍니다! 🎉
      </p>
    </div>
    <div class="footer">
      © PUZZMI - 서울 렌탈친구 서비스<br>
      본 메일은 발신 전용입니다.
    </div>
  </div>
</body>
</html>`;

              const { data: emailFunction, error: emailError } = await supabase.functions.invoke('email-verification', {
                body: {
                  to: payment.buyer_email,
                  subject: `[PUZZMI] 결제 완료 - ${payment.amount.toLocaleString()}원`,
                  html: emailHtml
                }
              });

              if (emailError) {
                console.error('이메일 발송 오류:', emailError);
              } else {
                console.log('✅ 이메일 영수증 전송 완료');
              }
            } catch (emailError) {
              console.error('이메일 발송 실패:', emailError);
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
