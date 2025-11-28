import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PG_IP_PREFIX_1 = "203.238.37";
const PG_IP_PREFIX_2 = "39.115.212";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
    const ipPrefix = clientIP.substring(0, 10);

    if (ipPrefix !== PG_IP_PREFIX_1 && ipPrefix !== PG_IP_PREFIX_2) {
      console.log("Invalid IP:", clientIP);
      return new Response("FAIL", {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    const payload = await req.json();

    console.log("Payment notification received:", JSON.stringify(payload));

    const {
      tid,
      mid,
      applDt,
      applTm,
      status,
      payNm,
      orderId,
      applNo,
      sid,
      convenience,
      confNo,
      receiptNo,
      paymentTerm,
      amount,
      currencyCd,
    } = payload;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: paymentRequest, error: findError } = await supabase
      .from("japan_payment_requests")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (findError || !paymentRequest) {
      console.error("Payment request not found:", orderId);
      return new Response("FAIL", {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    const { error: resultError } = await supabase
      .from("japan_payment_results")
      .insert({
        payment_request_id: paymentRequest.id,
        tid,
        result_code: status,
        error_code: null,
        result_msg: status === "00" ? "Success" : "Failed",
        sid,
        paymethod: convenience || "CARD",
        appl_date: applDt,
        appl_time: applTm,
        appl_no: applNo,
        pay_nm: payNm,
        raw_response: payload,
      });

    if (resultError) {
      console.error("Error saving payment result:", resultError);
      return new Response("FAIL", {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    const newStatus = status === "00" ? "completed" : "failed";
    const { error: updateError } = await supabase
      .from("japan_payment_requests")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", paymentRequest.id);

    if (updateError) {
      console.error("Error updating payment status:", updateError);
    }

    if (paymentRequest.booking_id && newStatus === "completed") {
      await supabase
        .from("bookings")
        .update({ payment_status: "completed" })
        .eq("id", paymentRequest.booking_id);
    }

    console.log("Payment notification processed successfully:", orderId);

    return new Response("OK", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("Error processing payment notification:", error);
    return new Response("FAIL", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }
});