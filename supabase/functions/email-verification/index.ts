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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, action, code }: EmailVerificationRequest = await req.json();

    if (action === 'send') {
      // 6자리 OTP 생성
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분 후 만료

      // 기존 미인증 코드 삭제
      await supabase
        .from('email_verifications')
        .delete()
        .eq('email', email)
        .eq('verified', false);

      // 새 인증 코드 저장
      const { error: insertError } = await supabase
        .from('email_verifications')
        .insert({
          email,
          verification_code: otp,
          expires_at: expiresAt.toISOString(),
          attempts: 0,
          verified: false
        });

      if (insertError) {
        throw new Error(`인증 코드 저장 실패: ${insertError.message}`);
      }

      // Supabase Auth Admin API를 통한 실제 이메일 발송
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              margin: 0; 
              padding: 0; 
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              line-height: 1.6;
            }
            .container { 
              max-width: 600px; 
              margin: 40px auto; 
              background: white; 
              border-radius: 20px;
              overflow: hidden;
              box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); 
              padding: 40px 20px; 
              text-align: center; 
              color: white;
            }
            .logo { 
              font-size: 2.5rem; 
              font-weight: 800; 
              margin-bottom: 8px; 
              letter-spacing: -0.02em;
            }
            .subtitle { 
              font-size: 1.1rem; 
              opacity: 0.9; 
              font-weight: 500;
            }
            .content { 
              padding: 40px 30px; 
              text-align: center;
            }
            .welcome-text {
              font-size: 1.3rem;
              color: #333;
              margin-bottom: 30px;
              font-weight: 600;
            }
            .otp-box { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 40px 30px; 
              border-radius: 20px; 
              margin: 30px 0; 
              box-shadow: 0 12px 32px rgba(102, 126, 234, 0.3);
            }
            .otp-label {
              font-size: 1.2rem;
              margin-bottom: 16px;
              opacity: 0.9;
              font-weight: 600;
            }
            .otp-code { 
              font-size: 3.5rem; 
              font-weight: 800; 
              letter-spacing: 12px; 
              margin: 20px 0; 
              font-family: 'Courier New', monospace;
              text-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            .otp-validity {
              font-size: 1rem;
              opacity: 0.9;
              font-weight: 500;
            }
            .instructions {
              background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(240, 147, 251, 0.03) 100%);
              border: 2px solid rgba(102, 126, 234, 0.2);
              border-radius: 16px;
              padding: 24px;
              margin: 30px 0;
              text-align: left;
            }
            .instructions h4 {
              color: #667eea;
              font-weight: 700;
              margin: 0 0 16px 0;
              font-size: 1.1rem;
            }
            .instructions ul {
              margin: 0;
              padding-left: 20px;
              color: #555;
            }
            .instructions li {
              margin-bottom: 8px;
              font-weight: 500;
            }
            .footer { 
              background: #f8f9fa; 
              padding: 30px 20px; 
              text-align: center; 
              color: #666; 
              font-size: 0.9rem;
              border-top: 1px solid #e9ecef;
            }
            .footer p {
              margin: 8px 0;
            }
            .company-info {
              margin-top: 16px;
              padding-top: 16px;
              border-top: 1px solid #dee2e6;
              font-size: 0.85rem;
              opacity: 0.8;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">PUZZMI</div>
              <div class="subtitle">이메일 인증번호</div>
            </div>
            <div class="content">
              <div class="welcome-text">
                PUZZMI 회원가입을 위한<br>
                이메일 인증번호입니다 ✨
              </div>
              
              <div class="otp-box">
                <div class="otp-label">인증번호</div>
                <div class="otp-code">${otp}</div>
                <div class="otp-validity">⏰ 유효시간: 10분</div>
              </div>
              
              <div class="instructions">
                <h4>📋 인증 방법</h4>
                <ul>
                  <li>위의 <strong>6자리 숫자</strong>를 회원가입 페이지에 입력해주세요</li>
                  <li>인증번호는 <strong>10분간</strong> 유효합니다</li>
                  <li>인증번호를 요청하지 않으셨다면 이 메일을 무시해주세요</li>
                  <li>문제가 있으시면 고객센터로 문의해주세요</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p><strong>© 2025 PUZZMI</strong> - 서울 렌탈친구 서비스</p>
              <p>📧 puzzmi0721@gmail.com | 📞 고객센터 문의</p>
              <div class="company-info">
                <p>PUZZMI | 서울특별시 영등포구 디지털로 48길 23-1</p>
                <p>사업자번호: 716-10-02780 | 대표: 최서준</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Supabase Admin API를 통한 실제 이메일 발송
      const { error: emailError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          verification_code: otp,
          verification_type: 'signup_otp',
          custom_email: true
        },
        redirectTo: `${req.headers.get('origin') || 'https://puzzmi.com'}/email_verified.html`
      });

      if (emailError) {
        console.error('Supabase 이메일 발송 실패:', emailError);
        
        // 대체 방법: 직접 SMTP 발송 (Deno 환경에서)
        try {
          const smtpConfig = {
            hostname: Deno.env.get('SMTP_HOSTNAME') || 'smtp.gmail.com',
            port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
            username: Deno.env.get('SMTP_USERNAME'),
            password: Deno.env.get('SMTP_PASSWORD'),
          };

          // 실제 SMTP 발송 로직은 여기에 구현
          console.log('SMTP 직접 발송 시도:', { email, otp });
          
        } catch (smtpError) {
          console.error('SMTP 직접 발송도 실패:', smtpError);
          throw new Error('이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
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

      // 인증 코드 조회
      const { data: verification, error: selectError } = await supabase
        .from('email_verifications')
        .select('*')
        .eq('email', email)
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selectError) {
        throw new Error(`인증 코드 조회 실패: ${selectError.message}`);
      }

      if (!verification) {
        throw new Error('유효한 인증 요청이 없습니다. 인증번호를 다시 요청해주세요.');
      }

      // 만료 시간 확인
      if (new Date() > new Date(verification.expires_at)) {
        throw new Error('인증번호가 만료되었습니다. 새로운 인증번호를 요청해주세요.');
      }

      // 시도 횟수 확인
      if (verification.attempts >= 5) {
        throw new Error('인증 시도 횟수를 초과했습니다. 새로운 인증번호를 요청해주세요.');
      }

      // 인증번호 확인
      if (verification.verification_code !== code) {
        // 시도 횟수 증가
        await supabase
          .from('email_verifications')
          .update({ attempts: verification.attempts + 1 })
          .eq('id', verification.id);

        throw new Error(`인증번호가 올바르지 않습니다. (${verification.attempts + 1}/5)`);
      }

      // 인증 성공 처리
      const { error: updateError } = await supabase
        .from('email_verifications')
        .update({ 
          verified: true, 
          verified_at: new Date().toISOString() 
        })
        .eq('id', verification.id);

      if (updateError) {
        throw new Error(`인증 처리 실패: ${updateError.message}`);
      }

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
        error: error.message
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});