// supabase/functions/host_onboard/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@^15.11.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---- CORS ----
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // or set to your site origin
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY")!;
const SB_URL = Deno.env.get("SB_URL")!;
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://herd.rent";

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
      .select("id,email,stripe_account_id")
      .eq("id", userId)
      .maybeSingle();

    if (perr || !profile) {
      return new Response(JSON.stringify({ error: "profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    let accountId = profile.stripe_account_id as string | null;

    if (!accountId) {
      const acct = await stripe.accounts.create({
        type: "express",
        email: profile.email ?? undefined,
        business_type: "individual",
      });
      accountId = acct.id;
      const { error: uerr } = await admin
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", userId);
      if (uerr) {
        return new Response(JSON.stringify({ error: "failed to save stripe_account_id" }), {
          status: 500,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }
    }

    const refresh_url = `${SITE_URL}/host?onboard=refresh`;
    const return_url = `${SITE_URL}/host?onboard=return`;

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url,
      return_url,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: link.url }), {
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    console.error("host_onboard error", e);
    return new Response(JSON.stringify({ error: "server error" }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
