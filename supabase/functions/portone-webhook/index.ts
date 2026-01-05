import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 포트원 웹훅 데이터 파싱
    const webhookData = await req.json();
    console.log("Received webhook:", webhookData);

    const { imp_uid, merchant_uid, status } = webhookData;

    if (!imp_uid || !merchant_uid) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 포트원 REST API를 통한 결제 정보 검증
    // TODO: 실제 환경에서는 포트원 REST API Key를 환경변수로 설정 필요
    const portoneApiKey = Deno.env.get("PORTONE_API_KEY") || "";
    const portoneApiSecret = Deno.env.get("PORTONE_API_SECRET") || "";

    // 포트원 액세스 토큰 발급
    let accessToken = "";
    if (portoneApiKey && portoneApiSecret) {
      const tokenResponse = await fetch("https://api.iamport.kr/users/getToken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imp_key: portoneApiKey,
          imp_secret: portoneApiSecret,
        }),
      });

      const tokenData = await tokenResponse.json();
      if (tokenData.code === 0) {
        accessToken = tokenData.response.access_token;
      } else {
        console.error("Failed to get access token:", tokenData);
      }
    }

    // 포트원에서 결제 정보 조회
    let paymentData = null;
    if (accessToken) {
      const paymentResponse = await fetch(
        `https://api.iamport.kr/payments/${imp_uid}`,
        {
          headers: {
            "Authorization": accessToken,
          },
        }
      );

      const paymentResult = await paymentResponse.json();
      if (paymentResult.code === 0) {
        paymentData = paymentResult.response;
      }
    }

    // 데이터베이스 업데이트
    const updateData: any = {
      status: status,
      webhook_verified: true,
      updated_at: new Date().toISOString(),
    };

    // 포트원 API에서 조회한 데이터로 추가 정보 업데이트
    if (paymentData) {
      updateData.amount = paymentData.amount;
      updateData.pg_provider = paymentData.pg_provider;
      updateData.pay_method = paymentData.pay_method;
      updateData.apply_num = paymentData.apply_num;
      updateData.pg_tid = paymentData.pg_tid;
      updateData.receipt_url = paymentData.receipt_url;

      if (status === "paid") {
        updateData.paid_at = new Date(paymentData.paid_at * 1000).toISOString();
      } else if (status === "failed") {
        updateData.fail_reason = paymentData.fail_reason;
        updateData.failed_at = new Date().toISOString();
      } else if (status === "cancelled") {
        updateData.cancelled_at = new Date().toISOString();
      }
    }

    // portone_payments 테이블 업데이트
    const { data: payment, error: updateError } = await supabase
      .from("portone_payments")
      .update(updateData)
      .eq("imp_uid", imp_uid)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("Failed to update payment:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update payment" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 예약 상태 업데이트
    if (payment && payment.booking_id) {
      let bookingStatus = "pending";
      let paymentStatus = "pending";

      if (status === "paid") {
        bookingStatus = "confirmed";
        paymentStatus = "paid";
      } else if (status === "failed") {
        bookingStatus = "cancelled";
        paymentStatus = "failed";
      } else if (status === "cancelled") {
        bookingStatus = "cancelled";
        paymentStatus = "cancelled";
      }

      await supabase
        .from("bookings")
        .update({
          status: bookingStatus,
          payment_status: paymentStatus,
          payment_method: "portone_inicis",
        })
        .eq("id", payment.booking_id);
    }

    return new Response(
      JSON.stringify({ success: true, payment }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
