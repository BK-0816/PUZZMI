import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { paymentId } = await req.json();

    if (typeof paymentId !== "string") {
      return new Response(
        JSON.stringify({ error: "올바르지 않은 요청입니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const portoneApiSecret = Deno.env.get("PORTONE_API_SECRET");
    if (!portoneApiSecret) {
      return new Response(
        JSON.stringify({ error: "PORTONE_API_SECRET not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentResponse = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          "Authorization": `PortOne ${portoneApiSecret}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error("Failed to fetch payment from PortOne API:", errorText);
      return new Response(
        JSON.stringify({ error: "결제 정보를 가져오는데 실패했습니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const actualPayment = await paymentResponse.json();

    if (actualPayment.status !== "PAID") {
      return new Response(
        JSON.stringify({ success: false, status: actualPayment.status, message: "결제가 완료되지 않았습니다." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingPayment } = await supabase
      .from("portone_payments")
      .select("*")
      .eq("imp_uid", paymentId)
      .maybeSingle();

    if (!existingPayment) {
      return new Response(
        JSON.stringify({ error: "결제 정보를 찾을 수 없습니다." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingPayment.amount !== actualPayment.amount?.total) {
      console.error("Amount mismatch:", { expected: existingPayment.amount, actual: actualPayment.amount?.total });
      return new Response(
        JSON.stringify({ error: "결제 금액이 일치하지 않습니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingPayment.status === "paid") {
      return new Response(
        JSON.stringify({ success: true, status: "PAID", message: "이미 처리된 결제입니다." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: updateError } = await supabase
      .from("portone_payments")
      .update({
        status: "paid",
        paid_at: actualPayment.paidAt || new Date().toISOString(),
        pg_tid: actualPayment.transactionId,
        receipt_url: actualPayment.receiptUrl,
        pay_method: actualPayment.method?.type,
        pg_provider: "portone_v2_inicis",
        updated_at: new Date().toISOString(),
      })
      .eq("imp_uid", paymentId);

    if (updateError) {
      console.error("Failed to update payment:", updateError);
      return new Response(
        JSON.stringify({ error: "결제 정보 업데이트에 실패했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingPayment.booking_id) {
      await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          payment_status: "paid",
          payment_method: "portone_v2_inicis",
          payment_id: paymentId
        })
        .eq("id", existingPayment.booking_id);
    }

    return new Response(
      JSON.stringify({ success: true, status: "PAID" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Payment complete error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
