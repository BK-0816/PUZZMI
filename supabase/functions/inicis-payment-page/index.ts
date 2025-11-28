const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.pathname.split('/').pop();

    if (!token) {
      return new Response('Invalid payment link', { status: 400 });
    }

    // Netlify 호스팅된 결제 페이지로 리다이렉트 (CSP 문제 해결)
    const netlifyUrl = Deno.env.get('NETLIFY_URL') || 'https://your-site.netlify.app';
    const redirectUrl = `${netlifyUrl}/payment_page.html?token=${token}`;

    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
      },
    });
  } catch (error) {
    console.error('Payment page error:', error);
    return new Response('Internal server error', { status: 500 });
  }
});
