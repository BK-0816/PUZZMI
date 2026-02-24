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
      const signature = req.headers.get("webhook-signature");
      if (signature) {
        const hmac = createHmac("sha256", webhookSecret);
        hmac.update(bodyText);
        const expectedSignature = hmac.digest("base64");

        if (signature !== expectedSignature) {
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
    }

    const webhookData = JSON.parse(bodyText);
    console.log("Received PortOne V2 webhook:", JSON.stringify(webhookData, null, 2));

    const { type, data } = webhookData;

    if (type !== "Transaction.StatusChanged") {
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
    const status = data?.status;

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

    console.log(`Processing payment ${paymentId}, status: ${status}`);

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
      status: mapV2Status(status),
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

      if (status === "PAID") {
        updateData.paid_at = paymentData.paidAt || new Date().toISOString();
      } else if (status === "FAILED") {
        updateData.fail_reason = paymentData.failureReason || data?.failureReason || "Payment failed";
        updateData.failed_at = new Date().toISOString();
      } else if (status === "CANCELLED") {
        updateData.cancelled_at = new Date().toISOString();
      }
    } else {
      if (transactionId) {
        updateData.pg_tid = transactionId;
      }

      if (status === "PAID") {
        updateData.paid_at = new Date().toISOString();
      } else if (status === "FAILED") {
        updateData.fail_reason = data?.failureReason || "Payment failed";
        updateData.failed_at = new Date().toISOString();
      } else if (status === "CANCELLED") {
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

      if (status === "PAID") {
        bookingStatus = "confirmed";
        paymentStatus = "paid";
      } else if (status === "FAILED") {
        bookingStatus = "pending";
        paymentStatus = "failed";
      } else if (status === "CANCELLED") {
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
      JSON.stringify({ success: true, payment, paymentId, status }),
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
