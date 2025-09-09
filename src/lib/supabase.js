// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const url  = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Helpful guard so mistakes show up fast in dev
if (!url || !anon) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
    "Check your .env.local and restart the dev server."
  );
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// Optional helper if you sometimes call Edge Functions via fetch
export const FUNCTIONS_BASE =
  import.meta.env.VITE_FUNCTIONS_BASE || `${url}/functions/v1`;

  if (import.meta.env.DEV) {
  console.log("VITE_SUPABASE_URL =", import.meta.env.VITE_SUPABASE_URL);
}