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

    // 포트원 V2 웹훅 데이터 파싱
    const webhookData = await req.json();
    console.log("Received V2 webhook:", webhookData);

    // V2 웹훅 페이로드 구조
    const { type, data } = webhookData;

    // 결제 상태 변경 웹훅만 처리
    if (type !== "Transaction.StatusChanged") {
      return new Response(
        JSON.stringify({ message: "Ignored non-payment webhook" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const paymentId = data?.paymentId;
    const transactionId = data?.transactionId;
    const status = data?.status;

    if (!paymentId || !transactionId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 포트원 V2 REST API를 통한 결제 정보 검증
    const portoneApiSecret = Deno.env.get("PORTONE_API_SECRET") || "";

    let paymentData = null;
    if (portoneApiSecret) {
      try {
        const paymentResponse = await fetch(
          `https://api.portone.io/payments/${paymentId}`,
          {
            headers: {
              "Authorization": `PortOne ${portoneApiSecret}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (paymentResponse.ok) {
          paymentData = await paymentResponse.json();
        } else {
          console.error("Failed to fetch payment:", await paymentResponse.text());
        }
      } catch (error) {
        console.error("Error fetching payment:", error);
      }
    }

    // 데이터베이스 업데이트
    const updateData: any = {
      status: mapV2Status(status),
      webhook_verified: true,
      updated_at: new Date().toISOString(),
    };

    // 포트원 API에서 조회한 데이터로 추가 정보 업데이트
    if (paymentData) {
      updateData.amount = paymentData.amount?.total || data.amount;
      updateData.currency = paymentData.currency || data.currency;
      updateData.pg_provider = "portone_v2_inicis";
      updateData.pay_method = paymentData.method?.type || data.method;
      updateData.pg_tid = transactionId;
      updateData.receipt_url = paymentData.receiptUrl;

      if (status === "PAID") {
        updateData.paid_at = paymentData.paidAt || new Date().toISOString();
      } else if (status === "FAILED") {
        updateData.fail_reason = paymentData.failureReason || data.failureReason;
        updateData.failed_at = new Date().toISOString();
      } else if (status === "CANCELLED") {
        updateData.cancelled_at = new Date().toISOString();
      }
    }

    // portone_payments 테이블 업데이트
    const { data: payment, error: updateError } = await supabase
      .from("portone_payments")
      .update(updateData)
      .eq("imp_uid", paymentId)
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

      if (status === "PAID") {
        bookingStatus = "confirmed";
        paymentStatus = "paid";
      } else if (status === "FAILED") {
        bookingStatus = "cancelled";
        paymentStatus = "failed";
      } else if (status === "CANCELLED") {
        bookingStatus = "cancelled";
        paymentStatus = "cancelled";
      }

      await supabase
        .from("bookings")
        .update({
          status: bookingStatus,
          payment_status: paymentStatus,
          payment_method: "portone_v2_inicis",
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

// V2 상태를 내부 상태로 매핑
function mapV2Status(v2Status: string): string {
  const statusMap: { [key: string]: string } = {
    "READY": "ready",
    "PAID": "paid",
    "FAILED": "failed",
    "CANCELLED": "cancelled",
    "PARTIAL_CANCELLED": "refunded",
  };
  return statusMap[v2Status] || "ready";
}
