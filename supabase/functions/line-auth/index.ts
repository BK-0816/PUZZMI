import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Supabase 클라이언트 초기화
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // LINE API 설정 (환경변수에서 가져오기)
    const LINE_CHANNEL_ID = Deno.env.get('LINE_CHANNEL_ID')
    const LINE_CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET')
    
    // 환경변수 확인
    if (!LINE_CHANNEL_ID || !LINE_CHANNEL_SECRET) {
      console.error('LINE API 환경변수 누락:', { 
        hasChannelId: !!LINE_CHANNEL_ID, 
        hasChannelSecret: !!LINE_CHANNEL_SECRET 
      })
      
      // 개발 환경에서는 시뮬레이션 모드로 처리
      const isDevelopment = !LINE_CHANNEL_ID || LINE_CHANNEL_ID === 'YOUR_LINE_CHANNEL_ID_HERE'
      
      if (isDevelopment) {
        console.log('개발 환경 감지 - 시뮬레이션 모드 활성화')
        return new Response(
          JSON.stringify({ 
            success: true, 
            simulation: true,
            message: 'LINE API 키가 설정되지 않아 시뮬레이션 모드로 실행됩니다.'
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'LINE API 설정이 없습니다. 관리자에게 문의해주세요.' 
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
    
    // Authorization 헤더에서 JWT 토큰 추출
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: '인증이 필요합니다' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // JWT 토큰으로 사용자 인증
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: '유효하지 않은 인증 토큰입니다' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    // 현재 배포 환경에 따른 콜백 URL 결정
    const getCallbackUrl = () => {
      const referer = req.headers.get('referer') || req.headers.get('origin')
      console.log('Referer 헤더:', referer)
      
      // 환경별 콜백 URL 매핑
      if (referer?.includes('bolt.new')) {
        return `${referer.split('/').slice(0, 3).join('/')}/line_callback.html`
      } else if (referer?.includes('netlify.app')) {
        return 'https://puzzmi.netlify.app/line_callback.html'
      } else if (referer?.includes('localhost')) {
        return 'http://localhost:3000/line_callback.html'
      } else {
        // 기본값 (운영 환경)
        return 'https://puzzmi.netlify.app/line_callback.html'
      }
    }

    switch (action) {
      case 'generate-url': {
        // LINE OAuth URL 생성
        const userId = user.id // 서버에서 인증된 사용자 ID 사용
        const callbackUrl = getCallbackUrl()
        
        console.log('LINE URL 생성:', {
          userId,
          callbackUrl,
          channelId: LINE_CHANNEL_ID
        })
        
        const state = btoa(JSON.stringify({ 
          userId, 
          timestamp: Date.now(),
          origin: req.headers.get('origin') || 'unknown'
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
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            loginUrl: lineUrl,
            callbackUrl,
            channelId: LINE_CHANNEL_ID
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
        const { code, state } = await req.json()
        
        console.log('토큰 교환 시작:', { code: !!code, state: !!state })
        
        // state 검증
        let stateData
        try {
          stateData = JSON.parse(atob(state))
          console.log('State 데이터:', stateData)
        } catch (e) {
          throw new Error('잘못된 state 파라미터입니다')
        }
        
        // 보안 검증: state의 userId와 현재 인증된 사용자 ID가 일치해야 함
        if (stateData.userId !== user.id) {
          console.error('사용자 ID 불일치:', {
            stateUserId: stateData.userId,
            authUserId: user.id
          })
          throw new Error('사용자 인증 정보가 일치하지 않습니다')
        }
        
        const callbackUrl = getCallbackUrl()
        
        console.log('토큰 교환 요청:', {
          callbackUrl,
          channelId: LINE_CHANNEL_ID,
          hasSecret: !!LINE_CHANNEL_SECRET
        })
        
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
            callbackUrl: callbackUrl
          })
          throw new Error(`토큰 교환 실패: ${tokenResponse.status} - ${errorText}`)
        }
        
        const tokenData: LineTokenResponse = await tokenResponse.json()
        console.log('토큰 교환 성공')
        
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
        
        console.log('LINE 프로필 조회 시작')
        
        const profileResponse = await fetch('https://api.line.me/v2/profile', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })
        
        if (!profileResponse.ok) {
          const errorText = await profileResponse.text()
          console.error('LINE 프로필 조회 실패:', {
            status: profileResponse.status,
            error: errorText
          })
          throw new Error(`프로필 조회 실패: ${profileResponse.status} - ${errorText}`)
        }
        
        const profileData: LineProfileResponse = await profileResponse.json()
        console.log('LINE 프로필 조회 성공:', {
          userId: profileData.userId,
          displayName: profileData.displayName
        })
        
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

      case 'complete-auth': {
        // LINE 인증 완료 처리 (서버에서 안전하게)
        const { code, state } = await req.json()
        
        console.log('LINE 인증 완료 처리 시작')
        
        // 1. 토큰 교환
        const callbackUrl = getCallbackUrl()
        
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
          throw new Error(`토큰 교환 실패: ${tokenResponse.status} - ${errorText}`)
        }
        
        const tokenData: LineTokenResponse = await tokenResponse.json()
        
        // 2. 프로필 조회
        const profileResponse = await fetch('https://api.line.me/v2/profile', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
          }
        })
        
        if (!profileResponse.ok) {
          throw new Error(`프로필 조회 실패: ${profileResponse.status}`)
        }
        
        const profileData: LineProfileResponse = await profileResponse.json()
        
        // 3. 서버에서 안전하게 LINE 계정 정보 저장
        const lineAccountData = {
          user_id: user.id, // 서버에서 인증된 사용자 ID 사용
          line_user_id: profileData.userId,
          line_display_name: profileData.displayName,
          line_picture_url: profileData.pictureUrl || null,
          is_verified: true,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          token_expires_at: tokenData.expires_in ? 
            new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null
        }
        
        console.log('LINE 계정 저장 시도:', {
          userId: user.id,
          lineUserId: profileData.userId,
          displayName: profileData.displayName
        })
        
        const { error: saveError } = await supabase
          .from('user_line_accounts')
          .upsert(lineAccountData, { onConflict: 'user_id' })
        
        if (saveError) {
          console.error('LINE 계정 저장 실패:', saveError)
          throw new Error(`LINE 계정 저장 실패: ${saveError.message}`)
        }
        
        // 4. 인증 상태도 저장
        await supabase
          .from('user_verifications')
          .upsert({
            user_id: user.id,
            verification_type: 'line',
            is_verified: true,
            verified_at: new Date().toISOString(),
            verification_data: {
              line_user_id: profileData.userId,
              display_name: profileData.displayName
            }
          }, { onConflict: 'user_id,verification_type' })
        
        console.log('LINE 연동 완료!')
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'LINE 계정 연동이 완료되었습니다',
            profile: {
              displayName: profileData.displayName,
              pictureUrl: profileData.pictureUrl
            }
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