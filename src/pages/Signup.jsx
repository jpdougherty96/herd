// src/pages/Signup.jsx
import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function safeRedirectPath(raw) {
  return typeof raw === "string" && raw.startsWith("/") ? raw : "/";
}
function toAbsoluteRedirect(path) {
  // Use current origin (e.g., https://herd.rent) so verification links never point to localhost
  return `${window.location.origin}${path}`;
}

export default function Signup() {
  const [sp] = useSearchParams();
  const nav = useNavigate();

  const redirectPath = safeRedirectPath(sp.get("redirect") || "/");
  const redirectTo = toAbsoluteRedirect(redirectPath);

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pwd,
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (error) return setErr(error.message);

    if (data?.session) {
      // If email confirmations are disabled, you may get an immediate session.
      nav(redirectPath, { replace: true });
    } else {
      // Most setups require email confirmation
      setOk(true);
    }
  }

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="text-2xl font-bold mb-4">Sign Up</h1>
      {ok ? (
        <div className="p-3 border rounded">
          Check your email to confirm your account, then you’ll be returned here.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="border w-full px-3 py-2"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            className="border w-full px-3 py-2"
            placeholder="Password (min 6 chars)"
            type="password"
            value={pwd}
            onChange={(e)=>setPwd(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
          {err && <div className="text-red-600 text-sm">{err}</div>}
          <button disabled={loading} className="border px-4 py-2">
            {loading ? "Creating…" : "Create Account"}
          </button>
        </form>
      )}
      <p className="mt-3 text-sm">
        Already have an account?{" "}
        <Link className="underline" to={`/login?redirect=${encodeURIComponent(redirectPath)}`}>
          Log in
        </Link>
      </p>
    </div>
  );
}
