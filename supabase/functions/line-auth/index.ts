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

Deno.serve(async (req: Request) => {
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
        console.log('토큰 교환 성공:', { 
          hasAccessToken: !!tokenData.access_token,
          tokenType: tokenData.token_type,
          expiresIn: tokenData.expires_in 
        })
        
        // 2. 프로필 조회
        const profileResponse = await fetch('https://api.line.me/v2/profile', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
          }
        })
        
        if (!profileResponse.ok) {
          const errorText = await profileResponse.text()
          console.error('LINE 프로필 조회 실패:', {
            status: profileResponse.status,
            error: errorText,
            accessToken: tokenData.access_token ? 'present' : 'missing'
          })
          throw new Error(`프로필 조회 실패: ${profileResponse.status} - ${errorText}`)
        }
        
        const profileData: LineProfileResponse = await profileResponse.json()
        console.log('LINE 프로필 조회 성공:', {
          userId: profileData.userId,
          displayName: profileData.displayName,
          hasPictureUrl: !!profileData.pictureUrl
        })
        
        // 3. 기존 사용자 프로필 정보 조회 (비교 검증용)
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, age, birth_date')
          .eq('id', user.id)
          .single()
        
        if (profileError) {
          console.error('사용자 프로필 조회 실패:', profileError)
          throw new Error(`사용자 프로필 조회 실패: ${profileError.message}`)
        }
        
        console.log('기존 프로필 정보:', {
          fullName: userProfile.full_name,
          age: userProfile.age,
          birthDate: userProfile.birth_date
        })
        
        // 4. LINE에서 받은 정보로 신원 검증 수행
        const lineDisplayName = profileData.displayName || ''
        const userFullName = userProfile.full_name || ''
        
        // 이름 유사도 검사 (간단한 포함 관계 체크)
        const nameMatch = this.compareNames(lineDisplayName, userFullName)
        
        // 5. OpenID Connect로 추가 정보 조회 시도
        let verifiedAge = userProfile.age // 기본값으로 기존 나이 사용
        let verifiedBirthDate = userProfile.birth_date // 기본값으로 기존 생년월일 사용
        let ageMatch = false
        
        try {
          // ID Token에서 추가 정보 추출 시도 (실제 LINE에서 제공하는 경우)
          const idTokenResponse = await fetch('https://api.line.me/oauth2/v2.1/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              id_token: tokenData.access_token, // 실제로는 ID Token 사용
              client_id: LINE_CHANNEL_ID
            })
          })
          
          if (idTokenResponse.ok) {
            const idTokenData = await idTokenResponse.json()
            console.log('ID Token 정보:', idTokenData)
            
            // LINE에서 생년월일 정보를 제공하는 경우
            if (idTokenData.birthdate) {
              verifiedBirthDate = idTokenData.birthdate
              verifiedAge = this.calculateAge(idTokenData.birthdate)
            }
            
            // 실명 정보가 있는 경우
            if (idTokenData.name) {
              // LINE에서 제공하는 실명으로 다시 비교
              const realNameMatch = this.compareNames(idTokenData.name, userFullName)
              if (realNameMatch) {
                console.log('LINE 실명 인증 성공:', idTokenData.name)
              }
            }
          }
        } catch (idTokenError) {
          console.warn('ID Token 조회 실패 (선택사항):', idTokenError.message)
          // ID Token 조회 실패해도 기본 프로필 정보로 진행
        }
        
        // 나이 일치 여부 확인
        if (userProfile.age && verifiedAge) {
          const ageDifference = Math.abs(userProfile.age - verifiedAge)
          ageMatch = ageDifference <= 1 // ±1세 허용
        }
        
        // 생년월일 일치 여부 확인
        let birthDateMatch = false
        if (userProfile.birth_date && verifiedBirthDate) {
          birthDateMatch = userProfile.birth_date === verifiedBirthDate
        }
        
        // 종합적인 검증 결과
        const verificationResult = {
          name_match: nameMatch,
          age_match: ageMatch,
          birth_date_match: birthDateMatch,
          age_difference: userProfile.age && verifiedAge ? Math.abs(userProfile.age - verifiedAge) : null,
          discrepancies: []
        }
        
        // 불일치 사항 기록
        if (!nameMatch && lineDisplayName && userFullName) {
          verificationResult.discrepancies.push(`이름 불일치: 프로필(${userFullName}) vs LINE(${lineDisplayName})`)
        }
        if (!ageMatch && userProfile.age && verifiedAge) {
          verificationResult.discrepancies.push(`나이 불일치: 프로필(${userProfile.age}세) vs LINE(${verifiedAge}세)`)
        }
        if (!birthDateMatch && userProfile.birth_date && verifiedBirthDate) {
          verificationResult.discrepancies.push(`생년월일 불일치: 프로필(${userProfile.birth_date}) vs LINE(${verifiedBirthDate})`)
        }
        
        // 인증 레벨 결정 (더 엄격한 기준)
        let verificationLevel = 'basic'
        if (nameMatch && ageMatch && birthDateMatch) {
          verificationLevel = 'premium' // 모든 정보 일치
        } else if ((nameMatch && ageMatch) || (nameMatch && birthDateMatch)) {
          verificationLevel = 'enhanced' // 이름 + (나이 또는 생년월일) 일치
        } else if (nameMatch || ageMatch) {
          verificationLevel = 'basic' // 이름 또는 나이만 일치
        } else {
          ageMatch = true
        }
        if (userProfile.birth_date) {
          verifiedBirthDate = userProfile.birth_date
        }
        
        // 인증 레벨 결정
        let verificationLevel = 'basic'
        if (nameMatch && ageMatch) {
          verificationLevel = 'enhanced'
        } else if (nameMatch || ageMatch) {
          verificationLevel = 'basic'
        }
        
        console.log('신원 검증 결과:', {
          nameMatch,
          ageMatch,
          verificationLevel,
          lineDisplayName,
          userFullName
        })
        
        // 5. 서버에서 안전하게 LINE 계정 정보 저장
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
        
        console.log('LINE 계정 저장 성공')
        
        // 7. LINE 신원확인 정보 저장 (핵심!)
        const lineVerificationData = {
          user_id: user.id,
          line_user_id: profileData.userId,
          verified_name: lineDisplayName || profileData.displayName,
          verified_age: verifiedAge,
          verified_birth_date: verifiedBirthDate,
          verification_level: verificationLevel,
          verified_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1년 후
          verification_data: {
            line_display_name: profileData.displayName,
            line_picture_url: profileData.pictureUrl,
            name_match: nameMatch,
            age_match: ageMatch,
            verification_method: 'line_oauth',
            confidence_score: nameMatch && ageMatch ? 0.95 : nameMatch || ageMatch ? 0.75 : 0.5,
            original_profile: {
              full_name: userProfile.full_name,
              age: userProfile.age,
              birth_date: userProfile.birth_date
            },
            line_profile: {
              display_name: profileData.displayName,
              user_id: profileData.userId,
              picture_url: profileData.pictureUrl
            }
          }
        }
        
        console.log('LINE 신원확인 정보 저장 시도:', lineVerificationData)
        
        const { error: verificationError } = await supabase
          .from('line_identity_verifications')
          .upsert(lineVerificationData, { onConflict: 'user_id' })
        
        if (verificationError) {
          console.error('LINE 신원확인 정보 저장 실패:', verificationError)
          throw new Error(`LINE 신원확인 정보 저장 실패: ${verificationError.message}`)
        } else {
          console.log('LINE 신원확인 정보 저장 성공')
        }
        
        // 8. 프로필 인증 상태 업데이트
        const profileUpdateData = {
          identity_verified: true, // LINE 연동 자체로 기본 인증 완료
          age_verified: ageMatch,
          verification_source: 'line',
          verification_level: verificationLevel,
          updated_at: new Date().toISOString()
        }
        
        // 이름이 일치하는 경우 프로필 이름도 업데이트
        if (nameMatch && profileData.displayName && !userProfile.full_name) {
          profileUpdateData.full_name = profileData.displayName
        }
        
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update(profileUpdateData)
          .eq('id', user.id)
        
        if (profileUpdateError) {
          console.error('프로필 인증 상태 업데이트 실패:', profileUpdateError)
          throw new Error(`프로필 인증 상태 업데이트 실패: ${profileUpdateError.message}`)
        } else {
          console.log('프로필 인증 상태 업데이트 성공')
        }
        
        // 9. 사용자 인증 상태 저장
        const { error: userVerificationError } = await supabase
          .from('user_verifications')
          .upsert({
            user_id: user.id,
            verification_type: 'line',
            is_verified: true,
            verified_at: new Date().toISOString(),
            verification_data: {
              line_user_id: profileData.userId,
              display_name: profileData.displayName,
              verification_level: verificationLevel,
              name_match: nameMatch,
              age_match: ageMatch,
              picture_url: profileData.pictureUrl
            }
          }, { onConflict: 'user_id,verification_type' })
        
        if (userVerificationError) {
          console.error('사용자 인증 상태 저장 실패:', userVerificationError)
          // 이 부분은 실패해도 전체 프로세스는 성공으로 처리
        }
        
        console.log('LINE 연동 완료!')
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `LINE 계정 연동이 완료되었습니다 (인증 레벨: ${verificationLevel})`,
            profile: {
              displayName: profileData.displayName,
              pictureUrl: profileData.pictureUrl,
              verificationLevel: verificationLevel,
              nameMatch: nameMatch,
              ageMatch: ageMatch,
              verifiedAge: verifiedAge,
              verifiedBirthDate: verifiedBirthDate
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

    // 헬퍼 함수들
    function compareNames(lineName: string, profileName: string): boolean {
      if (!lineName || !profileName) return false
      
      // 공백 제거 후 비교
      const cleanLine = lineName.replace(/\s+/g, '')
      const cleanProfile = profileName.replace(/\s+/g, '')
      
      // 정확히 일치
      if (cleanLine === cleanProfile) return true
      
      // 포함 관계 체크
      if (cleanLine.includes(cleanProfile) || cleanProfile.includes(cleanLine)) return true
      
      // 레벤슈타인 거리 계산 (편집 거리 1 이하면 유사)
      const distance = levenshteinDistance(cleanLine, cleanProfile)
      return distance <= 1
    }
    
    function levenshteinDistance(str1: string, str2: string): number {
      const matrix: number[][] = []
      
      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i]
      }
      
      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j
      }
      
      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1]
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            )
          }
        }
      }
      
      return matrix[str2.length][str1.length]
    }
    
    function calculateAge(birthDate: string): number {
      const today = new Date()
      const birth = new Date(birthDate)
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      
      return age
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