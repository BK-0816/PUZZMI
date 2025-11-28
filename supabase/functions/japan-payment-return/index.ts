import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const formData = await req.formData();
    const orderId = formData.get("orderId")?.toString() || "";
    const status = formData.get("status")?.toString() || "";
    const amount = formData.get("amount")?.toString() || "";
    const tid = formData.get("tid")?.toString() || "";

    console.log("Payment return received:", { orderId, status, amount, tid });

    const frontendUrl = "https://puzzmi.netlify.app";
    const redirectUrl = `${frontendUrl}/japan_payment_return.html?orderId=${orderId}&status=${status}&amount=${amount}&tid=${tid}`;

    const htmlResponse = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>결제 처리중...</title>
      </head>
      <body>
        <script>
          window.location.href = "${redirectUrl}";
        </script>
        <p>결제 처리중입니다. 잠시만 기다려주세요...</p>
      </body>
      </html>
    `;

    return new Response(htmlResponse, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error processing payment return:", error);

    const errorUrl = "https://puzzmi.netlify.app/japan_payment_return.html?error=처리실패";

    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body>
        <script>
          window.location.href = "${errorUrl}";
        </script>
      </body>
      </html>
    `, {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }
});
