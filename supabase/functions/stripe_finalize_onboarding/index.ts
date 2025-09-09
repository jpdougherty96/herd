// supabase/functions/stripe_finalize_onboarding/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@^15.11.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---- CORS ----
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY")!;
const SB_URL = Deno.env.get("SB_URL")!;
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;

const stripe = new Stripe(STRIPE_SECRET, { httpClient: Stripe.createFetchHttpClient() });
const admin = createClient(SB_URL, SB_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userId = (req.headers.get("x-user-id") || "").trim();
    if (!userId) {
      return new Response(JSON.stringify({ error: "missing x-user-id" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const { data: profile, error: perr } = await admin
      .from("profiles")
      .select("id,stripe_account_id,is_host")
      .eq("id", userId)
      .maybeSingle();

    if (perr || !profile?.stripe_account_id) {
      return new Response(JSON.stringify({ error: "no stripe_account_id on profile" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const acct = await stripe.accounts.retrieve(profile.stripe_account_id);

    const stripe_onboarded = Boolean(acct.details_submitted);
    const stripe_charges_enabled = Boolean((acct as any).charges_enabled);
    const stripe_payouts_enabled = Boolean((acct as any).payouts_enabled);

    const { error: uerr } = await admin
      .from("profiles")
      .update({
        stripe_onboarded,
        stripe_charges_enabled,
        stripe_payouts_enabled,
        is_host: profile.is_host || stripe_onboarded,
      })
      .eq("id", userId);

    if (uerr) {
      return new Response(JSON.stringify({ error: "update failed" }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        flags: { stripe_onboarded, stripe_charges_enabled, stripe_payouts_enabled },
      }),
      { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (e) {
    console.error("finalize_onboarding error", e);
    return new Response(JSON.stringify({ error: "server error" }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
