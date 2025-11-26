import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.pathname.split('/').pop();

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  if (req.method === 'GET') {
    // 토큰으로 요청 확인
    const { data: request, error } = await supabase
      .from('identity_verification_requests')
      .select('*, profiles!inner(full_name)')
      .eq('verification_token', token)
      .maybeSingle();

    if (error || !request) {
      return new Response(getErrorHTML('無効なリンクです'), {
        headers: { 'Content-Type': 'text/html; charset=UTF-8' }
      });
    }

    if (request.status === 'approved') {
      return new Response(getAlreadyApprovedHTML(), {
        headers: { 'Content-Type': 'text/html; charset=UTF-8' }
      });
    }

    return new Response(getUploadHTML(token, request.profiles.full_name), {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=UTF-8' }
    });
  }

  if (req.method === 'POST') {
    try {
      const formData = await req.formData();
      const file = formData.get('passport');
      const uploadToken = formData.get('token');

      if (!file || !(file instanceof File)) {
        throw new Error('ファイルが選択されていません');
      }

      // 요청 확인
      const { data: request } = await supabase
        .from('identity_verification_requests')
        .select('id, user_id')
        .eq('verification_token', uploadToken)
        .single();

      if (!request) {
        throw new Error('無効なリンクです');
      }

      // 파일 업로드
      const fileExt = file.name.split('.').pop();
      const fileName = `${request.user_id}/${Date.now()}.${fileExt}`;

      const supabaseService = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data: uploadData, error: uploadError } = await supabaseService.storage
        .from('passports')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 공개 URL 생성
      const { data: { publicUrl } } = supabaseService.storage
        .from('passports')
        .getPublicUrl(fileName);

      // 요청 상태 업데이트
      await supabase
        .from('identity_verification_requests')
        .update({
          status: 'passport_uploaded',
          passport_image_url: publicUrl
        })
        .eq('id', request.id);

      return new Response(getSuccessHTML(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=UTF-8' }
      });
    } catch (error) {
      console.error('Upload error:', error);
      return new Response(getErrorHTML(error.message), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=UTF-8' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});

function getUploadHTML(token: string, userName: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>パスポートアップロード - PUZZMI</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
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
      max-width: 600px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      text-align: center;
      color: #667eea;
      margin-bottom: 24px;
      font-size: 1.8rem;
    }
    .info-box {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      border-left: 4px solid #667eea;
    }
    .upload-area {
      border: 3px dashed #ddd;
      border-radius: 16px;
      padding: 60px 20px;
      text-align: center;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
      cursor: pointer;
      transition: all 0.3s ease;
      margin: 30px 0;
    }
    .upload-area:hover { border-color: #667eea; }
    .upload-area.drag-over {
      border-color: #667eea;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
    }
    .upload-icon { font-size: 4rem; color: #667eea; margin-bottom: 16px; }
    .preview-image { max-width: 100%; border-radius: 12px; margin-top: 20px; display: none; }
    .btn {
      width: 100%;
      padding: 18px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 1.2rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .btn:hover { transform: translateY(-2px); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .alert { padding: 16px; border-radius: 12px; margin: 16px 0; }
    .alert-info { background: #d1ecf1; color: #0c5460; border-left: 4px solid #17a2b8; }
    .alert-warning { background: #fff3cd; color: #856404; border-left: 4px solid #ffc107; }
  </style>
</head>
<body>
  <div class="container">
    <h1><i class="fas fa-passport"></i> パスポートアップロード</h1>
    
    <div class="info-box">
      <strong>申請者:</strong> ${userName}<br>
      <strong>必要書類:</strong> パスポート写真
    </div>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      パスポートの顔写真ページを明確に撮影してアップロードしてください。
    </div>

    <div class="alert alert-warning">
      <i class="fas fa-exclamation-triangle"></i>
      個人情報が含まれています。安全な場所でアップロードしてください。
    </div>

    <form id="uploadForm" enctype="multipart/form-data">
      <input type="hidden" name="token" value="${token}">
      <div class="upload-area" id="uploadArea">
        <div class="upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
        <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 8px;">クリックまたはドラッグ&ドロップ</div>
        <div style="color: #666; font-size: 0.9rem;">JPG, PNG形式 (最大10MB)</div>
        <input type="file" id="fileInput" name="passport" accept="image/*" style="display: none;" required>
      </div>
      <img id="preview" class="preview-image" />
      <button type="submit" class="btn" id="submitBtn" disabled>
        <i class="fas fa-upload"></i> アップロード
      </button>
    </form>
  </div>

  <script>
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const preview = document.getElementById('preview');
    const submitBtn = document.getElementById('submitBtn');
    const form = document.getElementById('uploadForm');

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelect();
      }
    });

    fileInput.addEventListener('change', handleFileSelect);

    function handleFileSelect() {
      const file = fileInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          preview.src = e.target.result;
          preview.style.display = 'block';
          submitBtn.disabled = false;
        };
        reader.readAsDataURL(file);
      }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> アップロード中...';

      try {
        const formData = new FormData(form);
        const response = await fetch(window.location.href, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const html = await response.text();
          document.body.innerHTML = html;
        } else {
          throw new Error('アップロードに失敗しました');
        }
      } catch (error) {
        alert('エラー: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-upload"></i> アップロード';
      }
    });
  </script>
</body>
</html>`;
}

function getSuccessHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>アップロード完了</title>
  <style>
    body {
      font-family: sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      text-align: center;
      padding: 20px;
    }
    .message {
      background: white;
      padding: 60px 40px;
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
    }
    h1 { color: #28a745; font-size: 2.5rem; margin-bottom: 20px; }
    p { font-size: 1.1rem; color: #666; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="message">
    <h1>✅</h1>
    <h2 style="margin-bottom: 20px;">アップロード完了！</h2>
    <p>パスポート写真が正常にアップロードされました。<br>管理者の確認をお待ちください。<br><br>このウィンドウを閉じてください。</p>
  </div>
</body>
</html>`;
}

function getAlreadyApprovedHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>認証完了</title>
  <style>
    body {
      font-family: sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f8f9fa;
      text-align: center;
      padding: 20px;
    }
    .message {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }
    h1 { color: #28a745; }
  </style>
</head>
<body>
  <div class="message">
    <h1>✅ 認証が完了しています</h1>
    <p>このアカウントは既に認証されています。</p>
  </div>
</body>
</html>`;
}

function getErrorHTML(message: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>エラー</title>
  <style>
    body {
      font-family: sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f8f9fa;
      text-align: center;
      padding: 20px;
    }
    .message {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }
    h1 { color: #dc3545; }
  </style>
</head>
<body>
  <div class="message">
    <h1>❌ エラー</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}