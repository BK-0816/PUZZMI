import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const LINE_CHANNEL_ACCESS_TOKEN = 'YOUR_LINE_CHANNEL_ACCESS_TOKEN';

interface SendNotificationRequest {
  userId: string;
  bookingId: number;
  type: 'passport_verification' | 'payment_request';
  passportVerificationUrl?: string;
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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, bookingId, type, passportVerificationUrl, paymentUrl, amount }: SendNotificationRequest = await req.json();

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
    if (type === 'passport_verification') {
      message = {
        type: 'flex',
        altText: '🛂 PUZZMI - 여권 인증 요청',
        contents: {
          type: 'bubble',
          hero: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '🛂 여권 인증',
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
                text: '예약하신 서비스를 이용하시려면 여권 인증이 필요합니다.',
                wrap: true,
                size: 'md',
                margin: 'md'
              },
              {
                type: 'text',
                text: '아래 버튼을 눌러 여권 사진을 업로드해주세요.',
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
                      label: '✅ 여권 인증하기',
                      uri: passportVerificationUrl
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
                text: '아래 버튼을 눌러 안전하게 결제를 진행해주세요.',
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