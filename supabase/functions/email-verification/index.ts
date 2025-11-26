import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmailVerificationRequest {
  email: string;
  action: 'send' | 'verify';
  code?: string;
}

const RESEND_API_KEY = 're_CKSF4GHU_sbmBaFkK3bxCvxLS1e351Cvg';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlValue: supabaseUrl || 'NOT_SET'
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Supabase 환경변수가 설정되지 않았습니다.',
          debug: {
            hasUrl: !!supabaseUrl,
            hasServiceKey: !!supabaseServiceKey
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, action, code }: EmailVerificationRequest = await req.json();
    
    console.log('Request received:', { email, action, hasCode: !!code });

    if (action === 'send') {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      console.log('Generated OTP:', { otp, expiresAt: expiresAt.toISOString() });

      const { error: deleteError } = await supabase
        .from('email_verifications')
        .delete()
        .eq('email', email)
        .eq('verified', false);

      if (deleteError) {
        console.error('Delete old codes error:', deleteError);
      }

      const { data: insertData, error: insertError } = await supabase
        .from('email_verifications')
        .insert({
          email,
          verification_code: otp,
          expires_at: expiresAt.toISOString(),
          attempts: 0,
          verified: false
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert verification code error:', insertError);
        throw new Error(`인증 코드 저장 실패: ${insertError.message}`);
      }

      console.log('Verification code saved:', insertData);

      try {
        console.log('Sending email via Resend...');

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                margin: 0; padding: 0;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                line-height: 1.6;
              }
              .container {
                max-width: 600px; margin: 40px auto;
                background: white; border-radius: 20px;
                overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.1);
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
                padding: 40px 20px; text-align: center; color: white;
              }
              .logo { font-size: 2.5rem; font-weight: 800; margin-bottom: 8px; }
              .subtitle { font-size: 1.1rem; opacity: 0.9; }
              .content { padding: 40px 30px; text-align: center; }
              .welcome-text { font-size: 1.3rem; color: #333; margin-bottom: 30px; font-weight: 600; }
              .otp-box {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; padding: 40px 30px; border-radius: 20px;
                margin: 30px 0; box-shadow: 0 12px 32px rgba(102, 126, 234, 0.3);
              }
              .otp-code {
                font-size: 3.5rem; font-weight: 800; letter-spacing: 12px;
                margin: 20px 0; font-family: 'Courier New', monospace;
              }
              .info-box {
                background: rgba(102, 126, 234, 0.05);
                border: 2px solid rgba(102, 126, 234, 0.2);
                border-radius: 16px;
                padding: 24px;
                margin: 30px 0;
                text-align: left;
              }
              .footer {
                background: #f8f9fa; padding: 30px 20px;
                text-align: center; color: #666; font-size: 0.9rem;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🧩 PUZZMI</div>
                <div class="subtitle">이메일 인증번호</div>
              </div>
              <div class="content">
                <div class="welcome-text">
                  PUZZMI 회원가입을 위한<br>이메일 인증번호입니다 ✨
                </div>
                <div class="otp-box">
                  <div style="font-size: 1.2rem; margin-bottom: 16px;">인증번호</div>
                  <div class="otp-code">${otp}</div>
                  <div style="font-size: 1rem; opacity: 0.9;">⏰ 유효시간: 10분</div>
                </div>
                <div class="info-box">
                  <h4 style="color: #667eea; margin: 0 0 16px 0;">📋 인증 방법</h4>
                  <ul style="margin: 0; padding-left: 20px; color: #555;">
                    <li>위의 <strong>6자리 숫자</strong>를 회원가입 페이지에 입력해주세요</li>
                    <li>인증번호는 <strong>10분간</strong> 유효합니다</li>
                    <li>인증번호를 요청하지 않으셨다면 이 메일을 무시해주세요</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p><strong>© 2025 PUZZMI</strong> - 서울 렌탈친구 서비스</p>
                <p>📧 puzzmi0721@gmail.com</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'PUZZMI <onboarding@resend.dev>',
            to: [email],
            subject: '[PUZZMI] 이메일 인증번호를 확인해주세요',
            html: emailHtml,
          }),
        });

        if (!resendResponse.ok) {
          const errorData = await resendResponse.text();
          console.error('Resend API error:', errorData);
          throw new Error(`Resend API 오류: ${resendResponse.status} - ${errorData}`);
        }

        const resendData = await resendResponse.json();
        console.log('Email sent successfully via Resend:', resendData);

      } catch (emailSendError) {
        console.error('Email sending failed:', emailSendError);

        return new Response(
          JSON.stringify({
            success: false,
            error: '이메일 발송에 실패했습니다.',
            debug: {
              emailError: emailSendError.message,
              suggestion: 'Resend API 키를 확인해주세요.'
            }
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: '인증번호가 이메일로 발송되었습니다.',
          expiresAt: expiresAt.toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } else if (action === 'verify') {
      if (!code) {
        throw new Error('인증번호를 입력해주세요.');
      }

      console.log('Verifying code:', { email, code });

      const { data: verification, error: selectError } = await supabase
        .from('email_verifications')
        .select('*')
        .eq('email', email)
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selectError) {
        console.error('Select verification error:', selectError);
        throw new Error(`인증 코드 조회 실패: ${selectError.message}`);
      }

      if (!verification) {
        console.log('No verification found for email:', email);
        throw new Error('유효한 인증 요청이 없습니다. 인증번호를 다시 요청해주세요.');
      }

      console.log('Found verification:', {
        id: verification.id,
        code: verification.verification_code,
        expires: verification.expires_at,
        attempts: verification.attempts
      });

      if (new Date() > new Date(verification.expires_at)) {
        console.log('Verification expired');
        throw new Error('인증번호가 만료되었습니다. 새로운 인증번호를 요청해주세요.');
      }

      if (verification.attempts >= 5) {
        console.log('Too many attempts');
        throw new Error('인증 시도 횟수를 초과했습니다. 새로운 인증번호를 요청해주세요.');
      }

      if (verification.verification_code !== code) {
        console.log('Code mismatch:', {
          expected: verification.verification_code,
          received: code
        });
        
        await supabase
          .from('email_verifications')
          .update({ attempts: verification.attempts + 1 })
          .eq('id', verification.id);

        throw new Error(`인증번호가 올바르지 않습니다. (${verification.attempts + 1}/5)`);
      }

      const { error: updateError } = await supabase
        .from('email_verifications')
        .update({ 
          verified: true, 
          verified_at: new Date().toISOString() 
        })
        .eq('id', verification.id);

      if (updateError) {
        console.error('Update verification error:', updateError);
        throw new Error(`인증 처리 실패: ${updateError.message}`);
      }

      console.log('Verification successful');

      return new Response(
        JSON.stringify({
          success: true,
          message: '이메일 인증이 완료되었습니다.',
          verificationId: verification.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('지원하지 않는 액션입니다.');

  } catch (error) {
    console.error('Email verification error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});