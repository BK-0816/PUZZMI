import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface LineTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

interface LineProfileResponse {
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    // LINE API 설정 (환경변수에서 가져오기)
    const LINE_CHANNEL_ID = Deno.env.get('LINE_CHANNEL_ID')
    const LINE_CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET')
    
    if (!LINE_CHANNEL_ID || !LINE_CHANNEL_SECRET) {
      console.error('LINE API 환경변수 누락:', { 
        hasChannelId: !!LINE_CHANNEL_ID, 
        hasChannelSecret: !!LINE_CHANNEL_SECRET 
      })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'LINE API 설정이 없습니다. Supabase Secrets에서 LINE_CHANNEL_ID와 LINE_CHANNEL_SECRET을 확인해주세요.' 
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }

    switch (action) {
      case 'generate-url': {
        // LINE OAuth URL 생성
        const { userId } = await req.json()
        
        // Netlify 배포 환경에 맞춘 콜백 URL
        const callbackUrl = 'https://puzzmi.netlify.app/line_callback.html'
        const state = btoa(JSON.stringify({ 
          userId, 
          timestamp: Date.now(),
          origin: 'https://puzzmi.netlify.app'
        }))
        
        const params = new URLSearchParams({
          response_type: 'code',
          client_id: LINE_CHANNEL_ID,
          redirect_uri: callbackUrl,
          state: state,
          scope: 'profile openid email'
        })
        
        const lineUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
        
        console.log('생성된 LINE URL:', lineUrl)
        console.log('Callback URL:', callbackUrl)
        console.log('사용된 파라미터:', {
          client_id: LINE_CHANNEL_ID,
          redirect_uri: callbackUrl,
          state: state,
          scope: 'profile openid email'
        })
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            loginUrl: lineUrl,
            callbackUrl 
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
      }

      case 'exchange-token': {
        // Authorization Code를 Access Token으로 교환
        const { code, callbackUrl } = await req.json()
        
        const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: callbackUrl,
            client_id: LINE_CHANNEL_ID,
            client_secret: LINE_CHANNEL_SECRET
          })
        })
        
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text()
          console.error('LINE 토큰 교환 실패:', {
            status: tokenResponse.status,
            error: errorText,
            code: code,
            callbackUrl: callbackUrl
          })
          throw new Error(`토큰 교환 실패: ${tokenResponse.status} - ${errorText}`)
        }
        
        const tokenData: LineTokenResponse = await tokenResponse.json()
        console.log('토큰 교환 성공:', { 
          hasAccessToken: !!tokenData.access_token,
          tokenType: tokenData.token_type 
        })
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            tokenData 
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
      }

      case 'get-profile': {
        // Access Token으로 사용자 프로필 조회
        const { accessToken } = await req.json()
        
        const profileResponse = await fetch('https://api.line.me/v2/profile', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })
        
        if (!profileResponse.ok) {
          throw new Error(`프로필 조회 실패: ${profileResponse.status}`)
        }
        
        const profileData: LineProfileResponse = await profileResponse.json()
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            profile: profileData 
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
      }

      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: '지원하지 않는 액션입니다.' 
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
    }

  } catch (error) {
    console.error('LINE Auth Error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
})