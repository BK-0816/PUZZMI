import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as PortOne from "jsr:@portone/server-sdk";

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const webhookSecret = Deno.env.get("PORTONE_WEBHOOK_SECRET");
    const bodyText = await req.text();
    let webhookData: any;

    if (webhookSecret) {
      try {
        webhookData = await PortOne.Webhook.verify(webhookSecret, bodyText, req.headers);
      } catch {
        webhookData = JSON.parse(bodyText);
      }
    } else {
      webhookData = JSON.parse(bodyText);
    }

    const { type, data } = webhookData;

    const HANDLED_TYPES = [
      "Transaction.Ready",
      "Transaction.Paid",
      "Transaction.VirtualAccountIssued",
      "Transaction.PartialCancelled",
      "Transaction.Cancelled",
      "Transaction.Failed",
      "Transaction.PayPending",
      "Transaction.CancelPending",
    ];

    if (!HANDLED_TYPES.includes(type)) {
      return new Response(
        JSON.stringify({ message: "Webhook type ignored", type }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentId = data?.paymentId;
    const transactionId = data?.transactionId;

    if (!paymentId) {
      return new Response(
        JSON.stringify({ success: true, message: "Webhook acknowledged, no paymentId" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const portoneApiSecret = Deno.env.get("PORTONE_API_SECRET");
    let paymentData: any = null;

    if (portoneApiSecret) {
      try {
        const res = await fetch(
          `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
          { headers: { "Authorization": `PortOne ${portoneApiSecret}`, "Content-Type": "application/json" } }
        );
        if (res.ok) paymentData = await res.json();
      } catch (e) {
        console.error("Failed to fetch payment from PortOne API:", e);
      }
    }

    const mappedStatus = mapWebhookType(type);

    const updateData: any = {
      status: mappedStatus,
      webhook_verified: true,
      updated_at: new Date().toISOString(),
    };

    if (paymentData) {
      if (paymentData.amount?.total !== undefined) updateData.amount = paymentData.amount.total;
      if (paymentData.currency) updateData.currency = paymentData.currency;
      if (paymentData.method?.type) updateData.pay_method = paymentData.method.type;
      if (paymentData.receiptUrl) updateData.receipt_url = paymentData.receiptUrl;
      updateData.pg_provider = "portone_v2_inicis";
    }

    if (transactionId) updateData.pg_tid = transactionId;

    if (type === "Transaction.Paid") {
      updateData.paid_at = paymentData?.paidAt || new Date().toISOString();
    } else if (type === "Transaction.Failed") {
      updateData.fail_reason = paymentData?.failureReason || "Payment failed";
      updateData.failed_at = new Date().toISOString();
    } else if (type === "Transaction.Cancelled" || type === "Transaction.PartialCancelled") {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { data: payment, error: updateError } = await supabase
      .from("portone_payments")
      .update(updateData)
      .eq("imp_uid", paymentId)
      .select()
      .maybeSingle();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update payment", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payment) {
      return new Response(
        JSON.stringify({ success: true, message: "Payment record not found, webhook acknowledged", paymentId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payment.booking_id) {
      let bookingStatus = "pending";
      let paymentStatus = "pending";

      if (type === "Transaction.Paid") {
        bookingStatus = "confirmed";
        paymentStatus = "paid";
      } else if (type === "Transaction.Failed") {
        bookingStatus = "pending";
        paymentStatus = "failed";
      } else if (type === "Transaction.Cancelled" || type === "Transaction.PartialCancelled") {
        bookingStatus = "canceled";
        paymentStatus = "cancelled";
      }

      await supabase
        .from("bookings")
        .update({
          status: bookingStatus,
          payment_status: paymentStatus,
          payment_method: "portone_v2_inicis",
          payment_id: paymentId
        })
        .eq("id", payment.booking_id);
    }

    return new Response(
      JSON.stringify({ success: true, paymentId, type }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function mapWebhookType(type: string): string {
  const typeMap: { [key: string]: string } = {
    "Transaction.Ready": "ready",
    "Transaction.Paid": "paid",
    "Transaction.VirtualAccountIssued": "ready",
    "Transaction.PartialCancelled": "refunded",
    "Transaction.Cancelled": "cancelled",
    "Transaction.Failed": "failed",
    "Transaction.PayPending": "pending",
    "Transaction.CancelPending": "pending",
  };
  return typeMap[type] || "ready";
}
