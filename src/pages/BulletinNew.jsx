// src/pages/BulletinNew.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createListing } from "../lib/bulletinApi";
import { supabase } from "../lib/supabase";
import ImageUploader from "../components/ImageUploader";

const STATES = [
  "", "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM",
  "NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA",
  "WV","WI","WY"
];

export default function BulletinNew() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    title: "",
    body: "",
    category: "Livestock",
    price: "",
    tags: [],
    city: "",
    state: "",
    zip: ""
  });

  const [photos, setPhotos] = useState([]); // [{public_id, secure_url, alt}]
  const [saving, setSaving] = useState(false);
  const [prefillMsg, setPrefillMsg] = useState("");

  // Prefill City/State from the user's profile (editable)
  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const userId = u?.user?.id;
        if (!userId) return;
        const { data, error } = await supabase
          .from("profiles")
          .select("city, state")
          .eq("id", userId)
          .maybeSingle();
        if (!error && data) {
          setForm((f) => ({
            ...f,
            city: f.city || (data.city ?? ""),
            state: f.state || (data.state ?? "")
          }));
          if (data.city || data.state) setPrefillMsg("City/State prefilled from your profile. You can edit below.");
        }
      } catch {
        /* ignore prefill errors */
      }
    })();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      alert("Title and description are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        // normalize empty fields
        price: form.price ? Number(form.price) : null,
        tags: form.tags || [],
        photos: photos.map((p, i) => ({
          public_id: p.public_id,
          secure_url: p.secure_url,
          alt: p.alt || "",
          sort_order: i
        }))
      };
      const id = await createListing(payload);
      // Go to the newly created listing
      nav(`/bulletin/${id}`);
    } catch (err) {
      console.error(err);
      alert(err.message || "Could not create listing.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-bold mb-4">Post a Listing</h1>

      {prefillMsg && (
        <div className="mb-3 p-2 text-sm border rounded bg-amber-50">{prefillMsg}</div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input
            className="border px-3 py-2 w-full"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g., 2-year-old Jersey-bred heifer"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Description</label>
          <textarea
            className="border px-3 py-2 w-full h-40"
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="Details about the animal, parents, health, etc."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Category</label>
            <input
              className="border px-3 py-2 w-full"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Livestock"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Price (optional)</label>
            <input
              type="number"
              className="border px-3 py-2 w-full"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="$500"
              min="0"
              step="1"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm mb-1">City</label>
            <input
              className="border px-3 py-2 w-full"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="e.g., Amarillo"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">State</label>
            <select
              className="border px-3 py-2 w-full"
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            >
              {STATES.map((s) => (
                <option key={s} value={s}>{s || "— Select —"}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">ZIP (optional)</label>
          <input
            className="border px-3 py-2 w-full"
            value={form.zip}
            onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Photos (up to 8)</label>
          <ImageUploader
            maxFiles={8}
            onChange={(files) =>
              setPhotos(
                files.map((f) => ({
                  public_id: f.public_id,
                  secure_url: f.secure_url,
                  alt: f.original_filename || ""
                }))
              )
            }
          />
        </div>

        <button disabled={saving} className="border px-4 py-2">
          {saving ? "Saving…" : "Publish"}
        </button>
      </form>
    </div>
  );
}
