// src/pages/Signup.jsx
import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Signup() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const redirect = sp.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true); setErr("");
    const { data, error } = await supabase.auth.signUp({ email, password: pwd });
    setLoading(false);
    if (error) return setErr(error.message);
    if (data?.user && !data.session) {
      setOk(true); // email confirmation flow
    } else {
      nav(redirect, { replace: true });
    }
  }

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="text-2xl font-bold mb-4">Sign Up</h1>
      {ok ? (
        <div className="p-3 border rounded">
          Check your email to confirm your account, then return to continue.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <input className="border w-full px-3 py-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="border w-full px-3 py-2" placeholder="Password" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} />
          {err && <div className="text-red-600 text-sm">{err}</div>}
          <button disabled={loading} className="border px-4 py-2">{loading ? "Creating…" : "Create Account"}</button>
        </form>
      )}
      <p className="mt-3 text-sm">
        Already have an account? <Link className="underline" to={`/login?redirect=${encodeURIComponent(redirect)}`}>Log in</Link>
      </p>
    </div>
  );
}
