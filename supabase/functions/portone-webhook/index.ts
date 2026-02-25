import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

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

    const webhookSecret = Deno.env.get("PORTONE_WEBHOOK_SECRET");
    const bodyText = await req.text();

    if (webhookSecret) {
      const webhookId = req.headers.get("webhook-id");
      const webhookTimestamp = req.headers.get("webhook-timestamp");
      const webhookSignature = req.headers.get("webhook-signature");

      if (!webhookId || !webhookTimestamp || !webhookSignature) {
        console.error("Missing webhook headers");
        return new Response(
          JSON.stringify({ error: "Missing webhook headers" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const secretBase64 = webhookSecret.startsWith("whsec_")
        ? webhookSecret.slice(6)
        : webhookSecret;
      const secretBytes = Uint8Array.from(atob(secretBase64), (c) => c.charCodeAt(0));

      const signedContent = `${webhookId}.${webhookTimestamp}.${bodyText}`;
      const encoder = new TextEncoder();

      const key = await crypto.subtle.importKey(
        "raw",
        secretBytes,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedContent));
      const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

      const receivedSignatures = webhookSignature
        .split(" ")
        .map((s) => s.split(",")[1])
        .filter(Boolean);

      if (!receivedSignatures.includes(computedSignature)) {
        console.error("Webhook signature verification failed");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      console.log("Webhook signature verified successfully");
    }

    const webhookData = JSON.parse(bodyText);
    console.log("Received PortOne V2 webhook:", JSON.stringify(webhookData, null, 2));

    const { type, data } = webhookData;

    const PAYMENT_TYPES = [
      "Transaction.Ready",
      "Transaction.Paid",
      "Transaction.VirtualAccountIssued",
      "Transaction.PartialCancelled",
      "Transaction.Cancelled",
      "Transaction.Failed",
      "Transaction.PayPending",
      "Transaction.CancelPending",
    ];

    if (!PAYMENT_TYPES.includes(type)) {
      console.log("Ignoring webhook type:", type);
      return new Response(
        JSON.stringify({ message: "Webhook type ignored", type }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const paymentId = data?.paymentId;
    const transactionId = data?.transactionId;

    if (!paymentId) {
      console.error("Missing paymentId in webhook data");
      return new Response(
        JSON.stringify({ error: "Missing paymentId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const mappedStatus = mapWebhookType(type);
    console.log(`Processing payment ${paymentId}, type: ${type}, mappedStatus: ${mappedStatus}`);

    const portoneApiSecret = Deno.env.get("PORTONE_API_SECRET");

    let paymentData = null;
    if (portoneApiSecret) {
      try {
        const paymentResponse = await fetch(
          `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
          {
            headers: {
              "Authorization": `PortOne ${portoneApiSecret}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (paymentResponse.ok) {
          paymentData = await paymentResponse.json();
          console.log("Payment data from API:", JSON.stringify(paymentData, null, 2));
        } else {
          const errorText = await paymentResponse.text();
          console.error("Failed to fetch payment from API:", errorText);
        }
      } catch (error) {
        console.error("Error fetching payment from API:", error);
      }
    } else {
      console.warn("PORTONE_API_SECRET not configured, skipping verification");
    }

    const updateData: any = {
      status: mappedStatus,
      webhook_verified: true,
      updated_at: new Date().toISOString(),
    };

    if (paymentData) {
      if (paymentData.amount?.total !== undefined) {
        updateData.amount = paymentData.amount.total;
      }
      if (paymentData.currency) {
        updateData.currency = paymentData.currency;
      }

      updateData.pg_provider = "portone_v2_inicis";

      if (paymentData.method?.type) {
        updateData.pay_method = paymentData.method.type;
      }

      if (transactionId) {
        updateData.pg_tid = transactionId;
      }

      if (paymentData.receiptUrl) {
        updateData.receipt_url = paymentData.receiptUrl;
      }

      if (type === "Transaction.Paid") {
        updateData.paid_at = paymentData.paidAt || new Date().toISOString();
      } else if (type === "Transaction.Failed") {
        updateData.fail_reason = paymentData.failureReason || "Payment failed";
        updateData.failed_at = new Date().toISOString();
      } else if (type === "Transaction.Cancelled" || type === "Transaction.PartialCancelled") {
        updateData.cancelled_at = new Date().toISOString();
      }
    } else {
      if (transactionId) {
        updateData.pg_tid = transactionId;
      }

      if (type === "Transaction.Paid") {
        updateData.paid_at = new Date().toISOString();
      } else if (type === "Transaction.Failed") {
        updateData.fail_reason = "Payment failed";
        updateData.failed_at = new Date().toISOString();
      } else if (type === "Transaction.Cancelled" || type === "Transaction.PartialCancelled") {
        updateData.cancelled_at = new Date().toISOString();
      }
    }

    console.log("Updating payment with data:", JSON.stringify(updateData, null, 2));

    const { data: payment, error: updateError } = await supabase
      .from("portone_payments")
      .update(updateData)
      .eq("imp_uid", paymentId)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("Failed to update payment:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update payment", details: updateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!payment) {
      console.warn(`Payment not found for paymentId: ${paymentId}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment record not found, webhook acknowledged",
          paymentId
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Payment updated successfully:", payment);

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

      console.log(`Updating booking ${payment.booking_id} to status: ${bookingStatus}, payment_status: ${paymentStatus}`);

      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          status: bookingStatus,
          payment_status: paymentStatus,
          payment_method: "portone_v2_inicis",
          payment_id: paymentId
        })
        .eq("id", payment.booking_id);

      if (bookingError) {
        console.error("Failed to update booking:", bookingError);
      } else {
        console.log("Booking updated successfully");
      }
    }

    return new Response(
      JSON.stringify({ success: true, payment, paymentId, type }),
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
