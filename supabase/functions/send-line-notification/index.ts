import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// LINE 설정은 Supabase Secret에서 가져옴 (fallback으로 하드코딩된 토큰 사용)
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') || 'f2oNcXpy05dyx5oLEE95RNnl17qqHNLD7gUWA9ipEyPsfF/qf2t7UfG2Op0NKJBL0UJwb6uuXyg7e6nd5scu7odozNFUpQ9uK7bBBp8mZjCLUdUFDIvfC1LMWDPaFQ3xjJ1DeQPHRk1X+AwM3Nkg1wdB04t89/1O/w1cDnyilFU=';

interface SendNotificationRequest {
  userId: string;
  bookingId?: number;
  type: 'passport_verification' | 'payment_request' | 'identity_verification_request';
  passportVerificationUrl?: string;
  uploadUrl?: string;
  paymentUrl?: string;
  amount?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
    }

    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN 또는 LINE_CHANNEL_SECRET이 설정되지 않았습니다.');
    }

    console.log('🔑 LINE 토큰 확인:', LINE_CHANNEL_ACCESS_TOKEN ? '설정됨' : '미설정');
    console.log('🔍 토큰 길이:', LINE_CHANNEL_ACCESS_TOKEN?.length);
    console.log('🔍 토큰 시작:', LINE_CHANNEL_ACCESS_TOKEN?.substring(0, 30) + '...');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, bookingId, type, passportVerificationUrl, uploadUrl, paymentUrl, amount }: SendNotificationRequest = await req.json();

    console.log('📨 LINE 메시지 발송 요청:', { userId, bookingId, type });

    const { data: lineAccount, error: lineError } = await supabase
      .from('user_line_accounts')
      .select('line_user_id, line_display_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (lineError || !lineAccount) {
      throw new Error('LINE 계정이 연동되지 않았습니다.');
    }

    console.log('✅ LINE 계정 찾음:', lineAccount.line_display_name);

    let message;
    if (type === 'passport_verification' || type === 'identity_verification_request') {
      const verificationUrl = uploadUrl || passportVerificationUrl;
      message = {
        type: 'flex',
        altText: '🛂 PUZZMI - 本人認証リクエスト',
        contents: {
          type: 'bubble',
          hero: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '🛂 本人認証',
                weight: 'bold',
                size: 'xl',
                align: 'center',
                color: '#667eea'
              }
            ],
            paddingAll: '20px',
            backgroundColor: '#f8f9fa'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: 'サービスをご利用いただくには本人認証が必要です。',
                wrap: true,
                size: 'md',
                margin: 'md'
              },
              {
                type: 'text',
                text: '下のボタンからパスポート写真をアップロードしてください。',
                wrap: true,
                size: 'sm',
                color: '#999999',
                margin: 'md'
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'button',
                    action: {
                      type: 'uri',
                      label: '✅ パスポートをアップロード',
                      uri: verificationUrl
                    },
                    style: 'primary',
                    color: '#667eea'
                  }
                ],
                margin: 'lg'
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
                text: '© PUZZMI - 서울 렌탈친구 서비스',
                size: 'xs',
                color: '#999999',
                align: 'center'
              }
            ],
            paddingAll: '12px'
          }
        }
      };
    } else if (type === 'payment_request') {
      message = {
        type: 'flex',
        altText: `💳 PUZZMI - 결제 요청 (${amount?.toLocaleString()}원)`,
        contents: {
          type: 'bubble',
          hero: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '💳 결제 요청',
                weight: 'bold',
                size: 'xl',
                align: 'center',
                color: '#667eea'
              }
            ],
            paddingAll: '20px',
            backgroundColor: '#f8f9fa'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: `결제 금액: ${amount?.toLocaleString()}원`,
                weight: 'bold',
                size: 'lg',
                margin: 'md',
                color: '#333333'
              },
              {
                type: 'text',
                text: '예약 ID: #' + bookingId,
                size: 'sm',
                color: '#999999',
                margin: 'sm'
              },
              {
                type: 'separator',
                margin: 'lg'
              },
              {
                type: 'text',
                text: '아래 버튼을 누르대 안전하게 결제를 진행해주세요.',
                wrap: true,
                size: 'sm',
                color: '#666666',
                margin: 'lg'
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'button',
                    action: {
                      type: 'uri',
                      label: '💳 결제하기',
                      uri: paymentUrl
                    },
                    style: 'primary',
                    color: '#667eea'
                  }
                ],
                margin: 'lg'
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
                text: 'KG이니시스 안전결제',
                size: 'xs',
                color: '#999999',
                align: 'center'
              },
              {
                type: 'text',
                text: '© PUZZMI',
                size: 'xs',
                color: '#999999',
                align: 'center',
                margin: 'xs'
              }
            ],
            paddingAll: '12px'
          }
        }
      };
    } else {
      throw new Error('지원하지 않는 메시지 타입입니다.');
    }

    console.log('📤 LINE API 호출 중...');

    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: lineAccount.line_user_id,
        messages: [message]
      }),
    });

    if (!lineResponse.ok) {
      const errorData = await lineResponse.text();
      console.error('❌ LINE API 오류:', errorData);
      throw new Error(`LINE API 오류: ${lineResponse.status} - ${errorData}`);
    }

    console.log('✅ LINE 메시지 전송 성공');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'LINE 메시지가 성공적으로 전송되었습니다.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ LINE 메시지 발송 오류:', error);
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