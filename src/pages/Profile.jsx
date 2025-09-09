// src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

function pickDisplayName(p, user) {
  return (
    p?.full_name?.trim() ||
    p?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "—"
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      setMsg("");

      // Pull only the fields we support now (no username / no avatar)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, name, city, state")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        setMsg(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        // Seed a new profile row if missing
        const seed = {
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.name || null,
          name: user.user_metadata?.name || user.email?.split("@")[0] || null,
        };
        let insErr = null;
        try {
          const { error: e1 } = await supabase.from("profiles").insert(seed);
          insErr = e1;
        } catch (e) {
          insErr = e;
        }
        if (insErr) {
          // Fallback for legacy schema with only 'name'
          const { error: e2 } = await supabase
            .from("profiles")
            .insert({ id: user.id, email: user.email || "", name: seed.name || "" });
          if (e2) {
            console.error(e2);
            setMsg("Couldn't create your profile row.");
          } else {
            setProfile({ id: user.id, email: user.email || "", name: seed.name || "" });
          }
        } else {
          setProfile(seed);
        }
      } else {
        setProfile(data);
      }

      setLoading(false);
    })();
  }, [user]);

  const onSave = async (e) => {
    e.preventDefault();
    if (!profile || !user) return;
    setSaving(true);
    setMsg("");

    // Keep 'name' in sync with 'full_name' for older UIs
    const richUpdate = {
      full_name: profile.full_name ?? null,
      name: profile.full_name?.trim() ? profile.full_name : (profile.name ?? null),
      city: profile.city ?? null,
      state: profile.state ?? null,
    };

    let err = null;
    try {
      const { error } = await supabase.from("profiles").update(richUpdate).eq("id", user.id);
      err = error;
    } catch (e1) {
      err = e1;
    }

    if (err) {
      // Retry with legacy subset (only 'name', city, state)
      const legacy = {
        name: profile.name || profile.full_name || "",
        city: profile.city ?? null,
        state: profile.state ?? null,
      };
      const { error: err2 } = await supabase.from("profiles").update(legacy).eq("id", user.id);
      if (err2) {
        console.error(err2);
        setMsg(err2.message || "Save failed");
        setSaving(false);
        return;
      }
    }

    setMsg("Saved!");
    setEditing(false);
    setSaving(false);
  };

  if (!user) return <div className="max-w-xl mx-auto p-6">Please log in.</div>;
  if (loading) return <div className="max-w-xl mx-auto p-6">Loading…</div>;
  if (!profile) return <div className="max-w-xl mx-auto p-6">No profile found.</div>;

  const displayName = pickDisplayName(profile, user);

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Profile</h1>
        {!editing ? (
          <button className="px-3 py-2 rounded border" onClick={() => setEditing(true)}>
            Edit
          </button>
        ) : (
          <button className="px-3 py-2 rounded border" onClick={() => setEditing(false)}>
            Cancel
          </button>
        )}
      </div>

      {msg && <div className="rounded border p-2 text-sm">{msg}</div>}

      {!editing ? (
        // View mode
        <div className="bg-white rounded-xl p-4 shadow space-y-2">
          <div className="text-sm text-stone-600">Email</div>
          <div className="mb-3">{profile.email || user.email}</div>

          <div className="text-sm text-stone-600">Display name</div>
          <div className="mb-3">{displayName}</div>

          <div className="text-sm text-stone-600">City</div>
          <div className="mb-3">{profile.city || "—"}</div>

          <div className="text-sm text-stone-600">State</div>
          <div className="mb-3">{profile.state || "—"}</div>
        </div>
      ) : (
        // Edit mode
        <form onSubmit={onSave} className="space-y-3 bg-white rounded-xl p-4 shadow">
          <div className="text-sm text-stone-600">Email</div>
          <div className="mb-3">{profile.email || user.email}</div>

          <div>
            <label className="block text-sm mb-1">Full name (shown in messages)</label>
            <input
              className="border rounded p-2 w-full"
              value={profile.full_name ?? profile.name ?? ""}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  full_name: e.target.value,
                  name: e.target.value, // keep legacy 'name' in sync
                }))
              }
              placeholder="e.g., John Dougherty"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">City</label>
              <input
                className="border rounded p-2 w-full"
                value={profile.city ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">State</label>
              <input
                className="border rounded p-2 w-full"
                value={profile.state ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, state: e.target.value }))}
              />
            </div>
          </div>

          <button type="submit" disabled={saving} className="px-4 py-2 rounded border disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      )}
    </div>
  );
}
