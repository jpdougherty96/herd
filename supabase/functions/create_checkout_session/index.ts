import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

// Built-in (provided by Supabase)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Secrets YOU set
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

// Admin client
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Authed client (reads current user from Authorization header)
function userClient(authHeader?: string | null) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader || "" } },
  });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const auth = req.headers.get("Authorization");
    const sbUser = userClient(auth);

    const body = await req.json().catch(() => ({}));
    const {
      booking_id,
      class_id,
      num_attendees,
      attendee_names,
      success_url,
      cancel_url,
    } = body as {
      booking_id?: string;
      class_id?: string;
      num_attendees?: number | string;
      attendee_names?: string | null;
      success_url?: string;
      cancel_url?: string;
    };

    if (!booking_id && !class_id) return json({ error: "Provide booking_id or class_id" }, 400);

    const { data: u } = await sbUser.auth.getUser();
    const userId = u?.user?.id ?? null;

    let bookingId = booking_id ?? null;
    let classId = class_id ?? null;
    let qty = Math.max(1, Number(num_attendees || 1));
    let unitCents = 0;
    let title = "Class booking";

    if (bookingId) {
      const { data: b, error } = await supabaseAdmin
        .from("bookings")
        .select("id, class_id, num_attendees, classes:class_id (title, price_per_person)")
        .eq("id", bookingId)
        .maybeSingle();
      if (error || !b) return json({ error: "Booking not found" }, 404);

      classId = b.class_id;
      const cls: any = Array.isArray((b as any).classes) ? (b as any).classes[0] : (b as any).classes;
      title = cls?.title ?? title;
      unitCents = Math.round(Number(cls?.price_per_person || 0) * 100);
      qty = Math.max(1, Number(b.num_attendees || qty));
    } else {
      if (!userId) return json({ error: "Not authenticated" }, 401);
      if (!classId) return json({ error: "Missing class_id" }, 400);

      const { data: cls, error } = await supabaseAdmin
        .from("classes")
        .select("id, title, price_per_person")
        .eq("id", classId)
        .maybeSingle();
      if (error || !cls) return json({ error: "Class not found" }, 404);

      title = cls.title || title;
      unitCents = Math.round(Number(cls.price_per_person || 0) * 100);

      const totalPrice = (unitCents * qty) / 100;
      const totalAmount = unitCents * qty;

      const { data: ins, error: insErr } = await supabaseAdmin
        .from("bookings")
        .insert({
          class_id: classId,
          user_id: userId,
          status: "approved",
          num_attendees: qty,
          attendee_names: attendee_names || null,
          total_price: totalPrice,
          total_amount: totalAmount,
        })
        .select("id")
        .maybeSingle();

      if (insErr || !ins) return json({ error: "Failed to create booking" }, 400);
      bookingId = ins.id;
    }

    if (!unitCents || unitCents < 1) return json({ error: "Invalid price for class/booking" }, 400);

    // NOTE: keep this matching your frontend route
    const origin = new URL(req.url).origin;
    const okSuccess = success_url ?? `${origin}/class/${classId}?success=1`;
    const okCancel = cancel_url ?? `${origin}/class/${classId}?canceled=1`;

    // Copy metadata to both Session and PaymentIntent + set client_reference_id
    const sharedMeta = {
      booking_id: bookingId ?? "",
      class_id: classId ?? "",
      user_id: userId ?? "",
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: okSuccess,
      cancel_url: okCancel,
      client_reference_id: bookingId ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: title },
            unit_amount: unitCents,
          },
          quantity: qty,
        },
      ],
      metadata: sharedMeta,
      payment_intent_data: { metadata: sharedMeta },
    });

    if (bookingId) {
      await supabaseAdmin.from("bookings").update({ stripe_session_id: session.id }).eq("id", bookingId);
    }

    return json({ url: session.url });
  } catch (e) {
    console.error("create_checkout_session error:", e);
    return json({ error: String(e?.message || e) }, 400);
  }
});
