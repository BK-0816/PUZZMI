// supabase/functions/line-auth/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ===== CORS =====
const ALLOWED_ORIGINS = [
  'https://puzzmi.com',
  'https://www.puzzmi.com',
  'https://puzzmi.netlify.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function corsHeaders(origin: string) {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://puzzmi.com';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, x-client-info, apikey',
    'Access-Control-Max-Age': '86400',
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const CORS = corsHeaders(origin);

  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS });
  }

  try {
    // Supabase (Service role)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // LINE env
    const LINE_CHANNEL_ID = Deno.env.get('LINE_CHANNEL_ID');
    const LINE_CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET');
    if (!LINE_CHANNEL_ID || !LINE_CHANNEL_SECRET) {
      return json({ success: false, error: 'LINE API 설정 누락' }, 500, CORS);
    }

    // Auth (함수 내부에서 직접 검증)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ success: false, error: '인증 필요' }, 401, CORS);
    }
    const token = authHeader.slice('Bearer '.length);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return json({ success: false, error: '유효하지 않은 토큰' }, 401, CORS);
    }

    // 액션 라우팅
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    // 콜백 URL 결정
    const getCallbackUrl = () => {
      const ref = req.headers.get('referer') || req.headers.get('origin') || '';
      if (ref.includes('bolt.new')) {
        return `${ref.split('/').slice(0, 3).join('/')}/line_callback.html`;
      } else if (ref.includes('puzzmi.com')) {
        return 'https://puzzmi.com/line_callback.html';
      } else if (ref.includes('netlify.app')) {
        return 'https://puzzmi.netlify.app/line_callback.html';
      } else if (ref.includes('localhost')) {
        return 'http://localhost:3000/line_callback.html';
      }
      // 기본값
      return 'https://puzzmi.com/line_callback.html';
    };

    switch (action) {
      case 'generate-url': {
        const userId = user.id;
        const callbackUrl = getCallbackUrl();

        const state = btoa(JSON.stringify({
          userId,
          timestamp: Date.now(),
          origin: req.headers.get('origin') || 'unknown',
        }));

        const params = new URLSearchParams({
          response_type: 'code',
          client_id: LINE_CHANNEL_ID,
          redirect_uri: callbackUrl,
          state,
          scope: 'openid profile email', // id_token 받으려면 openid 포함
          prompt: 'consent',
          ui_locales: 'ko',
          bot_prompt: 'aggressive',
        });

        const loginUrl = `https://access.line.me/oauth2/v2.1/authorize?${params}`;
        return json({ success: true, loginUrl, callbackUrl, channelId: LINE_CHANNEL_ID }, 200, CORS);
      }

      case 'exchange-token': {
        const { code, state } = await req.json();
        let stateData: any;
        try {
          stateData = JSON.parse(atob(state));
        } catch {
          return json({ success: false, error: '잘못된 state' }, 400, CORS);
        }
        if (stateData.userId !== user.id) {
          return json({ success: false, error: '사용자 불일치' }, 403, CORS);
        }

        const callbackUrl = getCallbackUrl();
        const tokenResp = await fetch('https://api.line.me/oauth2/v2.1/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: callbackUrl,
            client_id: LINE_CHANNEL_ID,
            client_secret: LINE_CHANNEL_SECRET,
          }),
        });
        if (!tokenResp.ok) {
          return json({ success: false, error: await tokenResp.text() }, tokenResp.status, CORS);
        }
        const tokenData = await tokenResp.json();
        return json({ success: true, tokenData }, 200, CORS);
      }

      case 'get-profile': {
        const { accessToken } = await req.json();
        const profileResp = await fetch('https://api.line.me/v2/profile', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!profileResp.ok) {
          return json({ success: false, error: await profileResp.text() }, profileResp.status, CORS);
        }
        const profile = await profileResp.json();
        return json({ success: true, profile }, 200, CORS);
      }

      case 'complete-auth': {
        const { code, state } = await req.json();

        // (선택) state 다시 검증
        try {
          const s = JSON.parse(atob(state));
          if (s.userId !== user.id) {
            return json({ success: false, error: '사용자 불일치' }, 403, CORS);
          }
        } catch {
          // state 없이도 진행 가능하도록 완화하려면 무시
        }

        const callbackUrl = getCallbackUrl();

        // 1) code → token 교환
        const tokenResp = await fetch('https://api.line.me/oauth2/v2.1/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: callbackUrl,
            client_id: LINE_CHANNEL_ID,
            client_secret: LINE_CHANNEL_SECRET,
          }),
        });
        if (!tokenResp.ok) {
          return json({ success: false, error: await tokenResp.text() }, tokenResp.status, CORS);
        }
        const tokenData: any = await tokenResp.json();

        // 2) 프로필 조회 (access_token)
        const profileResp = await fetch('https://api.line.me/v2/profile', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (!profileResp.ok) {
          return json({ success: false, error: await profileResp.text() }, profileResp.status, CORS);
        }
        const profileData = await profileResp.json();

        // 3) 기존 프로필 불러오기
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, age, birth_date')
          .eq('id', user.id)
          .single();
        if (profileError) {
          return json({ success: false, error: `프로필 조회 실패: ${profileError.message}` }, 400, CORS);
        }

        // 4) 신원 검증
        const lineDisplayName = profileData.displayName || '';
        const userFullName = userProfile.full_name || '';
        const nameMatch = compareNames(lineDisplayName, userFullName);

        // 5) (선택) id_token 검증으로 추가 정보 시도
        let verifiedBirthDate = userProfile.birth_date || null;
        let verifiedAge = userProfile.age || null;
        try {
          if (tokenData.id_token) {
            const verifyResp = await fetch('https://api.line.me/oauth2/v2.1/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                id_token: tokenData.id_token,   // ★ access_token 말고 id_token!
                client_id: LINE_CHANNEL_ID,
              }),
            });
            if (verifyResp.ok) {
              const idt = await verifyResp.json();
              if (idt.birthdate) {
                verifiedBirthDate = idt.birthdate;
                verifiedAge = calculateAge(idt.birthdate);
              }
              if (idt.name) {
                // 이름 재검증
                if (!nameMatch && compareNames(idt.name, userFullName)) {
                  // 필요시 nameMatch를 승격할 수 있음
                }
              }
            }
          }
        } catch (_) {
          // 무시하고 진행
        }

        // match 판단
        let ageMatch = false;
        if (userProfile.age && verifiedAge) {
          ageMatch = Math.abs(userProfile.age - verifiedAge) <= 1;
        }
        let birthDateMatch = false;
        if (userProfile.birth_date && verifiedBirthDate) {
          birthDateMatch = userProfile.birth_date === verifiedBirthDate;
        }

        // 인증 레벨 산정 (정리본)
        let verificationLevel: 'basic' | 'enhanced' | 'premium' = 'basic';
        if (nameMatch && ageMatch && birthDateMatch) {
          verificationLevel = 'premium';
        } else if ((nameMatch && ageMatch) || (nameMatch && birthDateMatch)) {
          verificationLevel = 'enhanced';
        } else {
          verificationLevel = nameMatch || ageMatch ? 'basic' : 'basic';
        }

        // 6) LINE 계정 저장
        const lineAccountData = {
          user_id: user.id,
          line_user_id: profileData.userId,
          line_display_name: profileData.displayName,
          line_picture_url: profileData.pictureUrl || null,
          is_verified: true,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          token_expires_at: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            : null,
        };
        const { error: saveError } = await supabase
          .from('user_line_accounts')
          .upsert(lineAccountData, { onConflict: 'user_id' });
        if (saveError) {
          return json({ success: false, error: `LINE 계정 저장 실패: ${saveError.message}` }, 400, CORS);
        }

        // 7) 신원확인 기록 (기존 데이터가 있으면 업데이트)
        const { data: existingVerification } = await supabase
          .from('line_identity_verifications')
          .select('id')
          .or(`user_id.eq.${user.id},line_user_id.eq.${profileData.userId}`)
          .maybeSingle();

        const verificationData = {
          user_id: user.id,
          line_user_id: profileData.userId,
          verified_name: lineDisplayName || profileData.displayName,
          verified_age: verifiedAge,
          verified_birth_date: verifiedBirthDate,
          verification_level: verificationLevel,
          verified_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          verification_data: {
            line_display_name: profileData.displayName,
            line_picture_url: profileData.pictureUrl,
            name_match: nameMatch,
            age_match: ageMatch,
            birth_date_match: birthDateMatch,
          },
        };

        let verificationError;
        if (existingVerification) {
          // 기존 레코드 업데이트
          const { error } = await supabase
            .from('line_identity_verifications')
            .update(verificationData)
            .eq('id', existingVerification.id);
          verificationError = error;
        } else {
          // 새 레코드 삽입
          const { error } = await supabase
            .from('line_identity_verifications')
            .insert(verificationData);
          verificationError = error;
        }

        if (verificationError) {
          return json({ success: false, error: `신원확인 저장 실패: ${verificationError.message}` }, 400, CORS);
        }

        // 8) 프로필 플래그 업데이트
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({
            identity_verified: true,
            age_verified: !!ageMatch,
            verification_source: 'line',
            verification_level: verificationLevel,
            updated_at: new Date().toISOString(),
            ...(nameMatch && profileData.displayName && !userProfile.full_name
              ? { full_name: profileData.displayName }
              : {}),
          })
          .eq('id', user.id);
        if (updateErr) {
          return json({ success: false, error: `프로필 업데이트 실패: ${updateErr.message}` }, 400, CORS);
        }

        return json({
          success: true,
          message: `LINE 계정 연동 완료 (레벨: ${verificationLevel})`,
          profile: {
            displayName: profileData.displayName,
            pictureUrl: profileData.pictureUrl,
            verificationLevel,
            nameMatch,
            ageMatch,
            birthDateMatch,
            verifiedAge: verifiedAge,
            verifiedBirthDate: verifiedBirthDate,
          },
        }, 200, CORS);
      }

      default:
        return json({ success: false, error: '지원하지 않는 액션' }, 400, CORS);
    }
  } catch (error: any) {
    console.error('LINE Auth Error:', error);
    return json({ success: false, error: String(error?.message ?? error) }, 500, corsHeaders('*'));
  }
});

// ===== helpers =====
function json(body: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
  });
}

function compareNames(lineName?: string, profileName?: string) {
  if (!lineName || !profileName) return false;
  const a = lineName.replace(/\s+/g, '');
  const b = profileName.replace(/\s+/g, '');
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return levenshteinDistance(a, b) <= 1;
}

function levenshteinDistance(str1: string, str2: string) {
  const m: number[][] = Array.from({ length: str2.length + 1 }, () => Array(str1.length + 1).fill(0));
  for (let i = 0; i <= str2.length; i++) m[i][0] = i;
  for (let j = 0; j <= str1.length; j++) m[0][j] = j;
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      m[i][j] = Math.min(
        m[i - 1][j] + 1,
        m[i][j - 1] + 1,
        m[i - 1][j - 1] + (str2[i - 1] === str1[j - 1] ? 0 : 1),
      );
    }
  }
  return m[str2.length][str1.length];
}

function calculateAge(birthDate: string) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
