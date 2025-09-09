// src/pages/Login.jsx
import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function safeRedirectPath(raw) {
  // Only allow same-site paths; fall back to home
  return typeof raw === "string" && raw.startsWith("/") ? raw : "/";
}

export default function Login() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const redirectPath = safeRedirectPath(sp.get("redirect") || "/");

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    setLoading(false);
    if (error) return setErr(error.message);
    nav(redirectPath, { replace: true });
  }

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="text-2xl font-bold mb-4">Log In</h1>
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
          placeholder="Password"
          type="password"
          value={pwd}
          onChange={(e)=>setPwd(e.target.value)}
          autoComplete="current-password"
          required
        />
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button disabled={loading} className="border px-4 py-2">
          {loading ? "Signing in…" : "Log In"}
        </button>
      </form>
      <p className="mt-3 text-sm">
        No account?{" "}
        <Link className="underline" to={`/signup?redirect=${encodeURIComponent(redirectPath)}`}>
          Sign up
        </Link>
      </p>
    </div>
  );
}
