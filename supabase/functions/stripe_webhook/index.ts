// supabase/functions/stripe_webhook/index.ts
// Deno/Edge function

// Import Stripe with the official Deno bundle
import Stripe from "https://esm.sh/stripe@^15.11.0?target=deno";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SB_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;

const stripe = new Stripe(STRIPE_SECRET, { httpClient: Stripe.createFetchHttpClient() });

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

type BookingRow = {
  id: string;
  status: "pending" | "approved" | "approved_paid" | "paid" | "declined";
};

serve(async (req) => {
  try {
    // Read raw body (important for signature verification)
    const payload = await req.text();
    const sig = req.headers.get("stripe-signature") ?? "";

    let event: Stripe.Event;
    try {
      // Async variant fixes SubtleCryptoProvider sync error
      event = await stripe.webhooks.constructEventAsync(
        payload,
        sig,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed.", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
    }

    // Idempotency: skip if we've already processed this event id
    const evtId = event.id;
    const { data: already } = await supabaseAdmin
      .from("stripe_webhook_events")
      .select("id")
      .eq("id", evtId)
      .maybeSingle();
    if (already) {
      return new Response(JSON.stringify({ ok: true, idempotent: true }), { status: 200 });
    }

    // Helper to persist that we’ve handled this event
    async function markProcessed() {
      await supabaseAdmin.from("stripe_webhook_events").insert({ id: evtId });
    }

    // We care about checkout.session.completed and payment_intent.succeeded
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const bookingId = (session.metadata?.booking_id ?? "").trim();
      if (!bookingId) {
        await markProcessed();
        return new Response(JSON.stringify({ ok: true, note: "no booking_id" }), { status: 200 });
      }

      const sessionId = session.id;
      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

      // Fetch current status to determine upgrade path
      const { data: existing, error: selErr } = await supabaseAdmin
        .from("bookings")
        .select("status")
        .eq("id", bookingId)
        .maybeSingle();

      if (selErr) {
        console.error("Select booking error:", selErr);
        await markProcessed();
        return new Response(JSON.stringify({ error: "select failed" }), { status: 500 });
      }

      // Default to 'paid', but upgrade approved -> approved_paid
      const now = new Date().toISOString();
      const nextStatus =
        existing?.status === "approved" ? "approved_paid" : "paid";

      const updatePayload: Record<string, unknown> = {
        status: nextStatus,                // lowercase to match enum
        paid_at: now,
        stripe_session_id: sessionId,
        stripe_payment_intent: paymentIntentId,
      };

      const { error: updErr } = await supabaseAdmin
        .from("bookings")
        .update(updatePayload)
        .eq("id", bookingId);
      if (updErr) {
        console.error("Update booking error:", updErr);
        await markProcessed();
        return new Response(JSON.stringify({ error: "update failed" }), { status: 500 });
      }

      await markProcessed();
      return new Response(JSON.stringify({ ok: true, status: nextStatus }), { status: 200 });
    }

    if (event.type === "payment_intent.succeeded") {
      // Optional: sometimes useful if you allow PI-only flows (not required for Checkout)
      const pi = event.data.object as Stripe.PaymentIntent;
      const bookingId = (pi.metadata?.booking_id ?? "").trim();
      if (!bookingId) {
        await markProcessed();
        return new Response(JSON.stringify({ ok: true, note: "no booking_id on PI" }), { status: 200 });
      }

      const { data: existing } = await supabaseAdmin
        .from("bookings")
        .select("status")
        .eq("id", bookingId)
        .maybeSingle();

      const now = new Date().toISOString();
      const nextStatus =
        existing?.status === "approved" ? "approved_paid" : "paid";

      const { error: updErr } = await supabaseAdmin
        .from("bookings")
        .update({
          status: nextStatus,
          paid_at: now,
          stripe_payment_intent: pi.id,
        })
        .eq("id", bookingId);

      if (updErr) {
        console.error("Update booking via PI error:", updErr);
        await markProcessed();
        return new Response(JSON.stringify({ error: "update failed" }), { status: 500 });
      }

      await markProcessed();
      return new Response(JSON.stringify({ ok: true, status: nextStatus }), { status: 200 });
    }

    // For all other events, just mark processed and return 200
    await markProcessed();
    return new Response(JSON.stringify({ ok: true, ignored: event.type }), { status: 200 });
  } catch (err) {
    console.error("Unhandled webhook error:", err);
    return new Response(JSON.stringify({ error: "server error" }), { status: 500 });
  }
});
